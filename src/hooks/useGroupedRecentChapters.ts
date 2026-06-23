import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface ChapterInfo {
  id: string;
  chapter_number: number;
  chapter_title: string | null;
  created_at: string;
  is_vip?: boolean;
}

interface TitleWithChapters {
  id: string;
  title: string;
  cover: string;
  type: string;
  rating?: number;
  status?: string;
  chapters: ChapterInfo[];
  totalChapters: number;
  latestUpdate: string;
  newChaptersCount: number;
}

const CHAPTERS_CACHE_KEY = 'wolftoon_recent_chapters_cache';
const CACHE_TTL = 1000 * 60 * 10;

const getCachedChapters = (limit: number): TitleWithChapters[] | null => {
  try {
    const cached = localStorage.getItem(`${CHAPTERS_CACHE_KEY}_${limit}`);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CHAPTERS_CACHE_KEY}_${limit}`);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedChapters = (data: TitleWithChapters[], limit: number) => {
  try {
    localStorage.setItem(
      `${CHAPTERS_CACHE_KEY}_${limit}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore cache write errors
  }
};

export const useGroupedRecentChapters = (limit = 10) => {
  const query = useQuery({
    queryKey: ['grouped-recent-chapters', limit],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('id, title_id, chapter_number, chapter_title, created_at, is_vip')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!chapters?.length) return [];

      const titleIds = [...new Set(chapters.map((chapter) => chapter.title_id))];

      const { data: titles, error: titlesError } = await supabase
        .from('titles')
        .select('id, title, cover, type, rating, status')
        .in('id', titleIds);

      if (titlesError) throw titlesError;

      const titlesMap = new Map(titles?.map((title) => [title.id, title]) || []);
      const groupedMap = new Map<string, ChapterInfo[]>();

      chapters.forEach((chapter) => {
        if (!groupedMap.has(chapter.title_id)) {
          groupedMap.set(chapter.title_id, []);
        }

        groupedMap.get(chapter.title_id)?.push({
          id: chapter.id,
          chapter_number: chapter.chapter_number,
          chapter_title: chapter.chapter_title,
          created_at: chapter.created_at,
          is_vip: chapter.is_vip,
        });
      });

      const result: TitleWithChapters[] = [];

      for (const [titleId, titleChapters] of groupedMap) {
        const title = titlesMap.get(titleId);
        if (!title) continue;

        const sortedChapters = [...titleChapters].sort((a, b) => b.chapter_number - a.chapter_number);
        const newChaptersCount = sortedChapters.filter((chapter) => new Date(chapter.created_at) > sevenDaysAgo).length;

        result.push({
          id: title.id,
          title: title.title,
          cover: title.cover,
          type: title.type,
          rating: (title as any).rating ?? 0,
          status: (title as any).status,
          chapters: sortedChapters.slice(0, 3),
          totalChapters: sortedChapters.length,
          latestUpdate: sortedChapters[0]?.created_at || '',
          newChaptersCount: Math.max(1, newChaptersCount),
        });
      }

      return result
        .sort((left, right) => new Date(right.latestUpdate).getTime() - new Date(left.latestUpdate).getTime())
        .slice(0, limit);
    },
    initialData: getCachedChapters(limit) ?? undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data && !query.isStale) {
      setCachedChapters(query.data, limit);
    }
  }, [query.data, query.isStale, limit]);

  return query;
};
