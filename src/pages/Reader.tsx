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
type FontFamilyMode = "sans" | "serif" | "mono";

interface ChapterExtended {
  id: string;
  images?: string[];
  content_type?: "novel" | "manga";
  content?: string;
  is_vip?: boolean;
  vip_unlock_at?: string;
  chapter_title?: string;
}

const REACTIONS = [
  { key: "fire", emoji: "🔥", label: "Incrível" },
  { key: "heart", emoji: "❤️", label: "Amei" },
  { key: "laugh", emoji: "😂", label: "Engraçado" },
  { key: "shock", emoji: "😱", label: "Chocante" },
  { key: "cry", emoji: "😭", label: "Emocionante" },
  { key: "think", emoji: "🤔", label: "Intrigante" },
];

const Reader = () => {
  const { id, chapter } = useParams<{ id: string; chapter: string }>();
  const navigate = useNavigate();
  const { user, isVip } = useAuth();

  const { data: manga, isLoading: mangaLoading } = useTitle(id || "");
  const { data: chapterDataRaw, isLoading: chapterLoading } = useChapter(id || "", parseInt(chapter ?? "0"));
  const { data: allChapters } = useChapters(id || "");
  const { updateProgress } = useReadingProgress();
  const { addToHistory } = useReadingHistory();

  const chapterData = chapterDataRaw as ChapterExtended | undefined;
  const currentChapter = parseInt(chapter ?? "0");

  const [pageWidth, setPageWidth] = useState<number>(() => Number(localStorage.getItem("reader.pageWidth")) || 100);
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => (localStorage.getItem("reader.mode") as ReadingMode) || "vertical");
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("reader.theme") as ThemeMode) || "dark");
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem("reader.fontSize")) || 18);
  const [fontFamily, setFontFamily] = useState<FontFamilyMode>(() => (localStorage.getItem("reader.fontFamily") as FontFamilyMode) || "sans");
  const [lineHeight, setLineHeight] = useState<number>(() => Number(localStorage.getItem("reader.lineHeight")) || 1.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  const pages = chapterData?.images || [];
  const totalPages = pages.length;
  const isNovel = chapterData?.content_type === "novel";
  const novelContent = chapterData?.content || "";

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

  // Fullscreen Management
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Performance-optimized scrolling handler
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollTicking.current) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          setScrollProgress(max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0);
          
          if (Math.abs(y - lastScrollY.current) > 8) {
            setHeaderVisible(y < lastScrollY.current || y < 80);
            lastScrollY.current = y;
          }
          scrollTicking.current = false;
        });
        scrollTicking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readingMode, isNovel, currentPage, totalPages, toggleFullscreen]);

  // Reading progress tracking
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
  }, [user, manga, chapterData, currentPage, readingMode, updateProgress, addToHistory]);

  useEffect(() => {
    if (manga && chapter) localStorage.setItem(`reading_${manga.id}`, chapter);
  }, [manga, chapter]);

  useEffect(() => { setCurrentPage(0); window.scrollTo({ top: 0 }); }, [chapter]);

  // Auto-reload when VIP unlock timeframe finishes
  useEffect(() => {
    const unlockAt = chapterData?.vip_unlock_at;
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
    if (pages.length === 0) return;
    setIsDownloading(true);
    toast.info("Preparando download...");
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${manga?.title || "manga"}_cap${currentChapter}`);
      for (let i = 0; i < pages.length; i++) {
        const response = await fetch(pages[i]);
        const blob = await response.blob();
        const extension = blob.type.split("/")[1] || "jpg";
        folder?.file(`pagina_${String(i + 1).padStart(3, "0")}.${extension}`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${manga?.title || "manga"}_capitulo_${currentChapter}.zip`;
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

  // Sanitize and structure Markdown parsing for Novel content
  const renderNovelContent = (rawText: string) => {
    return rawText.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      
      if (trimmed.startsWith("# ")) {
        return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{trimmed.replace("# ", "")}</h1>;
      }
      if (trimmed.startsWith("## ")) {
        return <h2 key={i} className="text-xl font-semibold mt-4 mb-3">{trimmed.replace("## ", "")}</h2>;
      }
      if (trimmed.startsWith("> ")) {
        return <blockquote key={i} className="border-l-4 border-primary pl-4 italic my-4">{trimmed.replace("> ", "")}</blockquote>;
      }
      if (trimmed === "---") {
        return <hr key={i} className="my-6 border-border" />;
      }
      if (trimmed.startsWith("- ")) {
        return <li key={i} className="ml-4 list-disc">{trimmed.replace("- ", "")}</li>;
      }

      return (
        <p key={i} className="mb-4 leading-relaxed">
          {trimmed.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, index) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("*") && part.endsWith("*")) {
              return <em key={index}>{part.slice(1, -1)}</em>;
            }
            return part;
          })}
        </p>
      );
    });
  };

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

  const unlockAt = chapterData.vip_unlock_at;
  const unlockMs = unlockAt ? new Date(unlockAt).getTime() : null;
  const autoUnlocked = !!(unlockMs && unlockMs <= Date.now());
  const isVipChapter = chapterData.is_vip && !autoUnlocked;

  if (isVipChapter && !isVip) {
    const willUnlockSoon = !!unlockMs && unlockMs > Date.now();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, hsl(45 96% 56% / 0.25), transparent 60%)" }} />
        <div className="text-center max-w-md mx-auto relative glass-strong rounded-3xl
