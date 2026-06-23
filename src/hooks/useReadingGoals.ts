import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';

interface ReadingGoals {
  id: string;
  user_id: string;
  weekly_goal: number;
  monthly_goal: number;
  created_at: string;
  updated_at: string;
}

export const useReadingGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ['reading-goals', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('reading_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ReadingGoals | null;
    },
    enabled: !!user,
  });

  const progressQuery = useQuery({
    queryKey: ['reading-goals-progress', user?.id],
    queryFn: async () => {
      if (!user) return { weekly: 0, monthly: 0 };
      
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get weekly count
      const { count: weeklyCount } = await supabase
        .from('reading_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('read_at', weekStart.toISOString())
        .lte('read_at', weekEnd.toISOString());

      // Get monthly count
      const { count: monthlyCount } = await supabase
        .from('reading_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('read_at', monthStart.toISOString())
        .lte('read_at', monthEnd.toISOString());

      return {
        weekly: weeklyCount || 0,
        monthly: monthlyCount || 0,
      };
    },
    enabled: !!user,
  });

  const updateGoalsMutation = useMutation({
    mutationFn: async ({ weeklyGoal, monthlyGoal }: { weeklyGoal: number; monthlyGoal: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: existing } = await supabase
        .from('reading_goals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('reading_goals')
          .update({
            weekly_goal: weeklyGoal,
            monthly_goal: monthlyGoal,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('reading_goals')
          .insert({
            user_id: user.id,
            weekly_goal: weeklyGoal,
            monthly_goal: monthlyGoal,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-goals', user?.id] });
    },
  });

  const goals = goalsQuery.data || { weekly_goal: 10, monthly_goal: 50 };
  const progress = progressQuery.data || { weekly: 0, monthly: 0 };

  return {
    goals,
    progress,
    isLoading: goalsQuery.isLoading || progressQuery.isLoading,
    updateGoals: updateGoalsMutation.mutate,
    isUpdating: updateGoalsMutation.isPending,
    weeklyProgress: Math.min((progress.weekly / goals.weekly_goal) * 100, 100),
    monthlyProgress: Math.min((progress.monthly / goals.monthly_goal) * 100, 100),
  };
};
