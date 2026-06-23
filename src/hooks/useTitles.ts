import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useEffect } from 'react';

import type { TitleStatus } from '@/lib/titleFormOptions';

export interface Title {
  id: string;
  title: string;
  alternative_titles?: string[] | null;
  artist?: string | null;
  cover: string;
  type: 'Manhwa' | 'Manhua' | 'Mangá' | 'Novel' | 'Webtoon' | 'HQ' | 'Doujinshi' | 'One-shot' | 'Light Novel' | 'Web Novel' | 'Fanfic';
  rating: number;
  status: TitleStatus;
  genres: string[];
  synopsis?: string;
  author: string;
  year: number;
  views: number;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

const TITLES_CACHE_KEY = 'wolftoon_titles_cache';
const CACHE_TTL = 1000 * 60 * 15;
const TITLE_LIST_SELECT = 'id,title,alternative_titles,artist,cover,type,rating,status,genres,author,year,views,slug,created_at,updated_at';
const TITLE_DETAIL_SELECT = 'id,title,alternative_titles,artist,cover,type,rating,status,genres,synopsis,author,year,views,slug,created_at,updated_at';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getCachedTitles = (): Title[] | null => {
  try {
    const cached = localStorage.getItem(TITLES_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(TITLES_CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedTitles = (data: Title[]) => {
  try {
    localStorage.setItem(
      TITLES_CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Storage full
  }
};

export const useTitles = () => {
  const query = useQuery({
    queryKey: ['titles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titles')
        .select(TITLE_LIST_SELECT)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((title) => ({
        ...title,
        rating: title.rating ?? 0,
        views: title.views ?? 0,
      })) as Title[];
    },
    initialData: getCachedTitles() ?? undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data && !query.isStale) {
      setCachedTitles(query.data);
    }
  }, [query.data, query.isStale]);

  return query;
};

export const useTitle = (idOrSlug: string) => {
  return useQuery({
    queryKey: ['title', idOrSlug],
    queryFn: async () => {
      const isUuid = UUID_PATTERN.test(idOrSlug);

      if (isUuid) {
        const { data, error } = await supabase.from('titles').select(TITLE_DETAIL_SELECT).eq('id', idOrSlug).single();
        if (error) throw error;
        return { ...data, rating: data.rating ?? 0, views: data.views ?? 0 } as Title;
      }

      let { data, error } = await supabase.from('titles').select(TITLE_DETAIL_SELECT).eq('slug', idOrSlug).maybeSingle();

      if (!data) {
        const result = await supabase.from('titles').select(TITLE_DETAIL_SELECT).eq('id', idOrSlug).single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return { ...data, rating: data.rating ?? 0, views: data.views ?? 0 } as Title;
    },
    enabled: !!idOrSlug,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useCreateTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: TablesInsert<'titles'>) => {
      const { data, error } = await supabase.from('titles').insert(title).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      queryClient.invalidateQueries({ queryKey: ['title-options'] });
    },
  });
};

export const useUpdateTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'titles'> & { id: string }) => {
      const { data, error } = await supabase.from('titles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      queryClient.invalidateQueries({ queryKey: ['title'] });
      queryClient.invalidateQueries({ queryKey: ['title-options'] });
    },
  });
};

export const useDeleteTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('titles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      queryClient.invalidateQueries({ queryKey: ['title'] });
      queryClient.invalidateQueries({ queryKey: ['title-options'] });
    },
  });
};
