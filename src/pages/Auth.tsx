import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
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

/* ─── Manga panel background (signature element) ─────────────────────────── */
const MangaPanels = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none select-none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* panel grid – intentionally asymmetric like a real manga page */}
    <rect x="0"   y="0"   width="55%" height="38%" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="55%" y="0"   width="45%" height="55%" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="0"   y="38%" width="35%" height="35%" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="35%" y="38%" width="20%" height="35%" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="0"   y="73%" width="55%" height="27%" fill="none" stroke="white" strokeWidth="1.5"/>
    <rect x="55%" y="55%" width="45%" height="45%" fill="none" stroke="white" strokeWidth="1.5"/>
    {/* speed lines emanating from center */}
    {Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const cx = 50, cy = 50;
      const r1 = 8, r2 = 70;
      return (
        <line
          key={i}
          x1={`${cx + Math.cos(angle) * r1}%`}
          y1={`${cy + Math.sin(angle) * r1}%`}
          x2={`${cx + Math.cos(angle) * r2}%`}
          y2={`${cy + Math.sin(angle) * r2}%`}
          stroke="white"
          strokeWidth="0.4"
          opacity="0.5"
        />
      );
    })}
  </svg>
);

/* ─── Google icon ─────────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ─── Reusable field ──────────────────────────────────────────────────────── */
interface FieldProps {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  label: string;
  icon: React.ReactNode;
  showToggle?: boolean;
  shown?: boolean;
  onToggle?: () => void;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const Field = ({ id, name, type, placeholder, label, icon, showToggle, shown, onToggle, value, onChange, required }: FieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
      {label}
    </Label>
    <div className="relative group">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-400 transition-colors">
        {icon}
      </span>
      <Input
        id={id}
        name={name}
        type={showToggle ? (shown ? "text" : "password") : type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className="
          h-12 pl-10 pr-10
          bg-zinc-900/60 border border-zinc-700/60
          text-white placeholder:text-zinc-600
          rounded-xl
          focus-visible:ring-0 focus-visible:border-violet-500
          focus-visible:bg-zinc-900
          transition-all duration-200
        "
      />
      {showToggle && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [banInfo, setBanInfo] = useState<{ reason: string; expires_at: string | null; is_permanent: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
      setIsRecoveryMode(true);
    }
  }, []);

  const redirectTarget = (() => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    return r && r.startsWith("/") ? r : "/";
  })();

  useEffect(() => {
    if (user && !isRecoveryMode) navigate(redirectTarget);
  }, [user, navigate, isRecoveryMode, redirectTarget]);

