import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserComment {
  id: string;
  content: string;
  is_spoiler: boolean;
  created_at: string;
  title_id: string | null;
  chapter_id: string | null;
  parent_id: string | null;
  // joined
  title_name?: string | null;
  title_cover?: string | null;
  title_slug?: string | null;
  chapter_number?: number | null;
  likes_count: number;
}

export const useUserComments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-comments', user?.id],
    queryFn: async (): Promise<UserComment[]> => {
      if (!user) return [];

      // Fetch user's comments
      const { data: comments, error } = await supabase
        .from('comments')
        .select('id, content, is_spoiler, created_at, title_id, chapter_id, parent_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // Fetch title info
      const titleIds = [...new Set(comments.map(c => c.title_id).filter(Boolean))] as string[];
      const chapterIds = [...new Set(comments.map(c => c.chapter_id).filter(Boolean))] as string[];

      const [titlesRes, chaptersRes, likesRes] = await Promise.all([
        titleIds.length > 0
          ? supabase.from('titles').select('id, title, cover, slug').in('id', titleIds)
          : Promise.resolve({ data: [] }),
        chapterIds.length > 0
          ? supabase.from('chapters').select('id, chapter_number, title_id').in('id', chapterIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('comment_likes')
          .select('comment_id')
          .in('comment_id', comments.map(c => c.id)),
      ]);

      const titlesMap = new Map((titlesRes.data || []).map((t: any) => [t.id, t]));
      const chaptersMap = new Map((chaptersRes.data || []).map((c: any) => [c.id, c]));

      // Count likes per comment
      const likesCount = new Map<string, number>();
      (likesRes.data || []).forEach((l: any) => {
        likesCount.set(l.comment_id, (likesCount.get(l.comment_id) || 0) + 1);
      });

      return comments.map(c => {
        const titleData = c.title_id ? titlesMap.get(c.title_id) : null;
        const chapterData = c.chapter_id ? chaptersMap.get(c.chapter_id) : null;
        // If comment is on chapter, look up title via chapter
        const chapterTitle = chapterData?.title_id ? titlesMap.get(chapterData.title_id) : null;
        const resolvedTitle = titleData || chapterTitle;

        return {
          id: c.id,
          content: c.content,
          is_spoiler: c.is_spoiler,
          created_at: c.created_at,
          title_id: c.title_id,
          chapter_id: c.chapter_id,
          parent_id: c.parent_id,
          title_name: resolvedTitle?.title ?? null,
          title_cover: resolvedTitle?.cover ?? null,
          title_slug: resolvedTitle?.slug ?? null,
          chapter_number: chapterData?.chapter_number ?? null,
          likes_count: likesCount.get(c.id) || 0,
        };
      });
    },
    enabled: !!user,
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user!.id); // RLS safety: only own comments
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-comments', user?.id] });
    },
  });
};
