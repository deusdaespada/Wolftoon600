import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useReadingHistory } from './useReadingHistory';

interface Title {
  id: string;
  title: string;
  cover: string;
  type: string;
  genres: string[];
  rating: number;
  views: number;
  status: string;
  year: number;
  author: string;
  synopsis: string;
  slug: string | null;
}

export const useRecommendations = (limit: number = 6) => {
  const { user } = useAuth();
  const { history } = useReadingHistory();

  return useQuery({
    queryKey: ['recommendations', user?.id, history.length],
    queryFn: async () => {
      // Get genres from reading history
      const readTitleIds = [...new Set(history.map(h => h.title_id))];
      
      if (readTitleIds.length === 0) {
        // No history - return popular titles
        const { data, error } = await supabase
          .from('titles')
          .select('*')
          .order('views', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data as Title[];
      }

      // Get titles from history to extract genres
      const { data: readTitles, error: titlesError } = await supabase
        .from('titles')
        .select('genres')
        .in('id', readTitleIds);

      if (titlesError) throw titlesError;

      // Count genre frequency
      const genreCount: Record<string, number> = {};
      readTitles?.forEach(t => {
        t.genres?.forEach((genre: string) => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });

      // Get top genres
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      if (topGenres.length === 0) {
        const { data, error } = await supabase
          .from('titles')
          .select('*')
          .not('id', 'in', `(${readTitleIds.join(',')})`)
          .order('views', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data as Title[];
      }

      // Find titles with matching genres that user hasn't read
      const { data: allTitles, error: allError } = await supabase
        .from('titles')
        .select('*')
        .not('id', 'in', `(${readTitleIds.join(',')})`)
        .order('rating', { ascending: false });

      if (allError) throw allError;

      // Score and sort by genre match
      const scored = (allTitles as Title[]).map(title => {
        let score = 0;
        title.genres?.forEach(genre => {
          if (topGenres.includes(genre)) {
            score += genreCount[genre] || 1;
          }
        });
        return { ...title, score };
      });

      const sorted = scored
        .filter(t => t.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // If not enough recommendations, add popular ones
      if (sorted.length < limit) {
        const remaining = (allTitles as Title[])
          .filter(t => !sorted.find(s => s.id === t.id))
          .slice(0, limit - sorted.length);
        return [...sorted, ...remaining];
      }

      return sorted;
    },
    enabled: true,
  });
};
