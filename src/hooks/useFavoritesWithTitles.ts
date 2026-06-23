import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FavoriteWithTitle {
  id: string;
  title_id: string;
  title: {
    title: string;
    cover: string;
    type: string;
    rating: number | null;
    views: number | null;
    status: string;
    genres: string[];
    slug: string | null;
  } | null;
}

export const useFavoritesWithTitles = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites-with-titles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          title_id,
          title:titles(title, cover, type, rating, views, status, genres, slug)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as FavoriteWithTitle[];
    },
    enabled: !!user,
  });
};
