import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReadingStatus = 'reading' | 'completed' | 'planning' | 'dropped' | 'on_hold';

export const STATUS_CONFIG: Record<ReadingStatus, { label: string; color: string }> = {
  reading: { label: 'Lendo', color: 'text-blue-500' },
  completed: { label: 'Completo', color: 'text-green-500' },
  planning: { label: 'Planejando', color: 'text-yellow-500' },
  dropped: { label: 'Dropado', color: 'text-red-500' },
  on_hold: { label: 'Em Pausa', color: 'text-gray-500' },
};

export const useReadingStatus = (titleId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userStatus, isLoading } = useQuery({
    queryKey: ['reading-status', user?.id, titleId],
    queryFn: async () => {
      if (!user?.id || !titleId) return null;
      const { data, error } = await supabase
        .from('user_reading_status')
        .select('*')
        .eq('user_id', user.id)
        .eq('title_id', titleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!titleId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ status }: { status: ReadingStatus }) => {
      if (!user?.id || !titleId) throw new Error('Missing user or title');
      
      if (userStatus) {
        const { error } = await supabase
          .from('user_reading_status')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', userStatus.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_reading_status')
          .insert({ user_id: user.id, title_id: titleId, status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-status', user?.id, titleId] });
      queryClient.invalidateQueries({ queryKey: ['user-reading-status', user?.id] });
    },
  });

  const removeFromList = useMutation({
    mutationFn: async () => {
      if (!user?.id || !titleId) throw new Error('Missing user or title');
      const { error } = await supabase
        .from('user_reading_status')
        .delete()
        .eq('user_id', user.id)
        .eq('title_id', titleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-status', user?.id, titleId] });
      queryClient.invalidateQueries({ queryKey: ['user-reading-status', user?.id] });
    },
  });

  return {
    status: userStatus?.status as ReadingStatus | undefined,
    isLoading,
    updateStatus,
    removeFromList,
    isInList: !!userStatus,
  };
};