  /* ── handlers ── */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await signIn(fd.get("email") as string, fd.get("password") as string);
    if (error) {
      if (error.message === "BANNED" && error.banInfo) { setBanInfo(error.banInfo); setIsLoading(false); return; }
      toast({ title: "Falha no login", description: error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message, variant: "destructive" });
    } else {
      toast({ title: "Bem-vindo de volta! 👋", description: "Você entrou no Wolftoon." });
      navigate(redirectTarget);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm  = fd.get("confirm")  as string;
    if (password !== confirm) {
      toast({ title: "Senhas diferentes", description: "As senhas precisam ser iguais.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const { error } = await signUp(fd.get("email") as string, password, fd.get("name") as string);
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada! 🎉", description: "Bem-vindo ao Wolftoon." });
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) { toast({ title: "Email obrigatório", description: "Digite seu email para continuar.", variant: "destructive" }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/auth` });
    if (error) { toast({ title: "Erro", description: "Email não encontrado no sistema.", variant: "destructive" }); }
    else { toast({ title: "Email enviado", description: "Verifique sua caixa de entrada para o link de recuperação." }); setIsResetDialogOpen(false); setResetEmail(""); }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${redirectTarget}` } });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setIsLoading(false); }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmNewPassword) { toast({ title: "Campos obrigatórios", description: "Preencha os dois campos.", variant: "destructive" }); return; }
    if (newPassword !== confirmNewPassword) { toast({ title: "Senhas diferentes", description: "As senhas precisam ser iguais.", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Senha atualizada!", description: "Você já pode entrar com a nova senha." }); window.location.hash = ""; setIsRecoveryMode(false); navigate("/"); }
    setIsLoading(false);
  };

  const handleCancelRecovery = async () => {
    await supabase.auth.signOut();
    window.location.hash = "";
    setIsRecoveryMode(false);
    navigate("/auth");
  };

  /* ── ban screen ── */
  if (banInfo) return <Banned reason={banInfo.reason} expiresAt={banInfo.expires_at} isPermanent={banInfo.is_permanent} />;

  /* ── password recovery screen ── */
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={handleCancelRecovery}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Cancelar
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-violet-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Criar nova senha</h1>
              <p className="text-sm text-zinc-500 mt-1">Escolha uma senha com pelo menos 6 caracteres</p>
            </div>

            <div className="space-y-4">
              <Field id="new-password" name="new-password" type="password" placeholder="••••••••" label="Nova senha" icon={<Lock className="h-4 w-4" />} showToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Field id="confirm-new-password" name="confirm-new-password" type="password" placeholder="••••••••" label="Confirmar senha" icon={<Lock className="h-4 w-4" />} showToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              <button
                onClick={handleUpdatePassword}
                disabled={isLoading}
                className="w-full h-12 mt-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {isLoading ? "Salvando…" : "Salvar nova senha"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── main auth screen ── */
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Manga panel background */}
      <MangaPanels />

      {/* Radial glow behind card */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden">

          {/* Accent bar on top */}
          <div className="h-0.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600" />

          <div className="p-7">

            {/* Logo + tagline */}
            <div className="text-center mb-7">
              <div className="flex justify-center mb-2">
                <BrandLogo className="h-9" />
              </div>
              <p className="text-xs text-zinc-500 tracking-wide">Mangás e novels em um só lugar</p>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="
                w-full h-11 flex items-center justify-center gap-2.5
                border border-zinc-700/70 hover:border-zinc-600 hover:bg-zinc-800/60
                rounded-xl text-sm font-medium text-zinc-300 hover:text-white
                transition-all duration-200 disabled:opacity-50
              "
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-600 uppercase tracking-widest">ou</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Tab switcher */}
            <div className="flex bg-zinc-950/60 border border-zinc-800 rounded-xl p-1 mb-6">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                    ${activeTab === tab
                      ? "bg-violet-600 text-white shadow-sm shadow-violet-900"
                      : "text-zinc-500 hover:text-zinc-300"
                    }
                  `}
                >
                  {tab === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            {/* Login form */}
            {activeTab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field
                  id="login-email" name="email" type="email"
                  placeholder="seu@email.com" label="Email"
                  icon={<Mail className="h-4 w-4" />}
                  required
                />
                <Field
                  id="login-password" name="password" type="password"
                  placeholder="••••••••" label="Senha"
                  icon={<Lock className="h-4 w-4" />}
                  showToggle shown={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  required
                />

                {/* Forgot password */}
                <div className="flex justify-end">
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="text-xs text-zinc-500 hover:text-violet-400 transition-colors">
                        Esqueceu a senha?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Recuperar senha</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                          Enviaremos um link para você redefinir sua senha.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <Field
                          id="reset-email" name="reset-email" type="email"
                          placeholder="seu@email.com" label="Email"
                          icon={<Mail className="h-4 w-4" />}
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <button
                          onClick={handlePasswordReset}
                          disabled={isLoading}
                          className="w-full h-11 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                        >
                          {isLoading ? "Enviando…" : "Enviar link de recuperação"}
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors mt-1"
                >
                  {isLoading ? "Entrando…" : "Entrar"}
                </button>
              </form>
            )}

            {/* Register form */}
            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <Field
                  id="register-name" name="name" type="text"
                  placeholder="Seu nome de usuário" label="Nome de usuário"
                  icon={<User className="h-4 w-4" />}
                  required
                />
                <Field
                  id="register-email" name="email" type="email"
                  placeholder="seu@email.com" label="Email"
                  icon={<Mail className="h-4 w-4" />}
                  required
                />
                <Field
                  id="register-password" name="password" type="password"
                  placeholder="••••••••" label="Senha"
                  icon={<Lock className="h-4 w-4" />}
                  showToggle shown={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  required
                />
                <Field
                  id="register-confirm" name="confirm" type="password"
                  placeholder="••••••••" label="Confirmar senha"
                  icon={<Lock className="h-4 w-4" />}
                  showToggle shown={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  required
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors mt-1"
                >
                  {isLoading ? "Cadastrando…" : "Criar conta"}
                </button>
              </form>
            )}

            {/* Terms */}
            <p className="text-[10px] text-center text-zinc-600 mt-5 leading-relaxed">
              Ao continuar, você concorda com os{" "}
              <Link to="/terms" className="text-zinc-400 hover:text-violet-400 transition-colors underline underline-offset-2">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacy" className="text-zinc-400 hover:text-violet-400 transition-colors underline underline-offset-2">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
