import { UserXP } from '@/hooks/useGamification';
import { cn } from '@/lib/utils';

interface XPBarProps {
  xp: UserXP | undefined;
  className?: string;
  showLabel?: boolean;
}

export default function XPBar({ xp, className, showLabel = true }: XPBarProps) {
  const current = xp?.xp_in_level ?? 0;
  const needed = xp?.xp_needed ?? 100;
  const percent = Math.min(100, Math.round((current / needed) * 100));

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium">Nível {xp?.level ?? 1}</span>
          <span>
            <span className="text-primary font-semibold">{current}</span> / {needed} XP
          </span>
        </div>
      )}
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-card/80 border border-border/40">
        <div
          className="h-full bg-gradient-to-r from-primary via-blue-400 to-primary transition-all duration-500 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] animate-pulse pointer-events-none" />
      </div>
    </div>
  );
}
