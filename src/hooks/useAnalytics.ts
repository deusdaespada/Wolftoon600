import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  date: string;
  visits: number;
}

export const useAnalytics = (period: 'day' | 'month' | 'year') => {
  return useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      let dateFormat = '%Y-%m-%d';
      let dateTrunc = 'day';
      
      if (period === 'month') {
        dateFormat = '%Y-%m';
        dateTrunc = 'month';
      } else if (period === 'year') {
        dateFormat = '%Y';
        dateTrunc = 'year';
      }

      const { data, error } = await supabase
        .from('visitor_analytics')
        .select('visited_at');
      
      if (error) throw error;

      // Group by date on client side
      const grouped = data.reduce((acc: Record<string, number>, item) => {
        const date = new Date(item.visited_at);
        let key = '';
        
        if (period === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (period === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          key = String(date.getFullYear());
        }
        
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([date, visits]) => ({ date, visits }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });
};
