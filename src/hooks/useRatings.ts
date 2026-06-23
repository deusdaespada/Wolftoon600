import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Rating {
  id: string;
  user_id: string;
  title_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export const useUserRating = (titleId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-rating', titleId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('title_id', titleId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Rating | null;
    },
    enabled: !!titleId && !!user,
  });
};

export const useSubmitRating = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ titleId, rating }: { titleId: string; rating: number }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: existing } = await supabase
        .from('ratings')
        .select('id')
        .eq('title_id', titleId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('ratings')
          .update({ rating })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ratings')
          .insert({
            title_id: titleId,
            user_id: user.id,
            rating,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-rating', variables.titleId] });
      queryClient.invalidateQueries({ queryKey: ['title', variables.titleId] });
      queryClient.invalidateQueries({ queryKey: ['titles'] });
    },
  });
};
