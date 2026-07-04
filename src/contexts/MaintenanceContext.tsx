import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceConfig {
  enabled: boolean;
  reason: string;
  activated_at: string | null;
  show_countdown: boolean;
  estimated_return: string | null;
}

interface MaintenanceContextType {
  maintenance: MaintenanceConfig;
  loading: boolean;
  updateMaintenance: (config: Partial<MaintenanceConfig>) => Promise<void>;
}

const defaultConfig: MaintenanceConfig = {
  enabled: false,
  reason: 'Manutenção programada do sistema.',
  activated_at: null,
  show_countdown: false,
  estimated_return: null,
};

const MaintenanceContext = createContext<MaintenanceContextType>({
  maintenance: defaultConfig,
  loading: true,
  updateMaintenance: async () => {},
});

export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['maintenance_enabled', 'maintenance_reason', 'maintenance_activated_at', 'maintenance_show_countdown', 'maintenance_estimated_return']);

      if (data && data.length > 0) {
        const config: MaintenanceConfig = { ...defaultConfig };
        data.forEach((row: { key: string; value: string }) => {
          if (row.key === 'maintenance_enabled') config.enabled = row.value === 'true';
          if (row.key === 'maintenance_reason') config.reason = row.value || defaultConfig.reason;
          if (row.key === 'maintenance_activated_at') config.activated_at = row.value || null;
          if (row.key === 'maintenance_show_countdown') config.show_countdown = row.value === 'true';
          if (row.key === 'maintenance_estimated_return') config.estimated_return = row.value || null;
        });
        setMaintenance(config);
      }
    } catch {
      // silently fail - site continues normally
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // Poll every 30s to pick up changes
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateMaintenance = async (config: Partial<MaintenanceConfig>) => {
    const updated = { ...maintenance, ...config };
    setMaintenance(updated);

    const upserts = [
      { key: 'maintenance_enabled', value: String(updated.enabled) },
      { key: 'maintenance_reason', value: updated.reason },
      { key: 'maintenance_activated_at', value: updated.activated_at || '' },
      { key: 'maintenance_show_countdown', value: String(updated.show_countdown) },
      { key: 'maintenance_estimated_return', value: updated.estimated_return || '' },
    ];

    for (const row of upserts) {
      await supabase
        .from('site_settings')
        .upsert(row, { onConflict: 'key' });
    }
  };

  return (
    <MaintenanceContext.Provider value={{ maintenance, loading, updateMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => useContext(MaintenanceContext);
