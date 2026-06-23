import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFavorites = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select('title_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(f => f.title_id);
    },
    enabled: !!user,
  });
};

export const useIsFavorite = (titleId: string) => {
  const { data: favorites } = useFavorites();
  return favorites?.includes(titleId) ?? false;
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ titleId, isFavorite }: { titleId: string; isFavorite: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');

      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('title_id', titleId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, title_id: titleId });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
};
