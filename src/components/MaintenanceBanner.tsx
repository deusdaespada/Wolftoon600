import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Power, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MaintenanceBanner = () => {
  const { maintenance, updateMaintenance } = useMaintenance();
  const { isAdmin } = useAuth();

  if (!maintenance.enabled || !isAdmin) return null;

  const handleDeactivate = async () => {
    await updateMaintenance({ enabled: false, activated_at: null });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 bg-red-600 px-4 py-2 shadow-lg shadow-red-900/40">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-white shrink-0 animate-pulse" />
        <span className="text-white text-xs font-bold uppercase tracking-widest truncate">
          🚨 Modo Manutenção Ativo — Os usuários não conseguem acessar o site
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-white/40 bg-white/10 text-white hover:bg-white hover:text-red-600 text-xs font-bold h-7 px-3"
        onClick={handleDeactivate}
      >
        <Power className="w-3 h-3 mr-1" />
        Desativar
      </Button>
    </div>
  );
};

export default MaintenanceBanner;
