import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Shield, Heart, BookOpen, Crown, Calendar, Mail, Ticket, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStats } from '@/hooks/useUserStats';
import { useRedeemVipCode } from '@/hooks/useVipCode';
import { useToast } from '@/hooks/use-toast';

const UserDropdown = () => {
  const { user, signOut, isAdmin, isVip } = useAuth();
  const { data: stats } = useUserStats(user?.id);
  const redeemVipCode = useRedeemVipCode();
  const { toast } = useToast();
  const [vipDialogOpen, setVipDialogOpen] = useState(false);
  const [vipCode, setVipCode] = useState('');

  if (!user) return null;

  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Usuário';
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A';

  const handleRedeemCode = async () => {
    if (!vipCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um código VIP válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await redeemVipCode.mutateAsync({ code: vipCode.trim() });
      toast({
        title: 'Sucesso!',
        description: 'Código VIP resgatado com sucesso! Você agora é VIP.',
      });
      setVipDialogOpen(false);
      setVipCode('');
      // Reload to update VIP status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {/* User Info Header */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate flex items-center gap-2">
                  {username}
                  {isVip && <Crown className="h-4 w-4 text-yellow-500" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Estatísticas</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-red-500" />
                <span>{stats?.favoritesCount || 0} favoritos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span>{stats?.readCount || 0} lidos</span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Informações da Conta</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Membro desde {createdAt}</span>
              </div>
              {isVip && (
                <Link 
                  to="/vip/status" 
                  className="flex items-center gap-2 text-xs text-yellow-500 hover:underline"
                >
                  <Crown className="h-3 w-3" />
                  <span>Membro VIP - Ver status</span>
                </Link>
              )}
            </div>
          </div>

          {/* VIP Code */}
          {!isVip && (
            <>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setVipDialogOpen(true)}
              >
                <Ticket className="mr-2 h-4 w-4 text-yellow-500" />
                Resgatar Código VIP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Profile Link */}
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4" />
              Meu Perfil
            </Link>
          </DropdownMenuItem>

          {/* Admin Link */}
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-500">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* VIP Code Dialog */}
      <Dialog open={vipDialogOpen} onOpenChange={setVipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Resgatar Código VIP
            </DialogTitle>
            <DialogDescription>
              Digite seu código VIP para ativar os benefícios exclusivos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="vipCode">Código VIP</Label>
              <Input
                id="vipCode"
                value={vipCode}
                onChange={(e) => setVipCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="uppercase"
              />
            </div>
            <Button 
              onClick={handleRedeemCode} 
              className="w-full"
              disabled={redeemVipCode.isPending}
            >
              {redeemVipCode.isPending ? 'Resgatando...' : 'Resgatar Código'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDropdown;
