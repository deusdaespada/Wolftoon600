import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DetailedUserStats {
  chaptersRead: number;
  titlesRead: number;
  favoritesCount: number;
  estimatedReadingTime: number; // em minutos
  favoriteGenres: { genre: string; count: number }[];
  readingStreak: number;
  monthlyActivity: { month: string; count: number }[];
  typeDistribution: { type: string; count: number }[];
}

export const useDetailedUserStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['detailedUserStats', userId],
    queryFn: async (): Promise<DetailedUserStats> => {
      if (!userId) {
        return {
          chaptersRead: 0,
          titlesRead: 0,
          favoritesCount: 0,
          estimatedReadingTime: 0,
          favoriteGenres: [],
          readingStreak: 0,
          monthlyActivity: [],
          typeDistribution: [],
        };
      }

      // Buscar histórico de leitura com detalhes dos títulos
      const [historyResult, favoritesResult, progressResult] = await Promise.all([
        supabase
          .from('reading_history')
          .select(`
            id,
            read_at,
            title:titles(genres, type)
          `)
          .eq('user_id', userId),
        supabase
          .from('favorites')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('reading_progress')
          .select('title_id')
          .eq('user_id', userId),
      ]);

      const history = historyResult.data || [];
      const chaptersRead = history.length;
      
      // Títulos únicos lidos
      const uniqueTitles = new Set(progressResult.data?.map(p => p.title_id) || []);
      const titlesRead = uniqueTitles.size;

      // Favoritos
      const favoritesCount = favoritesResult.count || 0;

      // Tempo estimado de leitura (média de 3 min por capítulo)
      const estimatedReadingTime = chaptersRead * 3;

      // Contagem de gêneros
      const genreCount: Record<string, number> = {};
      const typeCount: Record<string, number> = {};
      
      history.forEach((item: any) => {
        if (item.title?.genres) {
          item.title.genres.forEach((genre: string) => {
            genreCount[genre] = (genreCount[genre] || 0) + 1;
          });
        }
        if (item.title?.type) {
          typeCount[item.title.type] = (typeCount[item.title.type] || 0) + 1;
        }
      });

      const favoriteGenres = Object.entries(genreCount)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const typeDistribution = Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Atividade mensal (últimos 6 meses)
      const monthlyActivity: { month: string; count: number }[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const count = history.filter((item: any) => {
          const readDate = new Date(item.read_at);
          return readDate >= monthStart && readDate <= monthEnd;
        }).length;
        
        monthlyActivity.push({ month: monthName, count });
      }

      // Calcular streak de leitura
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sortedDates = history
        .map((item: any) => {
          const date = new Date(item.read_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort((a, b) => b - a);

      if (sortedDates.length > 0) {
        const lastRead = new Date(sortedDates[0]);
        const diffDays = Math.floor((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          streak = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const current = new Date(sortedDates[i]);
            const prev = new Date(sortedDates[i - 1]);
            const diff = Math.floor((prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diff === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      return {
        chaptersRead,
        titlesRead,
        favoritesCount,
        estimatedReadingTime,
        favoriteGenres,
        readingStreak: streak,
        monthlyActivity,
        typeDistribution,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};
