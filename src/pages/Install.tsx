import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, Check, Share, MoreVertical, Plus, Chrome } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Acesso Rápido",
      description: "Abra o Wolftoon direto da sua tela inicial"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Funciona Offline",
      description: "Acesse títulos mesmo sem internet"
    },
    {
      icon: <Monitor className="h-6 w-6" />,
      title: "Experiência Nativa",
      description: "Interface otimizada para seu dispositivo"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
            <Download className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
            Instale o Wolftoon
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Adicione o Wolftoon à sua tela inicial para uma experiência mais rápida e imersiva
          </p>
        </div>

        {/* Install Status */}
        {isInstalled ? (
          <Card className="mb-8 bg-green-500/10 border-green-500/50">
            <CardContent className="p-6 text-center">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h2 className="font-display text-xl font-semibold mb-2">App Instalado!</h2>
              <p className="text-muted-foreground">
                O Wolftoon já está instalado no seu dispositivo. Aproveite!
              </p>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card className="mb-8 bg-primary/5 border-primary/50">
            <CardContent className="p-6 text-center">
              <Button onClick={handleInstall} size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                Instalar Agora
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Clique para adicionar à sua tela inicial
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold mb-4 text-center">
                Como Instalar
              </h2>
              
              {isIOS ? (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-4">
                    No Safari do seu iPhone ou iPad:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Share className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">1. Toque no botão Compartilhar</p>
                        <p className="text-sm text-muted-foreground">Ícone de compartilhar na barra inferior</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">2. Selecione "Adicionar à Tela de Início"</p>
                        <p className="text-sm text-muted-foreground">Role para baixo se necessário</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">3. Toque em "Adicionar"</p>
                        <p className="text-sm text-muted-foreground">O app aparecerá na sua tela inicial</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isAndroid ? (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-4">
                    No Chrome do seu Android:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <MoreVertical className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">1. Toque no menu (⋮)</p>
                        <p className="text-sm text-muted-foreground">Três pontos no canto superior direito</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Download className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">2. Selecione "Instalar app" ou "Adicionar à tela inicial"</p>
                        <p className="text-sm text-muted-foreground">Pode variar conforme o navegador</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">3. Confirme a instalação</p>
                        <p className="text-sm text-muted-foreground">O app aparecerá na sua tela inicial</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-4">
                    No seu navegador (Chrome, Edge, etc.):
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Chrome className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">1. Procure o ícone de instalação</p>
                        <p className="text-sm text-muted-foreground">Na barra de endereços, à direita</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Download className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">2. Clique em "Instalar"</p>
                        <p className="text-sm text-muted-foreground">Ou vá no menu do navegador</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">3. Confirme a instalação</p>
                        <p className="text-sm text-muted-foreground">O app será adicionado ao seu sistema</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card/50 border-border/40">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">O que é um Web App?</h3>
            <p className="text-sm text-muted-foreground">
              Um Web App (ou PWA - Progressive Web App) funciona como um aplicativo nativo, 
              mas não precisa ser baixado de uma loja de apps. Você instala diretamente do 
              navegador e ele aparece na sua tela inicial como qualquer outro aplicativo.
              É seguro, rápido e não ocupa muito espaço no seu dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
