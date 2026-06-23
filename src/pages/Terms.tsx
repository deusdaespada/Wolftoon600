import Header from "@/components/Header";
import { FileText, Scale, UserCheck, MessageCircle, Copyright, Crown, AlertTriangle, RefreshCw, Mail } from "lucide-react";

const sections = [
  { icon: Scale, title: "1. Aceitação dos Termos", content: "Ao acessar e usar o Wolftoon, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nosso serviço." },
  { icon: FileText, title: "2. Uso do Serviço", content: "O Wolftoon é uma plataforma de leitura de manhwas, manhuas e mangás.", list: ["Não usar o serviço para fins ilegais ou não autorizados", "Não tentar acessar áreas restritas do site sem autorização", "Não distribuir, modificar ou reproduzir o conteúdo sem permissão", "Não usar bots, scrapers ou outras ferramentas automatizadas", "Manter a confidencialidade de sua conta e senha"] },
  { icon: UserCheck, title: "3. Contas de Usuário", content: "Ao criar uma conta no Wolftoon, você é responsável por manter a segurança de sua conta e todas as atividades que ocorram sob ela. Você deve fornecer informações precisas e completas durante o registro. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos." },
  { icon: MessageCircle, title: "4. Conteúdo do Usuário", content: "Ao postar comentários ou outro conteúdo em nossa plataforma, você garante que possui os direitos necessários e concede ao Wolftoon uma licença para usar, modificar e exibir esse conteúdo. Não toleramos conteúdo ofensivo, discriminatório ou ilegal." },
  { icon: Copyright, title: "5. Propriedade Intelectual", content: "Todo o conteúdo disponível no Wolftoon, incluindo mas não limitado a textos, gráficos, logotipos, ícones e imagens, é propriedade do Wolftoon ou de seus respectivos criadores e está protegido por leis de direitos autorais." },
  { icon: Crown, title: "6. Assinatura VIP", content: "A assinatura VIP oferece benefícios adicionais conforme descrito na página VIP. O pagamento é processado mensalmente e pode ser cancelado a qualquer momento. Não oferecemos reembolsos por períodos parciais de uso." },
  { icon: AlertTriangle, title: "7. Limitação de Responsabilidade", content: "O Wolftoon é fornecido \"como está\" sem garantias de qualquer tipo. Não nos responsabilizamos por danos indiretos, incidentais ou consequentes decorrentes do uso ou incapacidade de usar nosso serviço." },
  { icon: RefreshCw, title: "8. Modificações", content: "Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas através do site. O uso continuado do serviço após alterações constitui aceitação dos novos termos." },
  { icon: Mail, title: "9. Contato", content: "Para dúvidas sobre estes Termos de Uso, entre em contato conosco através da página de Contato." },
];

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 h-[200px] bg-gradient-to-b from-primary/10 to-background" />
        <div className="relative z-10 container mx-auto px-4 max-w-3xl pt-12 pb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl pb-12 space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
            <h2 className="text-base font-semibold flex items-center gap-2.5 mb-3">
              <s.icon className="h-5 w-5 text-primary shrink-0" />
              {s.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
            {s.list && (
              <ul className="mt-3 space-y-1.5">
                {s.list.map((item, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terms;
