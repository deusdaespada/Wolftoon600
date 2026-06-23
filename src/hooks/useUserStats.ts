import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  favoritesCount: number;
  readCount: number;
}

export const useUserStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: async (): Promise<UserStats> => {
      if (!userId) return { favoritesCount: 0, readCount: 0 };

      const [favoritesResult, readingResult] = await Promise.all([
        supabase
          .from('favorites')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('reading_history')
          .select('title_id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      return {
        favoritesCount: favoritesResult.count || 0,
        readCount: readingResult.count || 0,
      };
    },
    enabled: !!userId,
  });
};
