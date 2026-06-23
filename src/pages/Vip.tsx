import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Star, Zap, Shield, Crown, Gift, Clock } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRedeemVipCode } from "@/hooks/useVipCode";
import { useToast } from "@/hooks/use-toast";

const plans = [
  { duration: '7 dias', price: 'R$ 2,90', perDay: 'R$ 0,41/dia', popular: false },
  { duration: '1 mês', price: 'R$ 5,90', perDay: 'R$ 0,20/dia', popular: true },
  { duration: '3 meses', price: 'R$ 14,90', perDay: 'R$ 0,17/dia', popular: false },
  { duration: '6 meses', price: 'R$ 24,90', perDay: 'R$ 0,14/dia', popular: false },
  { duration: '1 ano', price: 'R$ 44,90', perDay: 'R$ 0,12/dia', popular: false },
  { duration: 'Vitalício', price: 'R$ 149,90', perDay: 'pague uma vez', popular: false },
];

const Vip = () => {
  const { user, isVip } = useAuth();
  const { toast } = useToast();
  const redeemCode = useRedeemVipCode();
  const [code, setCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTo = searchParams.get('redirect');

  useEffect(() => {
    if (isVip && redirectTo && redirectTo.startsWith('/')) {
      navigate(redirectTo, { replace: true });
    }
  }, [isVip, redirectTo, navigate]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await redeemCode.mutateAsync({ code: code.trim() });
      toast({ title: 'Código resgatado!', description: 'Você agora é VIP!' });
      setCode('');
    } catch (error: any) {
      toast({ title: 'Erro ao resgatar', description: error.message, variant: 'destructive' });
    }
  };

  const benefits = [
    { icon: <Shield className="h-5 w-5" />, title: "Sem Anúncios", desc: "Leitura sem interrupções" },
    { icon: <Zap className="h-5 w-5" />, title: "Acesso Antecipado", desc: "Capítulos antes de todos" },
    { icon: <Crown className="h-5 w-5" />, title: "Badge Exclusivo", desc: "Destaque no seu perfil" },
    { icon: <Star className="h-5 w-5" />, title: "Apoie o Projeto", desc: "Ajude o Wolftoon a crescer" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* VIP Active Banner */}
        {user && isVip && (
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-6 text-center mb-10">
            <Crown className="h-10 w-10 mx-auto mb-3 text-primary" />
            <h2 className="text-xl font-bold mb-1">Você é VIP!</h2>
            <p className="text-sm text-muted-foreground">Aproveite todos os benefícios exclusivos.</p>
            <Button asChild variant="outline" className="mt-3 rounded-xl" size="sm">
              <Link to="/vip/status">Ver Status VIP</Link>
            </Button>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">VIP Wolftoon</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Leve sua experiência para o próximo nível com planos flexíveis
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {benefits.map((b, i) => (
            <div key={i} className="bg-card/60 border border-border/30 rounded-xl p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-3">
                {b.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1">{b.title}</h3>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Plans Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-2">Escolha seu Plano</h2>
          <p className="text-center text-sm text-muted-foreground mb-8">Quanto maior a duração, menor o custo por dia</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {plans.map((plan, i) => (
              <button
                key={i}
                onClick={() => setSelectedPlan(i)}
                className={`relative rounded-2xl p-4 md:p-5 text-left transition-all border-2 ${
                  selectedPlan === i
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border/30 bg-card/60 hover:border-border/60'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full">
                    POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{plan.duration}</span>
                </div>
                <div className="text-2xl font-bold text-primary mb-1">{plan.price}</div>
                <p className="text-xs text-muted-foreground">{plan.perDay}</p>

                {selectedPlan === i && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button size="lg" className="rounded-xl px-10 shadow-lg shadow-primary/20">
              Assinar {plans[selectedPlan].duration} — {plans[selectedPlan].price}
            </Button>
          </div>
        </div>

        {/* Redeem Code */}
        {user && !isVip && (
          <div className="bg-card/60 border border-border/30 rounded-2xl p-6 max-w-md mx-auto mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resgatar Código VIP</h3>
            </div>
            <form onSubmit={handleRedeemCode} className="space-y-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Digite seu código"
                className="uppercase rounded-xl bg-background/50"
              />
              <Button type="submit" className="w-full rounded-xl" disabled={redeemCode.isPending || !code.trim()}>
                {redeemCode.isPending ? 'Resgatando...' : 'Resgatar'}
              </Button>
            </form>
          </div>
        )}

        {/* Comparison: Free vs VIP */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-6">Grátis vs VIP</h2>
          <div className="bg-card/60 border border-border/30 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 text-center text-sm font-semibold border-b border-border/30">
              <div className="p-3 text-muted-foreground">Recurso</div>
              <div className="p-3">Grátis</div>
              <div className="p-3 bg-primary/5 text-primary">VIP</div>
            </div>
            {[
              { feature: 'Acesso a todos os títulos', free: true, vip: true },
              { feature: 'Leitura ilimitada', free: true, vip: true },
              { feature: 'Sem anúncios', free: false, vip: true },
              { feature: 'Acesso antecipado', free: false, vip: true },
              { feature: 'Badge exclusivo', free: false, vip: true },
              { feature: 'Prioridade no suporte', free: false, vip: true },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-3 text-center text-sm border-b border-border/20 last:border-0">
                <div className="p-3 text-left text-muted-foreground">{row.feature}</div>
                <div className="p-3">{row.free ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">✗</span>}</div>
                <div className="p-3 bg-primary/5">{row.vip ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">✗</span>}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Perguntas Frequentes</h2>
          <div className="space-y-3">
            {[
              { q: "Posso cancelar a qualquer momento?", a: "Sim! Sem taxas de cancelamento." },
              { q: "Como funciona o acesso antecipado?", a: "VIPs leem novos capítulos 24h antes do público." },
              { q: "Como resgatar um código VIP?", a: "Insira seu código no campo acima quando logado." },
              { q: "Quais são as formas de pagamento?", a: "Cartão de crédito, débito e PIX." },
              { q: "O VIP vitalício expira?", a: "Não! É para sempre, sem renovação." },
            ].map((faq, i) => (
              <div key={i} className="bg-card/40 border border-border/30 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-1">{faq.q}</h3>
                <p className="text-xs text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vip;
