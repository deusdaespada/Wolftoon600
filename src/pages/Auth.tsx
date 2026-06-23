import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Banned from "./Banned";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import BrandLogo from "@/components/BrandLogo";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [banInfo, setBanInfo] = useState<{ reason: string; expires_at: string | null; is_permanent: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    if (type === 'recovery' && accessToken) {
      setIsRecoveryMode(true);
    }
  }, []);

  const redirectTarget = (() => {
    const r = new URLSearchParams(window.location.search).get('redirect');
    return r && r.startsWith('/') ? r : '/';
  })();

  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate(redirectTarget);
    }
  }, [user, navigate, isRecoveryMode, redirectTarget]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message === 'BANNED' && error.banInfo) {
        setBanInfo(error.banInfo);
        setIsLoading(false);
        return;
      }
      toast({ title: 'Erro no login', description: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Login realizado!', description: 'Bem-vindo de volta ao Wolftoon.' });
      navigate(redirectTarget);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const username = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm') as string;
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await signUp(email, password, username);
    if (error) {
      toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Conta criada!', description: 'Bem-vindo ao Wolftoon. Você já pode fazer login.' });
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) { toast({ title: 'Erro', description: 'Por favor, insira seu email.', variant: 'destructive' }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/auth` });
    if (error) { toast({ title: 'Erro', description: 'Este email não está cadastrado no sistema.', variant: 'destructive' }); }
    else { toast({ title: 'Verifique seu email', description: 'Se este email estiver cadastrado, você receberá um link de recuperação.' }); setIsResetDialogOpen(false); setResetEmail(""); }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${redirectTarget}` } });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); setIsLoading(false); }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmNewPassword) { toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' }); return; }
    if (newPassword !== confirmNewPassword) { toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' }); return; }
    if (newPassword.length < 6) { toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Senha atualizada!', description: 'Sua senha foi alterada com sucesso.' }); window.location.hash = ''; setIsRecoveryMode(false); navigate('/'); }
    setIsLoading(false);
  };

  if (banInfo) {
    return <Banned reason={banInfo.reason} expiresAt={banInfo.expires_at} isPermanent={banInfo.is_permanent} />;
  }

  const handleCancelRecovery = async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
    setIsRecoveryMode(false);
    navigate('/auth');
  };

  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" size="sm" onClick={handleCancelRecovery} className="mb-8 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />Cancelar e sair
          </Button>
          <div className="bg-card border border-border/40 rounded-2xl p-8">
            <div className="text-center mb-8">
              <Lock className="h-12 w-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold mb-1">Nova Senha</h1>
              <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background border-border/40 focus:border-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                <Input id="confirm-new-password" type="password" placeholder="••••••••" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="bg-background border-border/40 focus:border-primary" />
              </div>
              <Button onClick={handleUpdatePassword} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={isLoading}>
                {isLoading ? "Atualizando..." : "Atualizar Senha"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back */}
        <Button variant="ghost" size="sm" asChild className="mb-6 hover:bg-primary/10 hover:text-primary">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
        </Button>

        <div className="bg-card/80 backdrop-blur-xl border border-border/40 rounded-2xl p-6 md:p-8 shadow-xl">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <BrandLogo className="h-10" />
            </div>
            <p className="text-sm text-muted-foreground">Sua plataforma de mangás e novels</p>
          </div>

          {/* Google */}
          <Button type="button" variant="outline" className="w-full mb-5 h-11 border-border/40 hover:bg-muted gap-2" onClick={handleGoogleLogin} disabled={isLoading}>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card/80 px-3 text-muted-foreground">ou</span></div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-muted/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="login-email" name="email" type="email" placeholder="seu@email.com" required className="pl-10 bg-background border-border/40 focus:border-primary h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required className="pl-10 pr-10 bg-background border-border/40 focus:border-primary h-11" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">Esqueceu sua senha?</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Recuperar Senha</DialogTitle>
                    <DialogDescription>Digite seu email para receber um link de recuperação.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input type="email" placeholder="seu@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="bg-background border-border/40 focus:border-primary" />
                    <Button onClick={handlePasswordReset} className="w-full" disabled={isLoading}>{isLoading ? "Enviando..." : "Enviar Link"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}

          {/* Register */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name" className="text-sm">Nome de usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="register-name" name="name" type="text" placeholder="Seu nome" required className="pl-10 bg-background border-border/40 focus:border-primary h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="register-email" name="email" type="email" placeholder="seu@email.com" required className="pl-10 bg-background border-border/40 focus:border-primary h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-sm">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="register-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required className="pl-10 pr-10 bg-background border-border/40 focus:border-primary h-11" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm" className="text-sm">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="register-confirm" name="confirm" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" required className="pl-10 pr-10 bg-background border-border/40 focus:border-primary h-11" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm" disabled={isLoading}>
                {isLoading ? "Cadastrando..." : "Criar Conta"}
              </Button>
            </form>
          )}

          <p className="text-[10px] text-center text-muted-foreground mt-5">
            Ao continuar, você concorda com nossos{' '}
            <Link to="/terms" className="text-primary hover:underline">Termos de Uso</Link>{' '}e{' '}
            <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
