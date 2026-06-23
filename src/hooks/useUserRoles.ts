import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithRole {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  roles: string[];
  created_at: string;
  vip_expires_at?: string | null;
}

export const useAllUsers = () => {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles with expiration
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Map roles to users with expiration info
      const rolesByUser = new Map<string, { roles: string[]; vip_expires_at?: string | null }>();
      roles.forEach(role => {
        const existing = rolesByUser.get(role.user_id) || { roles: [], vip_expires_at: null };
        existing.roles.push(role.role);
        if (role.role === 'vip' && role.expires_at) {
          existing.vip_expires_at = role.expires_at;
        }
        rolesByUser.set(role.user_id, existing);
      });

      return profiles.map(profile => {
        const userRoles = rolesByUser.get(profile.id) || { roles: ['user'], vip_expires_at: null };
        return {
          id: profile.id,
          email: '',
          username: profile.username,
          avatar_url: profile.avatar_url,
          roles: userRoles.roles,
          created_at: profile.created_at,
          vip_expires_at: userRoles.vip_expires_at
        };
      }) as UserWithRole[];
    },
    enabled: isAdmin
  });
};

export const useAddVipRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, expiresAt }: { userId: string; expiresAt?: Date | null }) => {
      // Check if user already has VIP role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'vip')
        .maybeSingle();

      if (existing) {
        throw new Error('Usuário já é VIP');
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: 'vip',
          expires_at: expiresAt?.toISOString() || null
        });

      if (error) throw error;

      // Record history
      await supabase.from('vip_history').insert({
        user_id: userId,
        action: 'added',
        performed_by: user?.id,
        expires_at: expiresAt?.toISOString() || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['vip-history'] });
    }
  });
};

export const useRenewVipRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, expiresAt }: { userId: string; expiresAt: Date }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ expires_at: expiresAt.toISOString() })
        .eq('user_id', userId)
        .eq('role', 'vip');

      if (error) throw error;

      // Record history
      await supabase.from('vip_history').insert({
        user_id: userId,
        action: 'renewed',
        performed_by: user?.id,
        expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['vip-history'] });
    }
  });
};

export const useRemoveVipRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'vip');

      if (error) throw error;

      // Record history
      await supabase.from('vip_history').insert({
        user_id: userId,
        action: 'removed',
        performed_by: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['vip-history'] });
    }
  });
};

export const useVipHistory = () => {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['vip-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });
};

export const useVipStats = () => {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['vip-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_history')
        .select('action, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyStats = new Map<string, { added: number; removed: number }>();
      
      data.forEach(entry => {
        const date = new Date(entry.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const current = monthlyStats.get(monthKey) || { added: 0, removed: 0 };
        if (entry.action === 'added') {
          current.added++;
        } else {
          current.removed++;
        }
        monthlyStats.set(monthKey, current);
      });

      return Array.from(monthlyStats.entries()).map(([month, stats]) => ({
        month,
        added: stats.added,
        removed: stats.removed,
        net: stats.added - stats.removed
      }));
    },
    enabled: isAdmin
  });
};

export const useSyncMissingProfiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all-users'] });
    }
  });
};
