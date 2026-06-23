import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  user_id: string;
  title_id: string | null;
  chapter_id: string | null;
  parent_id: string | null;
  content: string;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string;
  username?: string | null;
  avatar_url?: string | null;
  likes_count?: number;
  user_liked?: boolean;
  replies?: Comment[];
}

export type SortOrder = 'newest' | 'oldest';

export const useComments = (titleId?: string, chapterId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['comments', titleId, chapterId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      } else if (titleId) {
        query = query.eq('title_id', titleId).is('chapter_id', null);
      }

      const { data: commentsData, error } = await query;
      if (error) throw error;

      // Fetch profiles for each comment
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch likes counts
      const commentIds = commentsData.map(c => c.id);
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);

      const likesCountMap = new Map<string, number>();
      likesData?.forEach(like => {
        likesCountMap.set(like.comment_id, (likesCountMap.get(like.comment_id) || 0) + 1);
      });

      // Fetch user's likes
      let userLikesSet = new Set<string>();
      if (user) {
        const { data: userLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        
        userLikesSet = new Set(userLikes?.map(l => l.comment_id) || []);
      }

      const comments = commentsData.map(comment => ({
        ...comment,
        is_spoiler: comment.is_spoiler ?? false,
        parent_id: comment.parent_id ?? null,
        username: profileMap.get(comment.user_id)?.username || null,
        avatar_url: profileMap.get(comment.user_id)?.avatar_url || null,
        likes_count: likesCountMap.get(comment.id) || 0,
        user_liked: userLikesSet.has(comment.id),
      })) as Comment[];

      // Organize into threads (parent comments with replies)
      const parentComments = comments.filter(c => !c.parent_id);
      const repliesMap = new Map<string, Comment[]>();
      
      comments.filter(c => c.parent_id).forEach(reply => {
        const existing = repliesMap.get(reply.parent_id!) || [];
        existing.push(reply);
        repliesMap.set(reply.parent_id!, existing);
      });

      return parentComments.map(parent => ({
        ...parent,
        replies: repliesMap.get(parent.id)?.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ) || [],
      }));
    },
    enabled: !!(titleId || chapterId),
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, titleId, chapterId, isSpoiler, parentId }: { 
      content: string; 
      titleId?: string; 
      chapterId?: string; 
      isSpoiler?: boolean;
      parentId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const trimmedContent = content.trim();
      if (!trimmedContent) throw new Error('Comment cannot be empty');
      if (trimmedContent.length > 2000) throw new Error('Comment must be 2000 characters or less');
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          title_id: titleId || null,
          chapter_id: chapterId || null,
          content: trimmedContent,
          is_spoiler: isSpoiler || false,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', titleId, chapterId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', titleId, chapterId] });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', titleId, chapterId] });
    },
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    addComment: addCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    toggleLike: toggleLikeMutation.mutate,
    isAddingComment: addCommentMutation.isPending,
  };
};
