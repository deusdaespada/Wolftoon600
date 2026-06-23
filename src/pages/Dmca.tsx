import Header from "@/components/Header";
import { Shield, FileText, AlertTriangle, Mail, Ban, RotateCcw } from "lucide-react";

const Dmca = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 h-[200px] bg-gradient-to-b from-primary/10 to-background" />
        <div className="relative z-10 container mx-auto px-4 max-w-3xl pt-12 pb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Política DMCA</h1>
          <p className="text-sm text-muted-foreground">Digital Millennium Copyright Act</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl pb-12 space-y-4">
        <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2.5 mb-3">
            <FileText className="h-5 w-5 text-primary" />
            Sobre o DMCA
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Wolftoon respeita os direitos de propriedade intelectual de terceiros e espera que os usuários 
            do nosso serviço façam o mesmo. Em conformidade com o Digital Millennium Copyright Act (DMCA), 
            responderemos prontamente a reclamações de violação de direitos autorais que sejam reportadas 
            ao nosso Agente Designado.
          </p>
        </div>

        <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2.5 mb-3">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Notificação de Violação
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Se você acredita que seu trabalho protegido por direitos autorais foi copiado de uma maneira 
            que constitui violação, forneça ao nosso Agente Designado as seguintes informações:
          </p>
          <ul className="space-y-1.5">
            {[
              "Uma assinatura física ou eletrônica do proprietário dos direitos autorais",
              "Identificação da obra protegida que você alega ter sido violada",
              "Identificação do material infringente e sua localização no site",
              "Seu endereço, número de telefone e endereço de e-mail",
              "Declaração de boa-fé de que o uso contestado não é autorizado",
              "Declaração, sob pena de perjúrio, de que as informações são precisas",
            ].map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2.5 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            Como Enviar uma Notificação
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Para enviar uma notificação DMCA, entre em contato através do nosso servidor do Discord:
          </p>
          <a 
            href="https://discord.gg/6wUg8wssQv" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            discord.gg/6wUg8wssQv
          </a>
          <p className="text-xs text-muted-foreground mt-3">
            Ao enviar uma notificação DMCA, você pode ser responsabilizado por danos se declarar falsamente que o material está infringindo seus direitos autorais.
          </p>
        </div>

        <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2.5 mb-3">
            <RotateCcw className="h-5 w-5 text-primary" />
            Contra-Notificação
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Se você acredita que seu material foi removido por engano, envie uma contra-notificação contendo:
          </p>
          <ul className="space-y-1.5">
            {[
              "Sua assinatura física ou eletrônica",
              "Identificação do material removido e sua localização anterior",
              "Declaração sob pena de perjúrio de que o material foi removido por erro",
              "Seu nome, endereço, número de telefone e consentimento à jurisdição",
            ].map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2.5 mb-3">
            <Ban className="h-5 w-5 text-primary" />
            Política de Reincidentes
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Wolftoon adota uma política de encerramento de contas de usuários que sejam considerados 
            infratores reincidentes em circunstâncias apropriadas. Reservamo-nos o direito de limitar 
            o acesso ao site e/ou encerrar as contas de quaisquer usuários que infrinjam direitos de 
            propriedade intelectual de terceiros.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
};

export default Dmca;
