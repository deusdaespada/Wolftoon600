import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CommentReport {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  comment?: {
    id: string;
    content: string;
    user_id: string;
    username?: string;
  };
  reporter?: {
    username: string | null;
  };
}

export const useReportComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason: string }) => {
      if (!user) throw new Error('Você precisa estar logado para denunciar');
      
      const { error } = await supabase
        .from('comment_reports')
        .insert({
          comment_id: commentId,
          reporter_id: user.id,
          reason: reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-reports'] });
    },
  });
};

export const useCommentReports = () => {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['comment-reports'],
    queryFn: async () => {
      // Get all pending reports
      const { data: reports, error: reportsError } = await supabase
        .from('comment_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Get comment details
      const commentIds = [...new Set(reports.map(r => r.comment_id))];
      const { data: comments } = await supabase
        .from('comments')
        .select('id, content, user_id')
        .in('id', commentIds);

      // Get profile details for comment authors and reporters
      const userIds = [
        ...new Set([
          ...reports.map(r => r.reporter_id),
          ...(comments?.map(c => c.user_id) || [])
        ])
      ];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const commentMap = new Map(comments?.map(c => [c.id, c]) || []);

      return reports.map(report => ({
        ...report,
        status: report.status as 'pending' | 'reviewed' | 'dismissed',
        comment: commentMap.get(report.comment_id) ? {
          ...commentMap.get(report.comment_id)!,
          username: profileMap.get(commentMap.get(report.comment_id)!.user_id)?.username,
        } : undefined,
        reporter: {
          username: profileMap.get(report.reporter_id)?.username || null,
        },
      })) as CommentReport[];
    },
    enabled: isAdmin,
  });
};

export const useResolveReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, status, deleteComment }: { 
      reportId: string; 
      status: 'reviewed' | 'dismissed';
      deleteComment?: boolean;
    }) => {
      if (!user) throw new Error('Não autorizado');

      // Update report status
      const { error: updateError } = await supabase
        .from('comment_reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // If deleting comment, get the comment_id first
      if (deleteComment) {
        const { data: report } = await supabase
          .from('comment_reports')
          .select('comment_id')
          .eq('id', reportId)
          .single();

        if (report) {
          await supabase
            .from('comments')
            .delete()
            .eq('id', report.comment_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-reports'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};
