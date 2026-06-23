import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierFor = (level: number) => {
  if (level >= 50) return { name: 'Mestre', from: 'from-yellow-400', to: 'to-amber-600', ring: 'ring-amber-400/40' };
  if (level >= 30) return { name: 'Lendário', from: 'from-purple-500', to: 'to-fuchsia-600', ring: 'ring-fuchsia-500/40' };
  if (level >= 20) return { name: 'Épico', from: 'from-rose-500', to: 'to-red-600', ring: 'ring-rose-500/40' };
  if (level >= 10) return { name: 'Raro', from: 'from-sky-400', to: 'to-blue-600', ring: 'ring-blue-500/40' };
  if (level >= 5) return { name: 'Avançado', from: 'from-emerald-400', to: 'to-emerald-600', ring: 'ring-emerald-500/40' };
  return { name: 'Iniciante', from: 'from-zinc-400', to: 'to-zinc-600', ring: 'ring-zinc-500/40' };
};

export default function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const t = tierFor(level);
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base',
  } as const;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br ring-2 ring-offset-2 ring-offset-background',
          sizes[size],
          t.from,
          t.to,
          t.ring
        )}
      >
        <span className="leading-none">{level}</span>
        <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 drop-shadow" />
      </div>
      {size !== 'sm' && (
        <span className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {t.name}
        </span>
      )}
    </div>
  );
}
