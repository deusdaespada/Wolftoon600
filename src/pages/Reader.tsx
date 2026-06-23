import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTitle } from "@/hooks/useTitles";
import { useChapter, useChapters } from "@/hooks/useChapters";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Settings, ChevronDown,
  Download, MessageCircle, Minus, Plus, Crown, Lock, Maximize, List, Columns,
  Moon, Sun, BookOpen, Home, Layers, FileText, Zap,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import CommentsSection from "@/components/CommentsSection";
import VipCountdown from "@/components/VipCountdown";
import PollsSection from "@/components/PollsSection";
import JSZip from "jszip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type ReadingMode = "webtoon" | "vertical" | "horizontal";
type ThemeMode = "dark" | "amoled" | "light" | "sepia";

const REACTIONS = [
  { key: "fire", emoji: "🔥", label: "Incrível" },
  { key: "heart", emoji: "❤️", label: "Amei" },
  { key: "laugh", emoji: "😂", label: "Engraçado" },
  { key: "shock", emoji: "😱", label: "Chocante" },
  { key: "cry", emoji: "😭", label: "Emocionante" },
  { key: "think", emoji: "🤔", label: "Intrigante" },
];

const Reader = () => {
  const { id, chapter } = useParams();
  const navigate = useNavigate();
  const { user, isVip } = useAuth();

  const { data: manga, isLoading: mangaLoading } = useTitle(id || "");
  const { data: chapterData, isLoading: chapterLoading } = useChapter(id || "", parseInt(chapter ?? "0"));
  const { data: allChapters } = useChapters(id || "");
  const { updateProgress } = useReadingProgress();
  const { addToHistory } = useReadingHistory();

  const currentChapter = parseInt(chapter ?? "0");
  const [pageWidth, setPageWidth] = useState<number>(() => Number(localStorage.getItem("reader.pageWidth")) || 100);
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => (localStorage.getItem("reader.mode") as ReadingMode) || "vertical");
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("reader.theme") as ThemeMode) || "dark");
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem("reader.fontSize")) || 18);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">(() => (localStorage.getItem("reader.fontFamily") as any) || "sans");
  const [lineHeight, setLineHeight] = useState<number>(() => Number(localStorage.getItem("reader.lineHeight")) || 1.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const lastScrollY = useRef(0);

  const rawPages = chapterData?.images || [];
  const totalPages = rawPages.length;
  const isNovel = chapterData?.content_type === 'novel';
  const novelContent = chapterData?.content || '';
  const pages = rawPages;

  // Persist preferences
  useEffect(() => { localStorage.setItem("reader.pageWidth", String(pageWidth)); }, [pageWidth]);
  useEffect(() => { localStorage.setItem("reader.mode", readingMode); }, [readingMode]);
  useEffect(() => { localStorage.setItem("reader.theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("reader.fontSize", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader.fontFamily", fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem("reader.lineHeight", String(lineHeight)); }, [lineHeight]);

  // Load saved reaction
  useEffect(() => {
    if (chapterData?.id) {
      setReaction(localStorage.getItem(`reaction_${chapterData.id}`));
    }
  }, [chapterData?.id]);

  const pickReaction = (key: string) => {
    if (!chapterData) return;
    const next = reaction === key ? null : key;
    setReaction(next);
    if (next) localStorage.setItem(`reaction_${chapterData.id}`, next);
    else localStorage.removeItem(`reaction_${chapterData.id}`);
    if (next) toast.success(`Reação registrada: ${REACTIONS.find(r => r.key === next)?.emoji}`);
  };

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Auto-hide header + reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0);
      if (Math.abs(y - lastScrollY.current) > 8) {
        setHeaderVisible(y < lastScrollY.current || y < 80);
        lastScrollY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (readingMode === "horizontal" && !isNovel) {
        if (e.key === "ArrowRight" && currentPage < totalPages - 1) {
          e.preventDefault(); setCurrentPage(prev => prev + 1);
        } else if (e.key === "ArrowLeft" && currentPage > 0) {
          e.preventDefault(); setCurrentPage(prev => prev - 1);
        }
      }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setTheme(prev => prev === "dark" ? "amoled" : prev === "amoled" ? "light" : prev === "light" ? "sepia" : "dark");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, isNovel, currentPage, totalPages, toggleFullscreen]);

  // Reading progress
  useEffect(() => {
    if (user && manga && chapterData) {
      updateProgress({
        titleId: manga.id,
        chapterId: chapterData.id,
        pageNumber: readingMode === "horizontal" ? currentPage + 1 : 1,
        completed: false,
      });
      addToHistory({ titleId: manga.id, chapterId: chapterData.id });
    }
  }, [user, manga, chapterData]);

  useEffect(() => {
    if (manga && chapter) localStorage.setItem(`reading_${manga.id}`, chapter);
  }, [manga, chapter]);

  useEffect(() => { setCurrentPage(0); window.scrollTo({ top: 0 }); }, [chapter]);

  // Auto-reload when VIP unlock elapses
  useEffect(() => {
    const unlockAt = (chapterData as any)?.vip_unlock_at;
    if (!chapterData?.is_vip || !unlockAt || isVip) return;
    const ms = new Date(unlockAt).getTime() - Date.now();
    if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;
    const tid = setTimeout(() => window.location.reload(), ms + 500);
    return () => clearTimeout(tid);
  }, [chapterData, isVip]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (readingMode !== "horizontal") return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPage < totalPages - 1) setCurrentPage(p => p + 1);
      else if (diff < 0 && currentPage > 0) setCurrentPage(p => p - 1);
    }
  }, [readingMode, currentPage, totalPages]);

  const handleDownload = async () => {
    if (rawPages.length === 0) return;
    setIsDownloading(true);
    toast.info("Preparando download...");
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${manga?.title || 'manga'}_cap${currentChapter}`);
      for (let i = 0; i < rawPages.length; i++) {
        const response = await fetch(rawPages[i]);
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpg';
        folder?.file(`pagina_${String(i + 1).padStart(3, '0')}.${extension}`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${manga?.title || 'manga'}_capitulo_${currentChapter}.zip`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Download concluído!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao baixar capítulo");
    } finally {
      setIsDownloading(false);
    }
  };

  const themeStyles = (() => {
    switch (theme) {
      case "light": return { bg: "bg-gray-50", text: "text-gray-900", panel: "bg-white/80 border-gray-200/60", muted: "text-gray-600" };
      case "sepia": return { bg: "bg-[#f4ecd8]", text: "text-amber-950", panel: "bg-amber-50/80 border-amber-200/60", muted: "text-amber-800" };
      case "amoled": return { bg: "bg-black", text: "text-zinc-100", panel: "bg-black/70 border-white/5", muted: "text-zinc-500" };
      default: return { bg: "bg-[#05070D]", text: "text-zinc-100", panel: "bg-[#0B1220]/70 border-white/5", muted: "text-zinc-400" };
    }
  })();

  const getFontClass = () => fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "font-sans";

  if (mangaLoading || chapterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-muted-foreground text-sm">Carregando capítulo...</span>
        </div>
      </div>
    );
  }

  if (!manga || !chapterData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Capítulo não encontrado</h1>
          <Button asChild><Link to="/catalog">Voltar ao Catálogo</Link></Button>
        </div>
      </div>
    );
  }

  const unlockAt = (chapterData as any).vip_unlock_at;
  const unlockMs = unlockAt ? new Date(unlockAt).getTime() : null;
  const autoUnlocked = !!(unlockMs && unlockMs <= Date.now());
  const isVipChapter = chapterData.is_vip && !autoUnlocked;

  if (isVipChapter && !isVip) {
    const willUnlockSoon = !!unlockMs && unlockMs > Date.now();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, hsl(45 96% 56% / 0.25), transparent 60%)" }} />
        <div className="text-center max-w-md mx-auto relative glass-strong rounded-3xl p-8 glow-vip">
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[hsl(45_96%_56%/0.2)] to-primary/15 border border-[hsl(45_96%_56%/0.3)] inline-block">
            <Lock className="h-12 w-12 text-[hsl(45_96%_56%)]" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Conteúdo Exclusivo VIP</h1>
          <p className="text-muted-foreground mb-4">
            {willUnlockSoon ? 'Este capítulo será liberado gratuitamente em breve.' : 'Este capítulo é exclusivo para membros VIP.'}
          </p>
          {unlockAt && (
            <div className="mb-6 flex justify-center">
              <VipCountdown unlockAt={unlockAt} variant="block" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            {!user ? (
              <>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>Entrar / Cadastrar</Link>
                </Button>
                <Button asChild variant="outline" className="border-[hsl(45_96%_56%/0.5)] text-[hsl(45_96%_56%)] hover:bg-[hsl(45_96%_56%/0.1)]">
                  <Link to={`/vip?redirect=${encodeURIComponent(window.location.pathname)}`}><Crown className="mr-2 h-4 w-4" />Seja VIP</Link>
                </Button>
              </>
            ) : (
              <Button asChild className="bg-gradient-to-r from-[hsl(45_96%_56%)] to-primary text-white hover:opacity-90">
                <Link to={`/vip?redirect=${encodeURIComponent(window.location.pathname)}`}><Crown className="mr-2 h-4 w-4" />Tornar-se VIP</Link>
              </Button>
            )}
            {willUnlockSoon && (
              <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
            )}
            <Button variant="ghost" onClick={() => navigate(`/manga/${manga.id}`)}>Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const minChapter = allChapters?.reduce((min, ch) => Math.min(min, ch.chapter_number), currentChapter) ?? 0;
  const maxChapter = allChapters?.reduce((max, ch) => Math.max(max, ch.chapter_number), 0) || currentChapter;
  const hasNextChapter = currentChapter < maxChapter;
  const hasPrevChapter = currentChapter > minChapter;
  const sortedChapters = [...(allChapters || [])].sort((a, b) => b.chapter_number - a.chapter_number);

  const isGappedVertical = readingMode === "vertical";
  const isWebtoon = readingMode === "webtoon";

  return (
    <div className={cn("min-h-screen transition-colors duration-300", themeStyles.bg, themeStyles.text)}>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary-glow to-accent-cyan transition-[width] duration-150"
          style={{ width: `${scrollProgress}%`, boxShadow: "0 0 10px hsl(var(--primary) / 0.6)" }}
        />
      </div>

      {/* Floating Glass Header */}
      <header
        className={cn(
          "fixed top-2 left-2 right-2 md:left-4 md:right-4 z-50 rounded-2xl border transition-all duration-300",
          "glass-strong shadow-[0_10px_40px_rgba(0,0,0,0.4)]",
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-[110%] opacity-0"
        )}
      >
        <div className="flex h-12 md:h-14 items-center justify-between px-2 md:px-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/manga/${manga.id}`)} className="h-9 w-9 shrink-0 rounded-xl hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate leading-tight">{manga.title}</h1>
              <p className={cn("text-[11px] leading-tight truncate", themeStyles.muted)}>
                Cap. {currentChapter}{chapterData.chapter_title && ` — ${chapterData.chapter_title}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Chapter selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2 rounded-xl hover:bg-white/10 gap-0.5">
                  <BookOpen className="h-4 w-4" /><ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-80 overflow-y-auto w-60 glass-strong border-white/10" align="end">
                {sortedChapters.map((ch) => (
                  <DropdownMenuItem
                    key={ch.id}
                    className={cn("cursor-pointer text-sm rounded-lg", ch.chapter_number === currentChapter && "bg-primary/20 text-primary")}
                    onClick={() => navigate(`/read/${manga.id}/${ch.chapter_number}`)}
                  >
                    Cap. {ch.chapter_number}{ch.chapter_title && ` - ${ch.chapter_title}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick theme cycle */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setTheme(p => p === "dark" ? "amoled" : p === "amoled" ? "light" : p === "light" ? "sepia" : "dark")}
              className="h-9 w-9 rounded-xl hover:bg-white/10"
              title="Tema (N)"
            >
              {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "amoled" ? <Zap className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Settings */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0B1220] border-white/10 text-white w-[88vw] sm:w-96 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> Configurações de Leitura
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {!isNovel && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Modo de Leitura</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: "webtoon" as const, label: "Webtoon", icon: Layers, desc: "Sem espaço" },
                          { key: "vertical" as const, label: "Vertical", icon: List, desc: "Com espaço" },
                          { key: "horizontal" as const, label: "Página", icon: Columns, desc: "Uma a uma" },
                        ]).map((m) => (
                          <button
                            key={m.key}
                            onClick={() => setReadingMode(m.key)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                              readingMode === m.key
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-white/10 hover:border-primary/40 text-zinc-300"
                            )}
                          >
                            <m.icon className="h-4 w-4" />
                            <span className="text-[11px] font-semibold">{m.label}</span>
                            <span className="text-[9px] text-zinc-500">{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isNovel && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center justify-between">
                        Largura da Página
                        <span className="text-primary font-bold">{pageWidth}%</span>
                      </label>
                      <Slider value={[pageWidth]} onValueChange={(v) => setPageWidth(v[0])} min={40} max={100} step={5} className="py-2" />
                    </div>
                  )}

                  {isNovel && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center justify-between">
                          Tamanho da Fonte<span className="text-primary font-bold">{fontSize}px</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => setFontSize(p => Math.max(12, p - 2))} className="border-white/10 bg-white/5 hover:bg-white/10 h-8 w-8"><Minus className="h-4 w-4" /></Button>
                          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={12} max={32} step={1} className="flex-1" />
                          <Button variant="outline" size="icon" onClick={() => setFontSize(p => Math.min(32, p + 2))} className="border-white/10 bg-white/5 hover:bg-white/10 h-8 w-8"><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fonte</label>
                        <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as any)}>
                          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#0B1220] border-white/10">
                            <SelectItem value="sans">Sans-serif</SelectItem>
                            <SelectItem value="serif">Serif</SelectItem>
                            <SelectItem value="mono">Monospace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center justify-between">
                          Espaçamento<span className="text-primary font-bold">{lineHeight.toFixed(1)}x</span>
                        </label>
                        <Slider value={[lineHeight]} onValueChange={(v) => setLineHeight(v[0])} min={1.2} max={2.5} step={0.1} className="py-2" />
                      </div>
                    </>
                  )}

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Tema de Leitura</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { key: "dark" as const, label: "Escuro", icon: Moon, swatch: "bg-[#05070D] border-zinc-700" },
                        { key: "amoled" as const, label: "AMOLED", icon: Zap, swatch: "bg-black border-zinc-800" },
                        { key: "light" as const, label: "Claro", icon: Sun, swatch: "bg-white border-gray-300" },
                        { key: "sepia" as const, label: "Sépia", icon: BookOpen, swatch: "bg-amber-100 border-amber-300" },
                      ]).map((t) => (
                        <button
                          key={t.key} onClick={() => setTheme(t.key)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all",
                            theme === t.key ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/40"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", t.swatch)}>
                            <t.icon className={cn("h-3.5 w-3.5", t.key === "light" ? "text-gray-700" : t.key === "sepia" ? "text-amber-700" : "text-white")} />
                          </div>
                          <span className="text-[10px] font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {!isNovel && (
                    <div className="pt-4 border-t border-white/10">
                      <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10" onClick={handleDownload} disabled={isDownloading}>
                        <Download className="h-4 w-4 mr-2" />
                        {isDownloading ? "Baixando..." : "Baixar Capítulo"}
                      </Button>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs font-medium mb-2 text-zinc-400">Atalhos</p>
                    <div className="space-y-1.5 text-[11px] text-zinc-500">
                      <div className="flex justify-between"><span>Navegar páginas</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">←→</kbd></div>
                      <div className="flex justify-between"><span>Tela cheia</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">F</kbd></div>
                      <div className="flex justify-between"><span>Alternar tema</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">N</kbd></div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl hover:bg-white/10" title="Tela cheia (F)">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Reader Content */}
      <main
        className={cn("pt-16 md:pt-20 min-h-screen transition-colors duration-300", themeStyles.bg)}
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isNovel ? (
          <div
            className={cn("max-w-3xl mx-auto px-6 py-8", themeStyles.text, getFontClass())}
            style={{ fontSize: `${fontSize}px`, lineHeight }}
          >
            <div
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: novelContent
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
                  .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-3">$1</h2>')
                  .replace(/^> (.*?)$/gm, '<blockquote class="border-l-4 border-primary pl-4 italic my-4">$1</blockquote>')
                  .replace(/^---$/gm, '<hr class="my-6 border-border" />')
                  .replace(/^- (.*?)$/gm, '<li class="ml-4">$1</li>')
                  .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 list-decimal">$2</li>')
                  .replace(/\n/g, '<br />')
              }}
            />
          </div>
        ) : readingMode === "horizontal" ? (
          <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-4">
            {pages[currentPage] && (
              <img
                src={pages[currentPage]}
                alt={`Página ${currentPage + 1}`}
                className="max-h-[calc(100vh-6rem)] object-contain transition-all duration-300 rounded-md shadow-2xl"
                style={{ maxWidth: `${pageWidth}%` }}
                draggable={false}
              />
            )}
          </div>
        ) : (
          <div
            className={cn("flex flex-col items-center mx-auto transition-all duration-300", isGappedVertical && "gap-1")}
            style={{ maxWidth: `${pageWidth}%` }}
          >
            {pages.map((page, index) => (
              <img
                key={index}
                src={page}
                alt={`Página ${index + 1}`}
                className={cn("w-full h-auto block", isWebtoon ? "" : "")}
                loading={index < 3 ? "eager" : "lazy"}
                decoding={index < 3 ? "sync" : "async"}
                fetchPriority={index === 0 ? "high" : undefined}
                draggable={false}
              />
            ))}
          </div>
        )}

        {/* End of Chapter */}
        <div className="py-12 px-4 transition-colors duration-300">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-primary/15 border border-primary/25 rounded-full mb-3">
                <span className="text-primary font-bold text-sm">✓</span>
                <span className="font-medium text-sm">Capítulo {currentChapter} concluído</span>
              </div>
            </div>

            {/* Chapter reactions */}
            <div className={cn("rounded-2xl border p-5 backdrop-blur-md", themeStyles.panel)}>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>O que você achou deste capítulo?</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {REACTIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => pickReaction(r.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all text-sm",
                      reaction === r.key
                        ? "border-primary bg-primary/15 text-primary scale-105"
                        : "border-white/10 hover:border-primary/40 hover:bg-white/5"
                    )}
                    title={r.label}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-xs font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="lg" disabled={!hasPrevChapter}
                onClick={() => hasPrevChapter && navigate(`/read/${manga.id}/${currentChapter - 1}`)}
                className="flex-1 max-w-[180px] rounded-xl border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button size="lg" disabled={!hasNextChapter}
                onClick={() => hasNextChapter && navigate(`/read/${manga.id}/${currentChapter + 1}`)}
                className="flex-1 max-w-[180px] rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-bold hover:opacity-90 glow-primary">
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className={cn("rounded-2xl border p-5 backdrop-blur-md", themeStyles.panel)}>
              <PollsSection chapterId={chapterData.id} />
            </div>

            <div className={cn("rounded-2xl border p-5 backdrop-blur-md", themeStyles.panel)}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 rounded-xl bg-primary/20">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <span className="font-bold text-lg">Comentários</span>
              </div>
              <CommentsSection chapterId={chapterData.id} />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Nav */}
      {readingMode === "horizontal" && !isNovel ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 glass-strong rounded-2xl p-2 shadow-2xl">
            <Button variant="ghost" size="icon" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1 bg-white/5 rounded-lg min-w-[64px] text-center">
              <span className="text-sm font-bold text-primary">{currentPage + 1}</span>
              <span className="text-sm text-zinc-400"> / {totalPages}</span>
            </div>
            <Button variant="ghost" size="icon" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-9 w-9">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Floating chapter pager (vertical/webtoon modes) */
        <div className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300",
          headerVisible || scrollProgress > 70 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          <div className="flex items-center gap-1 glass-strong rounded-2xl p-1.5 shadow-2xl">
            <Button variant="ghost" size="icon" disabled={!hasPrevChapter}
              onClick={() => hasPrevChapter && navigate(`/read/${manga.id}/${currentChapter - 1}`)}
              className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-9 w-9" title="Capítulo anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/manga/${manga.id}`)} className="rounded-xl hover:bg-white/10 h-9 px-3 text-xs gap-1.5">
              <Home className="h-3.5 w-3.5" /> Cap. {currentChapter}
            </Button>
            <Button variant="ghost" size="icon" disabled={!hasNextChapter}
              onClick={() => hasNextChapter && navigate(`/read/${manga.id}/${currentChapter + 1}`)}
              className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-9 w-9" title="Próximo capítulo">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reader;
