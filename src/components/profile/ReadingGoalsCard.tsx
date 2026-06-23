import { useState } from 'react';
import { useReadingGoals } from '@/hooks/useReadingGoals';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Calendar, CalendarDays, Settings2, Check, X, Flame, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ReadingGoalsCard() {
  const { goals, progress, isLoading, updateGoals, isUpdating, weeklyProgress, monthlyProgress } = useReadingGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(goals.weekly_goal);
  const [monthlyGoal, setMonthlyGoal] = useState(goals.monthly_goal);

  const handleSave = () => {
    updateGoals(
      { weeklyGoal, monthlyGoal },
      {
        onSuccess: () => { toast.success('Metas atualizadas!'); setIsEditing(false); },
        onError: () => { toast.error('Erro ao atualizar metas'); },
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-card/40 border-border/30">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  const GoalRing = ({ progress: p, size = 80, strokeWidth = 6, color }: { progress: number; size?: number; strokeWidth?: number; color: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(p, 100) / 100) * circumference;
    return (
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
    );
  };

  return (
    <Card className="bg-card/40 border-border/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm">Metas de Leitura</h3>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWeeklyGoal(goals.weekly_goal); setMonthlyGoal(goals.monthly_goal); setIsEditing(true); }}>
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setIsEditing(false)}><X className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={handleSave} disabled={isUpdating}><Check className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Weekly */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <GoalRing progress={weeklyProgress} color="hsl(var(--primary))" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {weeklyProgress >= 100 ? (
                  <Trophy className="h-5 w-5 text-primary" />
                ) : (
                  <>
                    <span className="text-lg font-bold leading-none">{Math.round(weeklyProgress)}%</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <Calendar className="h-3 w-3 text-primary" />
              Semanal
            </div>
            {isEditing ? (
              <div className="flex items-center gap-1 mt-1">
                <Input type="number" value={weeklyGoal} onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 1)} className="w-14 h-7 text-center text-xs" min={1} max={100} />
                <span className="text-[10px] text-muted-foreground">caps</span>
              </div>
            ) : (
              <p className={cn("text-xs font-medium", weeklyProgress >= 100 ? "text-green-500" : "text-muted-foreground")}>
                {progress.weekly}/{goals.weekly_goal} caps
              </p>
            )}
          </div>

          {/* Monthly */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <GoalRing progress={monthlyProgress} color="hsl(217, 91%, 60%)" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {monthlyProgress >= 100 ? (
                  <Flame className="h-5 w-5 text-blue-400" />
                ) : (
                  <span className="text-lg font-bold leading-none">{Math.round(monthlyProgress)}%</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <CalendarDays className="h-3 w-3 text-blue-400" />
              Mensal
            </div>
            {isEditing ? (
              <div className="flex items-center gap-1 mt-1">
                <Input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 1)} className="w-14 h-7 text-center text-xs" min={1} max={500} />
                <span className="text-[10px] text-muted-foreground">caps</span>
              </div>
            ) : (
              <p className={cn("text-xs font-medium", monthlyProgress >= 100 ? "text-green-500" : "text-muted-foreground")}>
                {progress.monthly}/{goals.monthly_goal} caps
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
