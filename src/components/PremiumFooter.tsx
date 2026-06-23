import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import wolfLogo from "@/assets/wolftoon-wolf-logo.png";
import {
  BookOpen, FileText, Users, MessageSquare, Crown, Heart
} from "lucide-react";

const useFooterStats = () =>
  useQuery({
    queryKey: ["footer-stats"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const [titles, chapters, users, comments] = await Promise.all([
        supabase.from("titles").select("*", { count: "exact", head: true }),
        supabase.from("chapters").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
      ]);
      return {
        titles: titles.count || 0,
        chapters: chapters.count || 0,
        users: users.count || 0,
        comments: comments.count || 0,
      };
    },
  });

const APP_VERSION = "3.0.0";
const BUILD_DATE = new Date("2026-06-06").getTime();

const useUptime = () => {
  const days = Math.floor((Date.now() - BUILD_DATE) / (1000 * 60 * 60 * 24));
  return Math.max(days, 1);
};

const formatNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;

const PremiumFooter = () => {
  const { data: stats } = useFooterStats();
  const uptimeDays = useUptime();

  const statItems = [
    { label: "Obras", value: stats?.titles ?? 0, icon: BookOpen, color: "text-primary" },
    { label: "Capítulos", value: stats?.chapters ?? 0, icon: FileText, color: "text-accent-cyan" },
    { label: "Usuários", value: stats?.users ?? 0, icon: Users, color: "text-accent-purple" },
    { label: "Comentários", value: stats?.comments ?? 0, icon: MessageSquare, color: "text-accent-green" },
  ];

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-primary/15">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={wolfLogo}
          alt=""
          aria-hidden
          className="absolute -right-16 -top-16 w-[460px] max-w-[60%] opacity-[0.06] blur-[2px] select-none pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-card/60 via-background/95 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,hsl(var(--accent-purple)/0.12),transparent_50%)]" />
      </div>

      <div className="relative container mx-auto px-4 md:px-6 py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-10">
          {/* COL 1 — Brand */}
          <div className="col-span-2 md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary/50 blur-xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
                <img
                  src={wolfLogo}
                  alt="Wolftoon"
                  className="relative h-14 w-14 rounded-2xl object-cover ring-2 ring-primary/40 shadow-xl shadow-primary/30"
                />
              </div>
              <div>
                <div className="font-black text-2xl bg-gradient-to-r from-primary via-foreground to-primary-glow bg-clip-text text-transparent leading-none">
                  Wolftoon
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-bold mt-1.5">
                  Reino dos Lobos
                </div>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Sua alcateia de histórias. Descubra, leia e acompanhe os melhores mangás, manhwas e novels em português — uma experiência de leitura premium.
            </p>
            <Link
              to="/vip"
              className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[hsl(45_96%_56%)] to-[hsl(38_95%_60%)] text-[hsl(28_50%_12%)] font-bold text-xs shadow-lg shadow-amber-500/30 hover:opacity-90 transition-opacity"
            >
              <Crown className="h-4 w-4" />
              Assinar VIP
            </Link>
          </div>

          {/* COL 2 — Links rápidos */}
          <div className="md:col-span-2">
            <h4 className="font-black text-[11px] uppercase tracking-widest text-primary/80 mb-4">
              Navegar
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Início</Link></li>
              <li><Link to="/catalog" className="hover:text-primary transition-colors">Catálogo</Link></li>
              <li><Link to="/ranking" className="hover:text-primary transition-colors">Rankings</Link></li>
              <li><Link to="/catalog?type=novel" className="hover:text-primary transition-colors">Novels</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Comunidade</Link></li>
            </ul>
          </div>

          {/* COL 3 — Suporte */}
          <div className="md:col-span-2">
            <h4 className="font-black text-[11px] uppercase tracking-widest text-primary/80 mb-4">
              Suporte
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contato</Link></li>
              <li><Link to="/dmca" className="hover:text-primary transition-colors">DMCA</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Termos</Link></li>
            </ul>
          </div>

          {/* COL 4 — Comunidade */}
          <div className="md:col-span-2">
            <h4 className="font-black text-[11px] uppercase tracking-widest text-primary/80 mb-4">
              Comunidade
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="https://discord.gg/6wUg8wssQv" target="_blank" rel="noopener noreferrer"
                   className="hover:text-[#5865F2] transition-colors">Discord</a>
              </li>
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Telegram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Facebook</a></li>
            </ul>
          </div>

          {/* COL 5 — Stats */}
          <div className="col-span-2 md:col-span-2">
            <h4 className="font-black text-[11px] uppercase tracking-widest text-primary/80 mb-4">
              Estatísticas
            </h4>
            <ul className="space-y-2">
              {statItems.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm"
                >
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                    {s.label}
                  </span>
                  <span className="text-sm font-black text-foreground">
                    {formatNum(s.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} <span className="font-bold text-foreground/80">Wolftoon</span> · Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent-green))] animate-pulse" />
              Online · {uptimeDays}d
            </span>
            <span className="opacity-60">v{APP_VERSION}</span>
            <span className="flex items-center gap-1">
              Feito com <Heart className="h-3 w-3 text-primary fill-primary animate-pulse" /> para a alcateia
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PremiumFooter;
