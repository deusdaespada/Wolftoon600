import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReadingProgress {
  id: string;
  user_id: string;
  title_id: string;
  chapter_id: string;
  page_number: number;
  completed: boolean;
  last_read_at: string;
  title?: {
    title: string;
    cover: string;
  };
  chapter?: {
    chapter_number: number;
    chapter_title: string | null;
  };
}

export const useReadingProgress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ['reading-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reading_progress')
        .select(`
          *,
          title:titles(title, cover, type),
          chapter:chapters(chapter_number, chapter_title)
        `)
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false });

      if (error) throw error;

      // Fetch total chapter counts for progress %
      const titleIds = [...new Set((data || []).map((p: any) => p.title_id))];
      let totalsMap = new Map<string, number>();
      if (titleIds.length) {
        const { data: chs } = await supabase
          .from('chapters')
          .select('title_id')
          .in('title_id', titleIds);
        chs?.forEach((c: any) => {
          totalsMap.set(c.title_id, (totalsMap.get(c.title_id) || 0) + 1);
        });
      }

      return (data || []).map((p: any) => ({
        ...p,
        title: p.title ? { ...p.title, total_chapters: totalsMap.get(p.title_id) || 0 } : p.title,
      })) as ReadingProgress[];
    },
    enabled: !!user,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ 
      titleId, 
      chapterId, 
      pageNumber = 1, 
      completed = false 
    }: { 
      titleId: string; 
      chapterId: string; 
      pageNumber?: number; 
      completed?: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          title_id: titleId,
          chapter_id: chapterId,
          page_number: pageNumber,
          completed,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,title_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress', user?.id] });
    },
  });

  const getProgressForTitle = (titleId: string) => {
    return progressQuery.data?.find(p => p.title_id === titleId);
  };

  return {
    progress: progressQuery.data || [],
    isLoading: progressQuery.isLoading,
    updateProgress: updateProgressMutation.mutate,
    getProgressForTitle,
  };
};
