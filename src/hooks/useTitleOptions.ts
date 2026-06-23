import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TitleOption {
  id: string;
  title: string;
  cover: string;
  type: string;
  status: string;
  author: string;
  artist: string | null;
}

const TITLE_OPTION_SELECT = 'id,title,cover,type,status,author,artist';

export const useTitleOptions = () => {
  return useQuery({
    queryKey: ['title-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titles')
        .select(TITLE_OPTION_SELECT)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TitleOption[];
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
};
