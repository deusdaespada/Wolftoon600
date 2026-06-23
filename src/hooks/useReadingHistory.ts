import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReadingHistoryItem {
  id: string;
  user_id: string;
  title_id: string;
  chapter_id: string;
  read_at: string;
  title?: {
    title: string;
    cover: string;
    type: string;
  };
  chapter?: {
    chapter_number: number;
    chapter_title: string | null;
  };
}

export const useReadingHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['reading-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reading_history')
        .select(`
          *,
          title:titles(title, cover, type),
          chapter:chapters(chapter_number, chapter_title)
        `)
        .eq('user_id', user.id)
        .order('read_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ReadingHistoryItem[];
    },
    enabled: !!user,
  });

  const addToHistoryMutation = useMutation({
    mutationFn: async ({ 
      titleId, 
      chapterId 
    }: { 
      titleId: string; 
      chapterId: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if entry already exists
      const { data: existing } = await supabase
        .from('reading_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('title_id', titleId)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        const { data, error } = await supabase
          .from('reading_history')
          .update({ read_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new entry
        const { data, error } = await supabase
          .from('reading_history')
          .insert({
            user_id: user.id,
            title_id: titleId,
            chapter_id: chapterId,
          })
          .select()
          .single();

        if (error) throw error;

        // Award XP for new chapter read (5 XP)
        try {
          await supabase.rpc('award_xp' as any, { _user_id: user.id, _amount: 5 });
        } catch {}

        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-history', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-xp', user?.id] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('reading_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-history', user?.id] });
    },
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    addToHistory: addToHistoryMutation.mutate,
    clearHistory: clearHistoryMutation.mutate,
    isClearingHistory: clearHistoryMutation.isPending,
  };
};
