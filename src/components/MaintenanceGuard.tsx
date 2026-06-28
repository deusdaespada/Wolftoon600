import { ReactNode } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import MaintenancePage from '@/pages/Maintenance';

const MaintenanceGuard = ({ children }: { children: ReactNode }) => {
  const { maintenance, loading } = useMaintenance();
  const { isAdmin, loading: authLoading } = useAuth();

  // Don't block while loading
  if (loading || authLoading) return <>{children}</>;

  // Admins bypass maintenance
  if (maintenance.enabled && !isAdmin) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
