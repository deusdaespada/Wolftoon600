import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserXP {
  total_xp: number;
  level: number;
  xp_in_level: number;
  xp_needed: number;
}

const xpNeededForLevel = (level: number) => level * 100;

export const useUserXP = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;

  return useQuery({
    queryKey: ['user-xp', targetId],
    queryFn: async (): Promise<UserXP> => {
      if (!targetId) return { total_xp: 0, level: 1, xp_in_level: 0, xp_needed: 100 };
      const { data } = await supabase
        .from('user_xp' as any)
        .select('total_xp, level, xp_in_level')
        .eq('user_id', targetId)
        .maybeSingle();
      const row: any = data || { total_xp: 0, level: 1, xp_in_level: 0 };
      return {
        total_xp: row.total_xp,
        level: row.level,
        xp_in_level: row.xp_in_level,
        xp_needed: xpNeededForLevel(row.level),
      };
    },
    enabled: !!targetId,
  });
};

export const useAwardXP = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('award_xp' as any, {
        _user_id: user.id,
        _amount: amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-xp', user?.id] }),
  });
};

export interface CheckinResult {
  streak: number;
  xp_awarded: number;
  already_checked: boolean;
}

export const useDailyCheckin = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ['daily-checkin', user?.id],
    queryFn: async () => {
      if (!user) return { checkedToday: false, streak: 0, lastDate: null as string | null };
      const { data } = await supabase
        .from('daily_checkins' as any)
        .select('checkin_date, streak')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const today = new Date().toISOString().slice(0, 10);
      const row: any = data;
      return {
        checkedToday: row?.checkin_date === today,
        streak: row?.streak || 0,
        lastDate: row?.checkin_date ?? null,
      };
    },
    enabled: !!user,
  });

  const mutate = useMutation({
    mutationFn: async (): Promise<CheckinResult> => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('daily_checkin' as any, {
        _user_id: user.id,
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      return {
        streak: row?.streak ?? 0,
        xp_awarded: row?.xp_awarded ?? 0,
        already_checked: row?.already_checked ?? false,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-checkin', user?.id] });
      qc.invalidateQueries({ queryKey: ['user-xp', user?.id] });
    },
  });

  return { ...status, checkin: mutate };
};
