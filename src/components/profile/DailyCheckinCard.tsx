import { Flame, Gift, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDailyCheckin } from '@/hooks/useGamification';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DailyCheckinCard() {
  const { data, isLoading, checkin } = useDailyCheckin();
  const { toast } = useToast();

  const handleCheckin = async () => {
    try {
      const result = await checkin.mutateAsync();
      if (result.already_checked) {
        toast({ title: 'Já fez check-in hoje', description: `Sequência atual: ${result.streak} dias.` });
      } else {
        toast({
          title: `+${result.xp_awarded} XP!`,
          description: `Check-in registrado. Sequência: ${result.streak} dias 🔥`,
        });
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível fazer check-in.', variant: 'destructive' });
    }
  };

  const streak = data?.streak ?? 0;
  const checkedToday = data?.checkedToday;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card/60 to-amber-500/10 border-primary/20 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <CardHeader className="pb-2 relative">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          Check-in Diário
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="font-bold text-orange-400">{streak}</span>
            <span className="text-[11px] text-muted-foreground">dias</span>
          </div>
          <p className="text-xs text-muted-foreground flex-1">
            {checkedToday
              ? 'Check-in feito hoje. Volte amanhã!'
              : 'Ganhe XP e mantenha sua sequência ativa.'}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const active = i < (streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0));
            return (
              <div
                key={i}
                className={cn(
                  'h-7 rounded-md flex items-center justify-center text-[10px] font-medium border',
                  active
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-card/40 border-border/30 text-muted-foreground'
                )}
              >
                {active ? <Check className="h-3 w-3" /> : `D${i + 1}`}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleCheckin}
          disabled={isLoading || checkin.isPending || checkedToday}
          className="w-full"
          size="sm"
        >
          {checkin.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Validando...</>
          ) : checkedToday ? (
            <><Check className="h-4 w-4 mr-1" />Check-in feito</>
          ) : (
            <><Gift className="h-4 w-4 mr-1" />Fazer Check-in</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
