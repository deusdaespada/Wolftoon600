import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTitle } from "@/hooks/useTitles";
import { useChapter, useChapters } from "@/hooks/useChapters";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Settings, ChevronDown,
  Download, MessageCircle, Minus, Plus, Crown, Lock, Maximize, Minimize, List, Columns,
  Moon, Sun, BookOpen, Home, Layers, Zap, Play, Pause, Search, X,
  ZoomIn, ZoomOut, RotateCcw, Eye, ImageIcon,
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

const AUTO_SCROLL_SPEEDS = [
  { label: "Devagar", px: 0.4 },
  { label: "Normal", px: 0.9 },
  { label: "Rápido", px: 1.8 },
  { label: "Veloz", px: 3.0 },
];

// Preload images helper
function preloadImages(urls: string[]) {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

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

  // Preferences (persisted)
  const [pageWidth, setPageWidth] = useState<number>(() => Number(localStorage.getItem("reader.pageWidth")) || 100);
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => (localStorage.getItem("reader.mode") as ReadingMode) || "vertical");
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("reader.theme") as ThemeMode) || "dark");
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem("reader.fontSize")) || 18);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">(() => (localStorage.getItem("reader.fontFamily") as any) || "sans");
  const [lineHeight, setLineHeight] = useState<number>(() => Number(localStorage.getItem("reader.lineHeight")) || 1.8);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(() => Number(localStorage.getItem("reader.autoScrollSpeed")) || 1);

  // UI state
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [chapterSearch, setChapterSearch] = useState("");
  const [visiblePage, setVisiblePage] = useState(0); // tracked via IntersectionObserver
  const [pageTransition, setPageTransition] = useState<"idle" | "left" | "right">("idle");
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastScrollY = useRef(0);
  const autoScrollRef = useRef<number | null>(null);
  const pageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const rawPages = chapterData?.images || [];
  const totalPages = rawPages.length;
  const isNovel = chapterData?.content_type === 'novel';
  const novelContent = chapterData?.content || '';
  const pages = rawPages;

  // Preload next few images whenever page changes
  useEffect(() => {
    if (pages.length === 0) return;
    const toPreload = pages.slice(currentPage + 1, currentPage + 4);
    preloadImages(toPreload);
  }, [currentPage, pages]);

  // Persist preferences
  useEffect(() => { localStorage.setItem("reader.pageWidth", String(pageWidth)); }, [pageWidth]);
  useEffect(() => { localStorage.setItem("reader.mode", readingMode); }, [readingMode]);
  useEffect(() => { localStorage.setItem("reader.theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("reader.fontSize", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader.fontFamily", fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem("reader.lineHeight", String(lineHeight)); }, [lineHeight]);
  useEffect(() => { localStorage.setItem("reader.autoScrollSpeed", String(autoScrollSpeed)); }, [autoScrollSpeed]);

  // Load saved reaction
  useEffect(() => {
    if (chapterData?.id) {
      setReaction(localStorage.getItem(`reaction_${chapterData.id}`));
    }
  }, [chapterData?.id]);

  // Restore scroll position per chapter
  useEffect(() => {
    if (!chapterData?.id) return;
    const saved = sessionStorage.getItem(`scroll_${chapterData.id}`);
    if (saved) {
      setTimeout(() => window.scrollTo({ top: Number(saved) }), 100);
    } else {
      window.scrollTo({ top: 0 });
    }
    setCurrentPage(0);
    setZoom(1);
    return () => {
      sessionStorage.setItem(`scroll_${chapterData.id}`, String(window.scrollY));
    };
  }, [chapterData?.id]);

  // IntersectionObserver to track visible page in vertical/webtoon
  useEffect(() => {
    if (readingMode === "horizontal" || isNovel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = pageRefs.current.indexOf(entry.target as HTMLImageElement);
            if (idx !== -1) setVisiblePage(idx);
          }
        });
      },
      { threshold: 0.4 }
    );
    pageRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [pages, readingMode, isNovel]);

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

  // Auto-scroll engine
  useEffect(() => {
    if (!isAutoScrolling) {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
      return;
    }
    const speed = AUTO_SCROLL_SPEEDS[autoScrollSpeed]?.px ?? 0.9;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      window.scrollBy(0, speed * delta * 0.05);
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      if (atBottom) setIsAutoScrolling(false);
      else autoScrollRef.current = requestAnimationFrame(tick);
    };
    autoScrollRef.current = requestAnimationFrame(tick);
    return () => { if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current); };
  }, [isAutoScrolling, autoScrollSpeed]);

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

  // Navigate with animation
  const goToPage = useCallback((dir: "next" | "prev") => {
    if (dir === "next" && currentPage < totalPages - 1) {
      setPageTransition("left");
      setTimeout(() => { setCurrentPage(p => p + 1); setPageTransition("idle"); }, 180);
    } else if (dir === "prev" && currentPage > 0) {
      setPageTransition("right");
      setTimeout(() => { setCurrentPage(p => p - 1); setPageTransition("idle"); }, 180);
    }
  }, [currentPage, totalPages]);

  // Tap zones (horizontal mode)
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (readingMode !== "horizontal" || isNovel) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) goToPage("prev");
    else if (x > third * 2) goToPage("next");
  }, [readingMode, isNovel, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (readingMode === "horizontal" && !isNovel) {
        if (e.key === "ArrowRight") { e.preventDefault(); goToPage("next"); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); goToPage("prev"); }
      }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setTheme(prev => prev === "dark" ? "amoled" : prev === "amoled" ? "light" : prev === "light" ? "sepia" : "dark");
      }
      if (e.key === " ") {
        if (readingMode !== "horizontal") { e.preventDefault(); setIsAutoScrolling(p => !p); }
      }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(p => Math.min(3, p + 0.25)); }
      if (e.key === "-") { e.preventDefault(); setZoom(p => Math.max(0.5, p - 0.25)); }
      if (e.key === "0") { e.preventDefault(); setZoom(1); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, isNovel, goToPage, toggleFullscreen]);

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
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (readingMode !== "horizontal") return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) goToPage("next");
      else goToPage("prev");
    }
  }, [readingMode, goToPage]);

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
        if (i % 5 === 0) toast.info(`Baixando... ${Math.round((i / rawPages.length) * 100)}%`);
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
      case "light": return {
        bg: "bg-gray-100", text: "text-gray-900",
        panel: "bg-white/90 border-gray-200/80 shadow-lg",
        muted: "text-gray-500", header: "bg-white/80 border-gray-200/60",
        progressTrack: "bg-gray-200",
      };
      case "sepia": return {
        bg: "bg-[#f0e6cc]", text: "text-amber-950",
        panel: "bg-amber-50/90 border-amber-200/70 shadow-lg",
        muted: "text-amber-700", header: "bg-amber-50/80 border-amber-200/50",
        progressTrack: "bg-amber-200",
      };
      case "amoled": return {
        bg: "bg-black", text: "text-zinc-100",
        panel: "bg-zinc-950/90 border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
        muted: "text-zinc-500", header: "bg-zinc-950/80 border-white/5",
        progressTrack: "bg-zinc-900",
      };
      default: return {
        bg: "bg-[#05070D]", text: "text-zinc-100",
        panel: "bg-[#0B1220]/80 border-white/8 shadow-[0_4px_32px_rgba(0,0,0,0.4)]",
        muted: "text-zinc-400", header: "bg-[#0B1220]/70 border-white/8",
        progressTrack: "bg-white/5",
      };
    }
  })();

  const getFontClass = () => fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "font-sans";

  const filteredChapters = (allChapters || [])
    .filter(ch => chapterSearch === "" || String(ch.chapter_number).includes(chapterSearch) || ch.chapter_title?.toLowerCase().includes(chapterSearch.toLowerCase()))
    .sort((a, b) => b.chapter_number - a.chapter_number);

  // --- Loading ---
  if (mangaLoading || chapterLoading) {
    return (
      <div className="min-h-screen bg-[#05070D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-300 font-medium">Carregando capítulo</p>
            <p className="text-xs text-zinc-600 mt-0.5">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!manga || !chapterData) {
    return (
      <div className="min-h-screen bg-[#05070D] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl mb-2">📚</div>
          <h1 className="text-2xl font-bold text-white">Capítulo não encontrado</h1>
          <p className="text-zinc-400 text-sm">Este capítulo pode ter sido removido ou não existe.</p>
          <Button asChild className="mt-2"><Link to="/catalog">Voltar ao Catálogo</Link></Button>
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

  const isGappedVertical = readingMode === "vertical";
  const isWebtoon = readingMode === "webtoon";
  const displayPage = readingMode === "horizontal" ? currentPage : visiblePage;

  return (
    <div className={cn("min-h-screen transition-colors duration-300", themeStyles.bg, themeStyles.text)}>

      {/* Top progress bar — thicker, with glow */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none" style={{ background: "transparent" }}>
        <div
          className="h-full transition-[width] duration-200"
          style={{
            width: `${scrollProgress}%`,
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
            boxShadow: "0 0 12px hsl(var(--primary) / 0.8), 0 0 4px hsl(var(--primary))",
          }}
        />
      </div>

      {/* Floating Glass Header */}
      <header
        className={cn(
          "fixed top-2 left-2 right-2 md:left-4 md:right-4 z-50 rounded-2xl border backdrop-blur-xl transition-all duration-300",
          themeStyles.header,
          "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"
        )}
      >
        <div className="flex h-12 md:h-13 items-center justify-between px-2 md:px-3 gap-2">
          {/* Left: back + title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost" size="icon"
              onClick={() => navigate(`/manga/${manga.id}`)}
              className="h-8 w-8 shrink-0 rounded-xl hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-[13px] font-semibold truncate leading-tight">{manga.title}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("text-[11px] leading-tight truncate", themeStyles.muted)}>
                  Cap. {currentChapter}{chapterData.chapter_title && ` — ${chapterData.chapter_title}`}
                </span>
                {!isNovel && totalPages > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-mono", themeStyles.progressTrack, themeStyles.muted)}>
                    {displayPage + 1}/{totalPages}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-0.5 shrink-0">

            {/* Chapter selector with search */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 rounded-xl hover:bg-white/10 gap-0.5">
                  <BookOpen className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-68 glass-strong border-white/10" align="end">
                {/* Search box */}
                <div className="p-2 pb-1">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <input
                      autoFocus
                      value={chapterSearch}
                      onChange={e => setChapterSearch(e.target.value)}
                      placeholder="Buscar capítulo..."
                      className="bg-transparent text-sm outline-none flex-1 text-zinc-200 placeholder:text-zinc-600 w-full"
                    />
                    {chapterSearch && (
                      <button onClick={() => setChapterSearch("")}>
                        <X className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {filteredChapters.length === 0 && (
                    <div className="text-center py-4 text-xs text-zinc-500">Nenhum resultado</div>
                  )}
                  {filteredChapters.map((ch) => (
                    <DropdownMenuItem
                      key={ch.id}
                      className={cn(
                        "cursor-pointer text-[13px] rounded-lg mx-1 gap-2",
                        ch.chapter_number === currentChapter && "bg-primary/20 text-primary font-medium"
                      )}
                      onClick={() => { navigate(`/read/${manga.id}/${ch.chapter_number}`); setChapterSearch(""); }}
                    >
                      <span className="font-mono text-[11px] opacity-50 w-8 shrink-0">
                        {ch.chapter_number}
                      </span>
                      <span className="truncate">{ch.chapter_title || `Capítulo ${ch.chapter_number}`}</span>
                      {ch.chapter_number === currentChapter && (
                        <Eye className="h-3 w-3 ml-auto shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Thumbnails panel (manga only) */}
            {!isNovel && totalPages > 0 && (
              <Button
                variant="ghost" size="icon"
                onClick={() => setThumbnailsOpen(p => !p)}
                className={cn("h-8 w-8 rounded-xl hover:bg-white/10", thumbnailsOpen && "bg-primary/20 text-primary")}
                title="Miniaturas"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}

            {/* Auto-scroll toggle (vertical/webtoon only) */}
            {!isNovel && readingMode !== "horizontal" && (
              <Button
                variant="ghost" size="icon"
                onClick={() => setIsAutoScrolling(p => !p)}
                className={cn("h-8 w-8 rounded-xl hover:bg-white/10", isAutoScrolling && "bg-primary/20 text-primary")}
                title={isAutoScrolling ? "Parar auto-scroll (Espaço)" : "Auto-scroll (Espaço)"}
              >
                {isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}

            {/* Zoom controls (horizontal mode) */}
            {readingMode === "horizontal" && !isNovel && (
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => setZoom(p => Math.max(0.5, p - 0.25))} className="h-8 w-8 rounded-xl hover:bg-white/10" disabled={zoom <= 0.5}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <button onClick={() => setZoom(1)} className={cn("text-[11px] font-mono w-10 text-center hover:text-primary transition-colors", themeStyles.muted)}>
                  {Math.round(zoom * 100)}%
                </button>
                <Button variant="ghost" size="icon" onClick={() => setZoom(p => Math.min(3, p + 0.25))} className="h-8 w-8 rounded-xl hover:bg-white/10" disabled={zoom >= 3}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Theme cycle */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setTheme(p => p === "dark" ? "amoled" : p === "amoled" ? "light" : p === "light" ? "sepia" : "dark")}
              className="h-8 w-8 rounded-xl hover:bg-white/10"
              title="Tema (N)"
            >
              {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "amoled" ? <Zap className="h-4 w-4" /> : theme === "sepia" ? <BookOpen className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Settings sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0B1220] border-white/10 text-white w-[88vw] sm:w-96 overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-white/8">
                  <SheetTitle className="text-white flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4 text-primary" /> Configurações
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-5 space-y-6">
                  {/* Reading mode */}
                  {!isNovel && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Modo de Leitura</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: "webtoon" as const, label: "Webtoon", icon: Layers, desc: "Contínuo" },
                          { key: "vertical" as const, label: "Vertical", icon: List, desc: "Com espaço" },
                          { key: "horizontal" as const, label: "Página", icon: Columns, desc: "Uma a uma" },
                        ]).map((m) => (
                          <button
                            key={m.key}
                            onClick={() => setReadingMode(m.key)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                              readingMode === m.key
                                ? "border-primary bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                                : "border-white/10 hover:border-white/20 text-zinc-400"
                            )}
                          >
                            <m.icon className="h-4 w-4" />
                            <span className="text-[11px] font-semibold">{m.label}</span>
                            <span className="text-[9px] text-zinc-600">{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Page width */}
                  {!isNovel && (
                    <div className="space-y-2.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                        Largura da Página
                        <span className="text-primary font-bold normal-case text-sm">{pageWidth}%</span>
                      </label>
                      <Slider value={[pageWidth]} onValueChange={(v) => setPageWidth(v[0])} min={40} max={100} step={5} className="py-1" />
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>40%</span><span>70%</span><span>100%</span>
                      </div>
                    </div>
                  )}

                  {/* Auto-scroll speed */}
                  {!isNovel && readingMode !== "horizontal" && (
                    <div className="space-y-2.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                        Velocidade de Auto-Scroll
                        <span className="text-primary font-bold normal-case text-sm">{AUTO_SCROLL_SPEEDS[autoScrollSpeed]?.label}</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {AUTO_SCROLL_SPEEDS.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setAutoScrollSpeed(i)}
                            className={cn(
                              "py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                              autoScrollSpeed === i
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-white/10 text-zinc-500 hover:border-white/20"
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Novel settings */}
                  {isNovel && (
                    <>
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                          Tamanho da Fonte<span className="text-primary font-bold normal-case text-sm">{fontSize}px</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => setFontSize(p => Math.max(12, p - 2))} className="border-white/10 bg-white/5 hover:bg-white/10 h-8 w-8 shrink-0"><Minus className="h-4 w-4" /></Button>
                          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={12} max={32} step={1} className="flex-1" />
                          <Button variant="outline" size="icon" onClick={() => setFontSize(p => Math.min(32, p + 2))} className="border-white/10 bg-white/5 hover:bg-white/10 h-8 w-8 shrink-0"><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fonte</label>
                        <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as any)}>
                          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#0B1220] border-white/10">
                            <SelectItem value="sans">Sans-serif</SelectItem>
                            <SelectItem value="serif">Serif</SelectItem>
                            <SelectItem value="mono">Monospace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                          Espaçamento<span className="text-primary font-bold normal-case text-sm">{lineHeight.toFixed(1)}×</span>
                        </label>
                        <Slider value={[lineHeight]} onValueChange={(v) => setLineHeight(v[0])} min={1.2} max={2.5} step={0.1} className="py-1" />
                      </div>
                    </>
                  )}

                  {/* Theme */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tema</label>
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
                            theme === t.key ? "border-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.2)]" : "border-white/10 hover:border-white/20"
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

                  {/* Download */}
                  {!isNovel && (
                    <div className="pt-2 border-t border-white/8">
                      <Button
                        variant="outline"
                        className="w-full border-white/10 bg-white/5 hover:bg-white/10 gap-2"
                        onClick={handleDownload}
                        disabled={isDownloading}
                      >
                        <Download className="h-4 w-4" />
                        {isDownloading ? "Baixando..." : `Baixar Capítulo (${totalPages} pgs)`}
                      </Button>
                    </div>
                  )}

                  {/* Shortcuts */}
                  <div className="pt-2 border-t border-white/8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Atalhos</p>
                    <div className="space-y-2 text-[11px]">
                      {[
                        ["Navegar páginas", "← →"],
                        ["Tela cheia", "F"],
                        ["Alternar tema", "N"],
                        ["Auto-scroll", "Espaço"],
                        ["Zoom +/−", "+ / −"],
                        ["Zoom reset", "0"],
                        ["Tap zona esq/dir", "← / →"],
                      ].map(([action, key]) => (
                        <div key={action} className="flex items-center justify-between text-zinc-500">
                          <span>{action}</span>
                          <kbd className="px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-zinc-400 font-mono">{key}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Fullscreen */}
            <Button
              variant="ghost" size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 rounded-xl hover:bg-white/10"
              title="Tela cheia (F)"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Thumbnails sidebar */}
      {thumbnailsOpen && !isNovel && (
        <div className="fixed right-0 top-0 bottom-0 z-40 w-24 bg-black/90 backdrop-blur-xl border-l border-white/8 overflow-y-auto pt-16 pb-4 flex flex-col gap-1 px-1.5">
          {pages.map((page, i) => (
            <button
              key={i}
              onClick={() => {
                if (readingMode === "horizontal") {
                  setCurrentPage(i);
                } else {
                  pageRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className={cn(
                "relative rounded overflow-hidden border-2 transition-all shrink-0",
                (readingMode === "horizontal" ? currentPage : visiblePage) === i
                  ? "border-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                  : "border-transparent opacity-50 hover:opacity-80"
              )}
            >
              <img src={page} alt={`Pág ${i + 1}`} className="w-full h-auto block" loading="lazy" />
              <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-black/70 text-white py-0.5 font-mono">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Reader Content */}
      <main
        className={cn(
          "pt-16 md:pt-[3.75rem] min-h-screen transition-colors duration-300",
          themeStyles.bg,
          thumbnailsOpen && !isNovel ? "pr-24" : ""
        )}
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {isNovel ? (
          <div
            className={cn("max-w-3xl mx-auto px-6 py-10", themeStyles.text, getFontClass())}
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
                  .replace(/^> (.*?)$/gm, '<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-zinc-400">$1</blockquote>')
                  .replace(/^---$/gm, '<hr class="my-8 border-white/10" />')
                  .replace(/^- (.*?)$/gm, '<li class="ml-4">$1</li>')
                  .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 list-decimal">$2</li>')
                  .replace(/\n/g, '<br />')
              }}
            />
          </div>
        ) : readingMode === "horizontal" ? (
          <div
            className="min-h-[calc(100vh-3.75rem)] flex items-center justify-center px-4 py-4 select-none"
            style={{ cursor: "pointer" }}
          >
            {/* Tap zone hint overlays */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex flex-col items-center gap-1 text-white/20">
                <ChevronLeft className="h-8 w-8" />
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 w-1/3 z-10 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex flex-col items-center gap-1 text-white/20">
                <ChevronRight className="h-8 w-8" />
              </div>
            </div>

            {pages[currentPage] && !imageErrors.has(currentPage) ? (
              <img
                key={currentPage}
                src={pages[currentPage]}
                alt={`Página ${currentPage + 1}`}
                className={cn(
                  "max-h-[calc(100vh-5rem)] object-contain rounded-md shadow-2xl select-none",
                  "transition-[opacity,transform] duration-180",
                  pageTransition === "left" ? "opacity-0 -translate-x-4" :
                  pageTransition === "right" ? "opacity-0 translate-x-4" :
                  "opacity-100 translate-x-0"
                )}
                style={{
                  maxWidth: `${pageWidth}%`,
                  transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                  transformOrigin: "center center",
                }}
                draggable={false}
                onError={() => setImageErrors(prev => new Set(prev).add(currentPage))}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-600">
                <ImageIcon className="h-12 w-12" />
                <p className="text-sm">Falha ao carregar imagem</p>
                <Button variant="outline" size="sm" onClick={() => setImageErrors(prev => { const n = new Set(prev); n.delete(currentPage); return n; })}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center mx-auto transition-all duration-300",
              isGappedVertical && "gap-1.5"
            )}
            style={{ maxWidth: `${pageWidth}%` }}
          >
            {pages.map((page, index) => (
              <div key={index} className="relative w-full">
                {imageErrors.has(index) ? (
                  <div className="w-full h-48 flex flex-col items-center justify-center gap-2 text-zinc-600 bg-white/5 border border-white/8">
                    <ImageIcon className="h-8 w-8" />
                    <p className="text-xs">Página {index + 1} — Falha ao carregar</p>
                    <button
                      onClick={() => setImageErrors(prev => { const n = new Set(prev); n.delete(index); return n; })}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Tentar novamente
                    </button>
                  </div>
                ) : (
                  <img
                    ref={el => { pageRefs.current[index] = el; }}
                    src={page}
                    alt={`Página ${index + 1}`}
                    className="w-full h-auto block"
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding={index < 3 ? "sync" : "async"}
                    fetchPriority={index === 0 ? "high" : undefined}
                    draggable={false}
                    onError={() => setImageErrors(prev => new Set(prev).add(index))}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* End of chapter */}
        <div className="py-14 px-4 transition-colors duration-300">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Completion badge */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <span className="text-primary text-sm">✓</span>
                <span className="font-semibold text-sm">Capítulo {currentChapter} concluído</span>
              </div>
            </div>

            {/* Reactions */}
            <div className={cn("rounded-2xl border p-5 backdrop-blur-md", themeStyles.panel)}>
              <p className="text-sm font-semibold mb-3">O que você achou deste capítulo?</p>
              <div className="flex flex-wrap gap-2">
                {REACTIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => pickReaction(r.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all",
                      reaction === r.key
                        ? "border-primary bg-primary/15 text-primary scale-105 shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    )}
                    title={r.label}
                  >
                    <span className="text-base">{r.emoji}</span>
                    <span className="text-xs font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chapter nav */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline" size="lg" disabled={!hasPrevChapter}
                onClick={() => hasPrevChapter && navigate(`/read/${manga.id}/${currentChapter - 1}`)}
                className="flex-1 max-w-[180px] rounded-xl border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                size="lg" disabled={!hasNextChapter}
                onClick={() => hasNextChapter && navigate(`/read/${manga.id}/${currentChapter + 1}`)}
                className="flex-1 max-w-[180px] rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-bold hover:opacity-90 glow-primary gap-1"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Polls */}
            <div className={cn("rounded-2xl border p-5 backdrop-blur-md", themeStyles.panel)}>
              <PollsSection chapterId={chapterData.id} />
            </div>

            {/* Comments */}
            <div className={cn("rounded-2xl border p-5 backdrop-blur-md", themeStyles.panel)}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 rounded-xl bg-primary/15">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <span className="font-bold">Comentários</span>
              </div>
              <CommentsSection chapterId={chapterData.id} />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Nav */}
      {readingMode === "horizontal" && !isNovel ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-white/10 pointer-events-auto">
            {/* Prev chapter */}
            <Button variant="ghost" size="icon" disabled={!hasPrevChapter}
              onClick={() => hasPrevChapter && navigate(`/read/${manga.id}/${currentChapter - 1}`)}
              className="rounded-xl hover:bg-white/10 disabled:opacity-20 h-8 w-8" title="Capítulo anterior">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-5 bg-white/10" />

            {/* Page prev */}
            <Button variant="ghost" size="icon" disabled={currentPage === 0}
              onClick={() => goToPage("prev")}
              className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page counter — clickable to open thumbnails */}
            <button
              onClick={() => setThumbnailsOpen(p => !p)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg min-w-[64px] text-center transition-colors"
            >
              <span className="text-sm font-bold text-primary">{currentPage + 1}</span>
              <span className="text-xs text-zinc-500"> / {totalPages}</span>
            </button>

            {/* Page next */}
            <Button variant="ghost" size="icon" disabled={currentPage >= totalPages - 1}
              onClick={() => goToPage("next")}
              className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-white/10" />

            {/* Next chapter */}
            <Button variant="ghost" size="icon" disabled={!hasNextChapter}
              onClick={() => hasNextChapter && navigate(`/read/${manga.id}/${currentChapter + 1}`)}
              className="rounded-xl hover:bg-white/10 disabled:opacity-20 h-8 w-8" title="Próximo capítulo">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* Vertical / webtoon bottom nav */
        <div className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300",
          headerVisible || scrollProgress > 70 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl border border-white/10">
            <Button variant="ghost" size="icon" disabled={!hasPrevChapter}
              onClick={() => hasPrevChapter && navigate(`/read/${manga.id}/${currentChapter - 1}`)}
              className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-8 w-8" title="Capítulo anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={() => navigate(`/manga/${manga.id}`)}
              className="rounded-xl hover:bg-white/10 h-8 px-3 text-xs gap-1.5 flex items-center text-zinc-300 hover:text-white transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Cap. {currentChapter}</span>
              {!isNovel && totalPages > 0 && (
                <span className="text-zinc-600 font-mono">
                  · {visiblePage + 1}/{totalPages}
                </span>
              )}
            </button>
            <Button variant="ghost" size="icon" disabled={!hasNextChapter}
              onClick={() => hasNextChapter && navigate(`/read/${manga.id}/${currentChapter + 1}`)}
              className="rounded-xl hover:bg-white/10 disabled:opacity-30 h-8 w-8" title="Próximo capítulo">
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Auto-scroll quick toggle in bottom bar */}
            {!isNovel && (
              <>
                <div className="w-px h-5 bg-white/10 mx-0.5" />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setIsAutoScrolling(p => !p)}
                  className={cn("rounded-xl h-8 w-8", isAutoScrolling ? "text-primary bg-primary/15" : "hover:bg-white/10")}
                  title={isAutoScrolling ? "Parar" : "Auto-scroll"}
                >
                  {isAutoScrolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reader;
