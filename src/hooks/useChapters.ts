import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Chapter {
  id: string;
  title_id: string;
  chapter_number: number;
  chapter_title: string | null;
  images?: string[];
  content_type?: 'images' | 'novel';
  content?: string | null;
  is_vip?: boolean;
  vip_unlock_at?: string | null;
  created_at: string;
  updated_at: string;
}

const CHAPTER_LIST_SELECT = 'id,title_id,chapter_number,chapter_title,is_vip,vip_unlock_at,created_at,updated_at';
const CHAPTER_DETAIL_SELECT = 'id,title_id,chapter_number,chapter_title,images,content_type,content,is_vip,vip_unlock_at,created_at,updated_at';

export const useUpdateChapterVip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, isVip }: { chapterId: string; isVip: boolean }) => {
      const { error } = await supabase.from('chapters').update({ is_vip: isVip }).eq('id', chapterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
};

export const useChapters = (titleId: string) => {
  return useQuery({
    queryKey: ['chapters', titleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select(CHAPTER_LIST_SELECT)
        .eq('title_id', titleId)
        .order('chapter_number', { ascending: false });

      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!titleId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
};

export const useChapter = (titleId: string, chapterNumber: number) => {
  return useQuery({
    queryKey: ['chapter', titleId, chapterNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select(CHAPTER_DETAIL_SELECT)
        .eq('title_id', titleId)
        .eq('chapter_number', chapterNumber)
        .maybeSingle();

      if (error) throw error;
      return data as Chapter | null;
    },
    enabled: !!titleId && chapterNumber !== undefined && chapterNumber !== null,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};

async function notifyNewChapter(titleId: string, chapterNumber: number) {
  try {
    const { data: title } = await supabase.from('titles').select('title').eq('id', titleId).single();
    if (!title) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-new-chapter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title_id: titleId,
        chapter_number: chapterNumber,
        title_name: title.title,
      }),
    });
  } catch (error) {
    console.error('Error notifying users about new chapter:', error);
  }
}

export const useCreateChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapter: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('chapters').insert(chapter).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapters', data.title_id] });
      queryClient.invalidateQueries({ queryKey: ['recent-chapters'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-recent-chapters'] });
      await notifyNewChapter(data.title_id, data.chapter_number);
    },
  });
};

export const useDeleteChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, titleId }: { id: string; titleId: string }) => {
      const { error } = await supabase.from('chapters').delete().eq('id', id);
      if (error) throw error;
      return titleId;
    },
    onSuccess: (titleId) => {
      queryClient.invalidateQueries({ queryKey: ['chapters', titleId] });
      queryClient.invalidateQueries({ queryKey: ['recent-chapters'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-recent-chapters'] });
    },
  });
};
