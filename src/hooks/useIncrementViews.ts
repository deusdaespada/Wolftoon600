import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useIncrementViews = (titleId: string | undefined) => {
  useEffect(() => {
    if (!titleId) return;

    const incrementViews = async () => {
      // Increment views by 1 using the database function
      const { error } = await supabase
        .rpc('increment_title_views' as any, {
          title_id: titleId
        });

      if (error) {
        console.error('Error incrementing views:', error);
      }
    };

    incrementViews();
  }, [titleId]);
};
