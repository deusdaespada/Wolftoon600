import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, Clock, Shield, Zap, Star, Gift, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VipInfo {
  expiresAt: Date | null;
  isPermanent: boolean;
  createdAt: Date | null;
}

interface VipHistoryItem {
  id: string;
  action: string;
  created_at: string;
  expires_at: string | null;
}

const VipStatus = () => {
  const { user, isVip, loading } = useAuth();
  const [vipInfo, setVipInfo] = useState<VipInfo | null>(null);
  const [vipHistory, setVipHistory] = useState<VipHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVipInfo = async () => {
      if (!user) return;
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role, expires_at, created_at')
          .eq('user_id', user.id)
          .eq('role', 'vip')
          .maybeSingle();

        if (roleData) {
          setVipInfo({
            expiresAt: roleData.expires_at ? new Date(roleData.expires_at) : null,
            isPermanent: !roleData.expires_at,
            createdAt: roleData.created_at ? new Date(roleData.created_at) : null,
          });
        }

        const { data: historyData } = await supabase
          .from('vip_history')
          .select('id, action, created_at, expires_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyData) setVipHistory(historyData);
      } catch (error) {
        console.error('Error fetching VIP info:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!loading) fetchVipInfo();
  }, [user, loading]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const benefits = [
    { icon: Shield, title: "Sem Anúncios", desc: "Leitura sem interrupções" },
    { icon: Zap, title: "Acesso Antecipado", desc: "Capítulos antes de todos" },
    { icon: Crown, title: "Badge Exclusivo", desc: "Destaque-se na comunidade" },
    { icon: Star, title: "Capítulos VIP", desc: "Conteúdo exclusivo" },
  ];

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = { add: 'VIP Ativado', renew: 'VIP Renovado', remove: 'VIP Removido', code_redemption: 'Código Resgatado' };
    return map[action] || action;
  };

  const getActionColor = (action: string) => {
    if (['add', 'renew', 'code_redemption'].includes(action)) return 'text-emerald-400';
    if (action === 'remove') return 'text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 h-[280px]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_70%)]" />
        </div>

        <div className="relative z-10 container mx-auto px-4 max-w-3xl pt-8 pb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Status VIP</h1>
            <p className="text-muted-foreground">Gerencie sua assinatura e benefícios</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl -mt-2 pb-12 space-y-6">
        {isVip ? (
          <>
            {/* Status Card */}
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">VIP Ativo</h2>
                  <p className="text-sm text-muted-foreground">Todos os benefícios desbloqueados</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {vipInfo?.isPermanent ? (
                  <div className="flex items-center gap-3 bg-background/50 rounded-xl px-4 py-3 border border-border/30">
                    <Sparkles className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">VIP Permanente</p>
                      <p className="text-xs text-muted-foreground">Sem data de expiração</p>
                    </div>
                  </div>
                ) : vipInfo?.expiresAt && (
                  <>
                    <div className="flex items-center gap-3 bg-background/50 rounded-xl px-4 py-3 border border-border/30">
                      <Calendar className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Expira em</p>
                        <p className="text-xs text-muted-foreground">{format(vipInfo.expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-background/50 rounded-xl px-4 py-3 border border-border/30">
                      <Clock className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Tempo restante</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(vipInfo.expiresAt, { locale: ptBR })}</p>
                      </div>
                    </div>
                  </>
                )}
                {vipInfo?.createdAt && (
                  <div className="flex items-center gap-3 bg-background/50 rounded-xl px-4 py-3 border border-border/30">
                    <Gift className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Membro desde</p>
                      <p className="text-xs text-muted-foreground">{format(vipInfo.createdAt, "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
              <h3 className="font-semibold mb-4">Seus Benefícios</h3>
              <div className="grid grid-cols-2 gap-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <b.icon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            {vipHistory.length > 0 && (
              <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
                <h3 className="font-semibold mb-4">Histórico</h3>
                <div className="space-y-1">
                  {vipHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${['add','renew','code_redemption'].includes(item.action) ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <div>
                          <p className={`text-sm font-medium ${getActionColor(item.action)}`}>
                            {getActionLabel(item.action)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {item.expires_at && (
                        <span className="text-xs text-muted-foreground">
                          até {format(new Date(item.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-card/80 rounded-2xl border border-border/50 p-8 md:p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Crown className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Você ainda não é VIP</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Desbloqueie benefícios exclusivos como acesso antecipado, sem anúncios e conteúdo VIP.
            </p>
            <Button asChild size="lg" className="gap-2 rounded-xl shadow-lg shadow-primary/20">
              <Link to="/vip">
                Conhecer Plano VIP
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VipStatus;
