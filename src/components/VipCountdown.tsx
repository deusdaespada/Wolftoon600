import { useEffect, useState } from 'react';
import { Crown, Lock } from 'lucide-react';

interface Props {
  unlockAt: string;
  variant?: 'badge' | 'block';
  className?: string;
}

const formatRemaining = (ms: number) => {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const VipCountdown = ({ unlockAt, variant = 'badge', className = '' }: Props) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(unlockAt).getTime();
  const remaining = target - now;
  const text = formatRemaining(remaining);

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-1.5 py-0 text-[10px] font-bold tabular-nums ${className}`}>
        <Crown className="h-2.5 w-2.5" />
        {text ? `Libera em ${text}` : 'VIP'}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-yellow-400 ${className}`}>
      <Lock className="h-4 w-4" />
      <span className="font-bold tabular-nums">
        {text ? `Liberação automática em ${text}` : 'Liberando...'}
      </span>
    </div>
  );
};

export default VipCountdown;
