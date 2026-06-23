import { usePlatformStats } from '@/hooks/usePlatformStats';
import { useDetailedUserStats } from '@/hooks/useDetailedUserStats';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Users, BookOpen, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonItemProps {
  label: string;
  icon: React.ReactNode;
  userValue: number;
  avgValue: number;
  unit: string;
  higherIsBetter?: boolean;
}

const ComparisonItem = ({ label, icon, userValue, avgValue, unit, higherIsBetter = true }: ComparisonItemProps) => {
  const diff = userValue - avgValue;
  const percentDiff = avgValue > 0 ? Math.round((diff / avgValue) * 100) : 0;
  const isAbove = diff > 0;
  const isSame = Math.abs(percentDiff) < 5;
  const status = isSame ? 'same' : (isAbove === higherIsBetter ? 'good' : 'bad');

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs">{label}</p>
        <p className="text-[10px] text-muted-foreground">Média: {avgValue.toFixed(1)} {unit}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm">{userValue.toFixed(1)}</p>
        <div className={cn(
          'flex items-center gap-0.5 text-[10px] font-medium',
          status === 'good' && 'text-green-500',
          status === 'bad' && 'text-red-400',
          status === 'same' && 'text-muted-foreground'
        )}>
          {status === 'good' && <TrendingUp className="h-2.5 w-2.5" />}
          {status === 'bad' && <TrendingDown className="h-2.5 w-2.5" />}
          {status === 'same' && <Minus className="h-2.5 w-2.5" />}
          {isSame ? 'Na média' : `${Math.abs(percentDiff)}% ${isAbove ? '↑' : '↓'}`}
        </div>
      </div>
    </div>
  );
};

export default function StatsComparison() {
  const { user } = useAuth();
  const { data: platformStats, isLoading: platformLoading } = usePlatformStats();
  const { data: userStats, isLoading: userLoading } = useDetailedUserStats(user?.id);
  const isLoading = platformLoading || userLoading;

  if (isLoading) {
    return (
      <Card className="bg-card/40 border-border/30">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  if (!platformStats || !userStats) return null;

  const userChapters = userStats.chaptersRead || 0;
  const userReadingTime = (userStats.estimatedReadingTime || 0) / 60;
  const userTitles = userStats.titlesRead || 0;
  const avgTitlesPerUser = platformStats.avg_chapters_per_user / 10;

  return (
    <Card className="bg-card/40 border-border/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm">vs Comunidade</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full">
            <Users className="h-3 w-3 text-primary" />
            <span className="text-xs font-semibold">{platformStats.total_users.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <ComparisonItem
            label="Capítulos Lidos"
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            userValue={userChapters}
            avgValue={platformStats.avg_chapters_per_user}
            unit="caps"
          />
          <ComparisonItem
            label="Tempo de Leitura"
            icon={<Clock className="h-4 w-4 text-blue-400" />}
            userValue={userReadingTime}
            avgValue={platformStats.avg_reading_time_hours}
            unit="h"
          />
          <ComparisonItem
            label="Obras na Lista"
            icon={<Users className="h-4 w-4 text-purple-400" />}
            userValue={userTitles}
            avgValue={avgTitlesPerUser}
            unit=""
          />
        </div>

        {platformStats.top_genre && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-[10px] text-muted-foreground mb-0.5">Gênero mais popular</p>
            <p className="font-bold text-sm text-primary">{platformStats.top_genre}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
