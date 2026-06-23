import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Lock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const rarityColors = {
  common: 'from-zinc-500 to-zinc-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-400 to-amber-500',
};

const rarityBg = {
  common: 'bg-zinc-500/10 border-zinc-500/30',
  rare: 'bg-blue-500/10 border-blue-500/30',
  epic: 'bg-purple-500/10 border-purple-500/30',
  legendary: 'bg-yellow-500/10 border-yellow-500/30',
};

const rarityLabels = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
}

const AchievementCard = ({ achievement, unlocked }: AchievementCardProps) => (
  <div
    className={cn(
      'relative p-4 rounded-xl border transition-all duration-300',
      unlocked 
        ? rarityBg[achievement.rarity] + ' hover:scale-105' 
        : 'bg-muted/30 border-border/30 opacity-50 grayscale'
    )}
  >
    {!unlocked && (
      <div className="absolute top-2 right-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
    )}
    
    <div className="flex items-start gap-3">
      <div className={cn(
        'text-3xl p-2 rounded-lg',
        unlocked ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} bg-opacity-20` : 'bg-muted'
      )}>
        {achievement.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{achievement.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {achievement.description}
        </p>
        <Badge 
          variant="outline" 
          className={cn(
            'mt-2 text-[10px] px-1.5 py-0',
            unlocked && `bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white border-0`
          )}
        >
          {rarityLabels[achievement.rarity]}
        </Badge>
      </div>
    </div>
  </div>
);

export default function AchievementsBadges() {
  const { unlocked, locked, isLoading, totalPoints } = useAchievements();

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              Conquistas
            </CardTitle>
            <CardDescription>
              {unlocked.length} de {unlocked.length + locked.length} desbloqueadas
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-full">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="font-bold text-yellow-400">{totalPoints}</span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Unlocked achievements */}
        {unlocked.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-primary flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Desbloqueadas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unlocked.map(achievement => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  unlocked={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locked achievements */}
        {locked.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-3 w-3" />
              Bloqueadas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locked.slice(0, 6).map(achievement => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  unlocked={false}
                />
              ))}
            </div>
            {locked.length > 6 && (
              <p className="text-xs text-muted-foreground text-center">
                +{locked.length - 6} conquistas a desbloquear
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
