import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  total_users: number;
  avg_chapters_per_user: number;
  avg_reading_time_hours: number;
  top_genre: string | null;
}

export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total chapters read
      const { count: totalChaptersRead } = await supabase
        .from('reading_history')
        .select('*', { count: 'exact', head: true });

      // Calculate averages
      const avgChaptersPerUser = totalUsers ? (totalChaptersRead || 0) / totalUsers : 0;
      
      // Estimate reading time (3 minutes per chapter average)
      const avgReadingTimeHours = avgChaptersPerUser * 3 / 60;

      // Get most common genre from reading history
      const { data: topGenreData } = await supabase
        .from('reading_history')
        .select('title:titles(genres)')
        .limit(1000);

      const genreCounts: Record<string, number> = {};
      topGenreData?.forEach((item: any) => {
        const genres = item.title?.genres || [];
        genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });

      const topGenre = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        total_users: totalUsers || 0,
        avg_chapters_per_user: Math.round(avgChaptersPerUser * 10) / 10,
        avg_reading_time_hours: Math.round(avgReadingTimeHours * 10) / 10,
        top_genre: topGenre,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
