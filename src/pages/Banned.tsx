import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, Calendar, AlertTriangle, Mail } from "lucide-react";

interface BannedProps {
  reason: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

const Banned = ({ reason, expiresAt, isPermanent }: BannedProps) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-destructive/40 rounded-2xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldX className="h-16 w-16 text-destructive" />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Conta Banida
          </h1>
          <p className="text-muted-foreground mb-6">
            Sua conta foi suspensa do Wolftoon
          </p>

          {/* Ban Details */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6 text-left space-y-4">
            {/* Reason */}
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Motivo do Banimento</p>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Duração</p>
                <p className="text-sm text-muted-foreground">
                  {isPermanent 
                    ? "Permanente - Esta conta foi banida indefinidamente"
                    : expiresAt 
                      ? `Até ${formatDate(expiresAt)}`
                      : "Indefinido"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground">
              {isPermanent 
                ? "Devido a violações graves dos nossos termos de uso, sua conta foi permanentemente suspensa. Esta decisão é final."
                : "Sua conta será desbloqueada automaticamente após o período de suspensão. Pedimos que respeite as regras da comunidade para evitar futuras penalidades."
              }
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Se você acredita que isso foi um erro, entre em contato conosco:
            </p>
            <Button 
              variant="outline" 
              className="w-full border-border/40"
              asChild
            >
              <Link to="/contact">
                <Mail className="mr-2 h-4 w-4" />
                Entrar em Contato
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banned;
