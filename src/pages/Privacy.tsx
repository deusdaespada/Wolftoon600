import Header from "@/components/Header";
import { Shield, Database, Share2, Lock, Cookie, UserCheck, RefreshCw } from "lucide-react";

const sections = [
  { icon: Database, title: "1. Informações que Coletamos", content: "Coletamos informações que você nos fornece diretamente ao se registrar, como nome de usuário e endereço de e-mail. Também podemos coletar automaticamente informações não-pessoais, como seu endereço IP, tipo de navegador e páginas visitadas, para melhorar a experiência do usuário." },
  { icon: Shield, title: "2. Como Usamos Suas Informações", content: "Utilizamos as informações coletadas para:", list: ["Fornecer, operar e manter nosso site", "Melhorar, personalizar e expandir nosso site", "Entender e analisar como você usa nosso site", "Desenvolver novos produtos, serviços, recursos e funcionalidades", "Comunicar-se com você para atendimento ao cliente e atualizações", "Processar suas transações", "Detectar e prevenir fraudes"] },
  { icon: Share2, title: "3. Compartilhamento de Informações", content: "Não vendemos, trocamos ou transferimos de outra forma suas informações de identificação pessoal a terceiros, exceto quando necessário para operar o site ou conforme exigido por lei." },
  { icon: Lock, title: "4. Segurança de Dados", content: "Implementamos uma variedade de medidas de segurança para manter a segurança de suas informações pessoais quando você faz um pedido ou insere, envia ou acessa suas informações pessoais." },
  { icon: Cookie, title: "5. Cookies", content: "Utilizamos cookies para ajudar a compilar dados agregados sobre o tráfego do site e a interação do site para que possamos oferecer melhores experiências e ferramentas no futuro." },
  { icon: UserCheck, title: "6. Seus Direitos de Proteção de Dados", content: "Em certas circunstâncias, você tem os seguintes direitos:", list: ["O direito de acessar, atualizar ou excluir as informações que temos sobre você", "O direito de retificação", "O direito de se opor", "O direito de restrição", "O direito à portabilidade de dados", "O direito de retirar o consentimento"] },
  { icon: RefreshCw, title: "7. Alterações nesta Política", content: "Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações publicando a nova Política de Privacidade nesta página." },
];

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 h-[200px] bg-gradient-to-b from-primary/10 to-background" />
        <div className="relative z-10 container mx-auto px-4 max-w-3xl pt-12 pb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Política de Privacidade</h1>
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

export default Privacy;
