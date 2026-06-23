import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecentChapter {
  id: string;
  title_id: string;
  chapter_number: number;
  chapter_title: string | null;
  created_at: string;
  title: {
    id: string;
    title: string;
    cover: string;
    type: string;
  };
}

export const useRecentChapters = (limit = 12) => {
  return useQuery({
    queryKey: ['recent-chapters', limit],
    queryFn: async () => {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('id, title_id, chapter_number, chapter_title, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!chapters?.length) return [];

      const titleIds = [...new Set(chapters.map((chapter) => chapter.title_id))];
      const { data: titles, error: titlesError } = await supabase
        .from('titles')
        .select('id, title, cover, type')
        .in('id', titleIds);

      if (titlesError) throw titlesError;

      const titlesMap = new Map(titles?.map((title) => [title.id, title]) || []);

      return chapters
        .map((chapter) => ({
          ...chapter,
          title: titlesMap.get(chapter.title_id)!,
        }))
        .filter((chapter) => chapter.title) as RecentChapter[];
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
};
