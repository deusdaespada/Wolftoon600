import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useTitle } from "@/hooks/useTitles";
import { useChapters } from "@/hooks/useChapters";
import { useIncrementViews } from "@/hooks/useIncrementViews";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useReadingStatus, STATUS_CONFIG, ReadingStatus } from "@/hooks/useReadingStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import CommentsSection from "@/components/CommentsSection";
import RatingSection from "@/components/RatingSection";
import VipCountdown from "@/components/VipCountdown";
import {
  BookOpen, Star, Heart, Share2, Play, Crown,
  BookMarked, CheckCircle, Pause, Trash2, ListPlus,
  Upload, Layers, Pencil, Flag, Search, ArrowUpDown,
  AlignLeft, MessageSquare, Calendar, Clock, Eye,
  ChevronDown, ChevronUp, LayoutGrid, LayoutList,
  Bell, BellOff, TrendingUp, Zap, Award, Users,
  ExternalLink, Copy, Twitter, Facebook, X,
} from "lucide-react";

/* ─────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────── */
type Tab = 'chapters' | 'synopsis' | 'reviews';
type ChapterView = 'list' | 'grid';

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'Em Andamento',
  Em_andamento: 'Em Andamento',
  completed: 'Completo',
  hiatus: 'Hiatus',
  cancelled: 'Cancelado',
};
const STATUS_STYLE: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  ongoing:     { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  Em_andamento:{ dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  completed:   { dot: 'bg-sky-400',     text: 'text-sky-300',     bg: 'bg-sky-500/10',     border: 'border-sky-500/25'     },
  hiatus:      { dot: 'bg-amber-400',   text: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25'   },
  cancelled:   { dot: 'bg-red-400',     text: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/25'     },
};

const REACTIONS = [
  { key: 'like',  emoji: '👍', label: 'Curtir'  },
  { key: 'love',  emoji: '❤️', label: 'Amar'    },
  { key: 'laugh', emoji: '😂', label: 'Rir'     },
  { key: 'wow',   emoji: '😮', label: 'Uau'     },
  { key: 'sad',   emoji: '😢', label: 'Triste'  },
  { key: 'angry', emoji: '😡', label: 'Raiva'   },
];

const CHAPTERS_PER_PAGE = 30;

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const MangaDetails = () => {
  const { slug } = useParams();
  const { data: manga, isLoading } = useTitle(slug || "");
  const { data: chapters } = useChapters(manga?.id || "");
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { getProgressForTitle } = useReadingProgress();
  const { status: readingStatus, updateStatus, isInList } = useReadingStatus(manga?.id);

  /* UI state */
  const [tab, setTab]                         = useState<Tab>('chapters');
  const [chapterView, setChapterView]         = useState<ChapterView>('list');
  const [chapterQuery, setChapterQuery]       = useState('');
  const [sortDesc, setSortDesc]               = useState(true);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [visibleCount, setVisibleCount]       = useState(CHAPTERS_PER_PAGE);
  const [readChapters, setReadChapters]       = useState<Set<string>>(new Set());
  const [notifyEnabled, setNotifyEnabled]     = useState(false);
  const [shareOpen, setShareOpen]             = useState(false);
  const [reportOpen, setReportOpen]           = useState(false);
  const [reportType, setReportType]           = useState('broken_chapter');
  const [reportMessage, setReportMessage]     = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reactions, setReactions]             = useState<Record<string, number>>({ like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 });
  const [myReaction, setMyReaction]           = useState<string | null>(null);
  const [heroVisible, setHeroVisible]         = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  /* Derived */
  const isFavorite       = favorites?.includes(manga?.id || "") ?? false;
  const readingProgress  = getProgressForTitle(manga?.id || "");
  const continueChapter  = readingProgress?.chapter?.chapter_number || 1;
  const totalChapters    = chapters?.length || 0;
  const readCount        = readChapters.size;
  const readPercent      = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;

  useIncrementViews(manga?.id);

  /* Hero entrance animation */
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Infinite scroll */
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount(c => c + CHAPTERS_PER_PAGE);
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab]);

  const statusIcons: Record<ReadingStatus, React.ReactNode> = {
    reading:   <BookOpen   className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    planning:  <BookMarked  className="h-4 w-4" />,
    dropped:   <Trash2      className="h-4 w-4" />,
    on_hold:   <Pause       className="h-4 w-4" />,
  };

  const filteredChapters = useMemo(() => {
    let list = chapters || [];
    if (chapterQuery.trim()) {
      const q = chapterQuery.toLowerCase();
      list = list.filter(c =>
        String(c.chapter_number).includes(q) ||
        (c.chapter_title || '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) =>
      sortDesc ? b.chapter_number - a.chapter_number : a.chapter_number - b.chapter_number,
    );
  }, [chapters, chapterQuery, sortDesc]);

  const visibleChapters = filteredChapters.slice(0, visibleCount);

  /* Handlers */
  const handleReaction = (key: string) => {
    if (!user) { toast({ title: "Login necessário", variant: "destructive" }); return; }
    setReactions(prev => {
      const next = { ...prev };
      if (myReaction === key) { next[key] = Math.max(0, (next[key] || 0) - 1); setMyReaction(null); }
      else {
        if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 0) - 1);
        next[key] = (next[key] || 0) + 1;
        setMyReaction(key);
      }
      return next;
    });
  };

  const toggleReadChapter = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setReadChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markAllRead = () => {
    if (!chapters) return;
    setReadChapters(new Set(chapters.map(c => c.id)));
    toast({ title: "Todos os capítulos marcados como lidos!" });
  };

  const handleShare = async () => {
    try { await navigator.share({ title: manga!.title, url: window.location.href }); }
    catch { setShareOpen(true); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copiado!" });
  };

  /* ── Loading ── */
  if (isLoading) return (
    <div className="min-h-screen bg-[#0c0c10]">
      <Header />
      <div className="animate-pulse">
        <div className="h-[480px] bg-white/5" />
        <div className="container mx-auto px-4 max-w-5xl py-8 space-y-4">
          <div className="h-8 w-64 bg-white/5 rounded-xl" />
          <div className="h-4 w-48 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );

  if (!manga) return (
    <div className="min-h-screen bg-[#0c0c10]">
      <Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-2xl font-black text-white mb-2">Título não encontrado</h1>
        <p className="text-white/40 mb-6">Essa obra não existe ou foi removida.</p>
        <Button asChild className="bg-rose-600 hover:bg-rose-700"><Link to="/catalog">Voltar ao Catálogo</Link></Button>
      </div>
    </div>
  );

  const fmtNum = (v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v);
  const rating = (manga.rating || 0).toFixed(1);
  const statusKey = (manga.status || 'ongoing') as string;
  const ss = STATUS_STYLE[statusKey] || STATUS_STYLE.ongoing;
  const synopsis = manga.synopsis || '';
  const synopsisShort = synopsis.length > 320 ? synopsis.slice(0, 320).trimEnd() + '…' : synopsis;

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white pb-20">
      <Header />

      {/* ══════════════════════════════════════════
          CINEMATIC HERO
      ══════════════════════════════════════════ */}
      <div ref={heroRef} className="relative w-full overflow-hidden">
        {/* Full-bleed background */}
        <div className="absolute inset-0 h-[560px]">
          <img
            src={manga.cover}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-top scale-110 blur-2xl opacity-20"
          />
          {/* Multi-layer gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c10] via-[#0c0c10]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c10]/30 via-transparent to-[#0c0c10]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c10] via-transparent to-transparent" />
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent,#0c0c10_100%)]" />
        </div>

        <div className={`relative container mx-auto px-4 max-w-5xl pt-10 pb-2 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col sm:flex-row gap-8 items-start">

            {/* ── POSTER with reading ring ── */}
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="relative w-[168px] sm:w-[200px]">
                {/* Progress ring (SVG) */}
                {readCount > 0 && (
                  <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none z-10" viewBox="0 0 100 133" fill="none">
                    <rect x="2" y="2" width="96" height="129" rx="10" stroke="white" strokeOpacity="0.06" strokeWidth="3" />
                    <rect
                      x="2" y="2" width="96" height="129" rx="10"
                      stroke="url(#ringGrad)" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${(readPercent / 100) * 450} 450`}
                      className="transition-all duration-700"
                    />
                    <defs>
                      <linearGradient id="ringGrad" x1="0" y1="0" x2="100" y2="133" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#f43f5e" />
                        <stop offset="1" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}

                <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-black ring-1 ring-white/10">
                  <img src={manga.cover} alt={manga.title} className="w-full h-full object-cover" />
                  {/* Type pill */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                    {manga.type}
                  </span>
                  {/* Progress overlay bottom */}
                  {readCount > 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
                      <div className="flex justify-between text-[10px] text-white/70 mb-1">
                        <span>{readCount}/{totalChapters} lidos</span>
                        <span>{readPercent}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${readPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Read progress % badge */}
                {readCount > 0 && (
                  <div className="absolute -top-2 -right-2 z-20 h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-[10px] font-black shadow-lg shadow-rose-500/30 border border-white/10">
                    {readPercent}%
                  </div>
                )}
              </div>

              {/* Desktop CTAs */}
              <div className="hidden sm:flex flex-col gap-2 mt-4 w-[168px] sm:w-[200px]">
                <Button asChild className="h-11 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 border-0">
                  <Link to={readingProgress ? `/read/${manga.id}/${continueChapter}` : `/read/${manga.id}/1`}>
                    <Play className="h-4 w-4 fill-current mr-2" />
                    {readingProgress ? `Continuar Cap. ${continueChapter}` : 'Ler Capítulo 1'}
                  </Link>
                </Button>

                <Button
                  className={`h-10 rounded-xl font-bold border transition-all ${
                    isFavorite
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => {
                    if (!user) { toast({ title: "Login necessário", variant: "destructive" }); return; }
                    toggleFavorite.mutate({ titleId: manga.id, isFavorite }, {
                      onSuccess: () => toast({ title: isFavorite ? "Removido dos favoritos" : "💖 Adicionado aos favoritos" }),
                    });
                  }}
                  disabled={toggleFavorite.isPending}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 font-semibold text-xs"
                    onClick={handleShare}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" />Compartilhar
                  </Button>
                  <Button
                    className={`h-9 rounded-xl border font-semibold text-xs transition-all ${
                      notifyEnabled
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => {
                      if (!user) { toast({ title: "Login necessário", variant: "destructive" }); return; }
                      setNotifyEnabled(p => !p);
                      toast({ title: notifyEnabled ? "Notificações desativadas" : "🔔 Você será notificado de novos capítulos!" });
                    }}
                  >
                    {notifyEnabled ? <Bell className="h-3.5 w-3.5 mr-1 fill-current" /> : <BellOff className="h-3.5 w-3.5 mr-1" />}
                    {notifyEnabled ? 'Notif.' : 'Avisar'}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── TITLE + META ── */}
            <div className="flex-1 min-w-0 pt-1">
              {manga.alternative_titles?.length > 0 && (
                <p className="text-[11px] text-white/35 uppercase tracking-[0.2em] mb-2 font-semibold line-clamp-1">
                  {manga.alternative_titles[0]}
                </p>
              )}

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight break-words mb-1">
                {manga.title}
              </h1>

              {/* Rating stars visual */}
              <div className="flex items-center gap-2 mb-5 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(manga.rating || 0) / 2 ? 'fill-yellow-400 text-yellow-400' : 'fill-white/10 text-white/10'}`} />
                  ))}
                </div>
                <span className="text-sm font-black text-yellow-400">{rating}</span>
                <span className="text-xs text-white/30">/ 10</span>
                <span className="text-xs text-white/20 ml-1">•</span>
                <span className="text-xs text-white/30">{fmtNum((manga as any).rating_count || 0)} avaliações</span>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <MetaTile icon={<div className={`h-2 w-2 rounded-full ${ss.dot} animate-pulse`} />} label="Status">
                  <span className={`font-bold text-sm ${ss.text}`}>{STATUS_LABEL[statusKey] || statusKey}</span>
                </MetaTile>

                <MetaTile icon={<BookOpen className="h-3.5 w-3.5 text-white/30" />} label="Capítulos">
                  <span className="font-bold text-sm text-white">{totalChapters}</span>
                </MetaTile>

                {manga.year && (
                  <MetaTile icon={<Calendar className="h-3.5 w-3.5 text-white/30" />} label="Ano">
                    <span className="font-bold text-sm text-white">{manga.year}</span>
                  </MetaTile>
                )}

                {manga.author && (
                  <MetaTile icon={<span className="text-white/30 text-xs">✍</span>} label="Autor">
                    <span className="font-bold text-sm text-white truncate">{manga.author}</span>
                  </MetaTile>
                )}

                {manga.artist && (
                  <MetaTile icon={<span className="text-white/30 text-xs">🎨</span>} label="Arte">
                    <span className="font-bold text-sm text-white truncate">{manga.artist}</span>
                  </MetaTile>
                )}

                <MetaTile icon={<Eye className="h-3.5 w-3.5 text-white/30" />} label="Visitas">
                  <span className="font-bold text-sm text-white">{fmtNum(manga.views || 0)}</span>
                </MetaTile>
              </div>

              {/* Genres */}
              {manga.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {manga.genres.slice(0, 7).map(g => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] font-semibold text-white/55 hover:bg-rose-600/20 hover:border-rose-500/30 hover:text-rose-300 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}

              {/* Mobile CTAs */}
              <div className="flex sm:hidden gap-2 mt-2">
                <Button asChild className="flex-1 h-12 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 font-bold border-0 shadow-lg shadow-rose-600/25">
                  <Link to={readingProgress ? `/read/${manga.id}/${continueChapter}` : `/read/${manga.id}/1`}>
                    <Play className="h-4 w-4 fill-current mr-1.5" />
                    {readingProgress ? `Cap. ${continueChapter}` : 'Ler Cap. 1'}
                  </Link>
                </Button>
                <Button
                  className={`flex-1 h-12 rounded-xl font-bold border ${isFavorite ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' : 'bg-white/5 border-white/10 text-white/70'}`}
                  onClick={() => {
                    if (!user) { toast({ title: "Login necessário", variant: "destructive" }); return; }
                    toggleFavorite.mutate({ titleId: manga.id, isFavorite });
                  }}
                >
                  <Heart className={`h-4 w-4 mr-1.5 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>

              {/* Utility row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Reading list selector */}
                {user && (
                  <Select
                    value={readingStatus || ''}
                    onValueChange={v => updateStatus.mutate({ status: v as ReadingStatus }, {
                      onSuccess: () => toast({ title: "Lista atualizada ✓" }),
                    })}
                  >
                    <SelectTrigger className={`h-9 rounded-xl px-3 text-xs border font-semibold ${isInList ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-white/5 text-white/50'}`}>
                      {isInList
                        ? <span className="flex items-center gap-1.5">{statusIcons[readingStatus!]}{STATUS_CONFIG[readingStatus!]?.label}</span>
                        : <span className="flex items-center gap-1.5"><ListPlus className="h-3.5 w-3.5" />Adicionar à Lista</span>
                      }
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map(s => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">{statusIcons[s]}{STATUS_CONFIG[s].label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Mobile notify */}
                <Button
                  className={`sm:hidden h-9 px-3 rounded-xl border text-xs font-semibold ${notifyEnabled ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/50'}`}
                  onClick={() => {
                    if (!user) { toast({ title: "Login necessário", variant: "destructive" }); return; }
                    setNotifyEnabled(p => !p);
                  }}
                >
                  {notifyEnabled ? <Bell className="h-3.5 w-3.5 mr-1 fill-current" /> : <BellOff className="h-3.5 w-3.5 mr-1" />}
                  {notifyEnabled ? 'Notif. ON' : 'Notificar'}
                </Button>

                {/* Report */}
                <Dialog open={reportOpen} onOpenChange={o => { setReportOpen(o); if (!o) setReportFeedback(null); }}>
                  <DialogTrigger asChild>
                    <Button className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8 text-xs font-semibold">
                      <Flag className="h-3.5 w-3.5 mr-1.5" />Reportar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-[#18181f] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-white"><Flag className="h-5 w-5 text-rose-400" />Reportar problema</DialogTitle>
                      <DialogDescription className="text-white/50">Conte o que aconteceu com <strong className="text-white/70">{manga.title}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1.5 block">Tipo</label>
                        <Select value={reportType} onValueChange={setReportType}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[
                              ['broken_chapter','Capítulo quebrado / não carrega'],
                              ['wrong_info','Informação incorreta'],
                              ['missing_chapter','Capítulo faltando'],
                              ['duplicate','Obra duplicada'],
                              ['copyright','Violação de direitos autorais'],
                              ['other','Outro'],
                            ].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1.5 block">Detalhes</label>
                        <Textarea
                          value={reportMessage}
                          onChange={e => setReportMessage(e.target.value)}
                          placeholder="Descreva o problema com detalhes..."
                          className="min-h-[100px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/25"
                          maxLength={500}
                        />
                        <p className="text-[10px] text-white/25 mt-1 text-right">{reportMessage.length}/500</p>
                      </div>
                      {reportFeedback && (
                        <div className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${reportFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                          {reportFeedback.text}
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" className="border-white/10 text-white/70" onClick={() => setReportOpen(false)}>
                        {reportFeedback?.type === 'success' ? 'Fechar' : 'Cancelar'}
                      </Button>
                      <Button
                        disabled={reportSubmitting || reportMessage.trim().length < 5 || reportFeedback?.type === 'success'}
                        className="bg-rose-600 hover:bg-rose-700"
                        onClick={async () => {
                          setReportSubmitting(true); setReportFeedback(null);
                          const { error } = await supabase.from('title_reports').insert({
                            title_id: manga.id, reporter_id: user?.id ?? null,
                            report_type: reportType, message: reportMessage.trim(),
                          });
                          setReportSubmitting(false);
                          if (error) { setReportFeedback({ type: 'error', text: 'Não foi possível enviar. Tente novamente.' }); return; }
                          setReportFeedback({ type: 'success', text: 'Relatório enviado! Obrigado por ajudar.' });
                          setReportMessage('');
                          toast({ title: 'Relatório enviado!' });
                        }}
                      >
                        {reportSubmitting ? 'Enviando…' : 'Enviar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Admin tools */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[
                      { to: `/upload/chapter/${manga.id}`, icon: <Upload className="h-3.5 w-3.5" />, tip: 'Upload Capítulo' },
                      { to: `/upload/bulk/${manga.id}`,    icon: <Layers  className="h-3.5 w-3.5" />, tip: 'Upload em Massa' },
                      { to: `/manga/${manga.id}/edit`,     icon: <Pencil  className="h-3.5 w-3.5" />, tip: 'Editar Obra' },
                    ].map(({ to, icon, tip }) => (
                      <Tooltip key={to}>
                        <TooltipTrigger asChild>
                          <Button asChild className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 p-0">
                            <Link to={to}>{icon}</Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{tip}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          QUICK STATS BAR
      ══════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-5xl mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />, label: 'Avaliação', value: `${rating}/10`, color: 'from-yellow-500/15 to-amber-500/5 border-yellow-500/20' },
            { icon: <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />,   label: 'Favoritos', value: fmtNum((manga as any).favorites_count || 0), color: 'from-rose-500/15 to-pink-500/5 border-rose-500/20' },
            { icon: <Eye className="h-4 w-4 text-sky-400" />,                    label: 'Visitas',   value: fmtNum(manga.views || 0), color: 'from-sky-500/15 to-blue-500/5 border-sky-500/20' },
            { icon: <BookOpen className="h-4 w-4 text-emerald-400" />,           label: 'Capítulos', value: String(totalChapters), color: 'from-emerald-500/15 to-green-500/5 border-emerald-500/20' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br ${color} border backdrop-blur`}>
              {icon}
              <div>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{label}</div>
                <div className="text-base font-black text-white tabular-nums leading-tight">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reading progress banner */}
      {readCount > 0 && (
        <div className="container mx-auto px-4 max-w-5xl mt-3">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500/10 to-purple-500/10 border border-rose-500/20">
            <TrendingUp className="h-4 w-4 text-rose-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60 font-semibold">Seu progresso de leitura</span>
                <span className="text-white font-black">{readCount}/{totalChapters} capítulos</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${readPercent}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-black text-rose-300 shrink-0">{readPercent}%</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TABS
      ══════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-5xl mt-7">
        <div className="flex gap-0 border-b border-white/8">
          {([
            { key: 'chapters', label: `Capítulos`, count: totalChapters, icon: <BookOpen className="h-4 w-4" /> },
            { key: 'synopsis', label: 'Sinopse',   count: null,         icon: <AlignLeft className="h-4 w-4" /> },
            { key: 'reviews',  label: 'Reviews',   count: null,         icon: <MessageSquare className="h-4 w-4" /> },
          ] as { key: Tab; label: string; count: number | null; icon: React.ReactNode }[]).map(({ key, label, count, icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setVisibleCount(CHAPTERS_PER_PAGE); }}
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-bold -mb-px transition-all ${
                tab === key
                  ? 'text-white border-b-2 border-rose-500'
                  : 'text-white/35 border-b-2 border-transparent hover:text-white/60'
              }`}
            >
              {icon}
              <span>{label}</span>
              {count !== null && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${tab === key ? 'bg-rose-500/25 text-rose-300' : 'bg-white/8 text-white/35'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TAB CONTENT
      ══════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-5xl mt-5">

        {/* ── CHAPTERS ── */}
        {tab === 'chapters' && (
          <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <Input
                  value={chapterQuery}
                  onChange={e => { setChapterQuery(e.target.value); setVisibleCount(CHAPTERS_PER_PAGE); }}
                  placeholder="Buscar capítulo..."
                  className="pl-9 h-11 rounded-xl bg-white/5 border-white/8 placeholder:text-white/20 text-white focus:border-rose-500/50 focus:ring-0 focus:bg-white/7"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl bg-white/5 border border-white/8 text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => setSortDesc(s => !s)}
                aria-label="Ordenar"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-11 w-11 rounded-xl border text-white/40 hover:text-white transition-colors ${chapterView === 'grid' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : 'bg-white/5 border-white/8 hover:bg-white/10'}`}
                onClick={() => setChapterView(v => v === 'list' ? 'grid' : 'list')}
                aria-label="Alternar visualização"
              >
                {chapterView === 'list' ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </Button>
            </div>

            {/* Mark all read */}
            {user && filteredChapters.length > 0 && (
              <button
                onClick={markAllRead}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/8 hover:bg-emerald-500/8 hover:border-emerald-500/20 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white/70 group-hover:text-emerald-300 transition-colors">Marcar todos como lido</div>
                  <div className="text-xs text-white/30">{readCount} de {totalChapters} lidos</div>
                </div>
                {readCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-bold">{readPercent}%</span>
                )}
              </button>
            )}

            {filteredChapters.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 text-white/8 mx-auto mb-3" />
                <p className="text-white/25 text-sm">Nenhum capítulo encontrado.</p>
              </div>
            ) : chapterView === 'list' ? (
              /* LIST VIEW */
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="divide-y divide-white/6">
                  {visibleChapters.map((chapter) => {
                    const isNew = Date.now() - new Date(chapter.created_at).getTime() < 864e5 * 3;
                    const unlockAt = (chapter as any).vip_unlock_at as string | null;
                    const isVipLocked = chapter.is_vip && !(unlockAt && new Date(unlockAt).getTime() <= Date.now());
                    const isRead = readChapters.has(chapter.id);

                    return (
                      <div key={chapter.id} className={`relative group flex items-center gap-3 px-4 py-3 transition-colors ${isRead ? 'bg-white/2' : 'bg-[#141419] hover:bg-[#1c1c24]'}`}>
                        {/* Read indicator stripe */}
                        {isRead && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-500 to-purple-500 rounded-r" />}

                        <Link to={`/read/${manga.id}/${chapter.chapter_number}`} className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Thumb */}
                          <div className={`relative w-11 h-11 rounded-lg overflow-hidden bg-white/5 shrink-0 transition-opacity ${isRead ? 'opacity-40' : 'opacity-80 group-hover:opacity-100'}`}>
                            <img src={manga.cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm transition-colors ${isRead ? 'text-white/35' : 'text-white/90 group-hover:text-white'}`}>
                                Capítulo {chapter.chapter_number}
                              </span>
                              {isNew && !isRead && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white leading-none">Novo</span>
                              )}
                              {isRead && (
                                <span className="flex items-center gap-0.5 text-[10px] text-white/25 font-semibold">
                                  <CheckCircle className="h-3 w-3" />Lido
                                </span>
                              )}
                              {isVipLocked && (
                                unlockAt
                                  ? <VipCountdown unlockAt={unlockAt} variant="badge" />
                                  : <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-5 px-1.5 py-0">
                                      <Crown className="h-2.5 w-2.5 mr-0.5" />VIP
                                    </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/25">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(chapter.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              {chapter.chapter_title && <span className="truncate">• {chapter.chapter_title}</span>}
                            </div>
                          </div>

                          {/* Views */}
                          <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/20 shrink-0">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{Math.floor(Math.random() * 500 + 50)}</span>
                          </div>
                        </Link>

                        {/* Mark read toggle */}
                        <button
                          onClick={e => toggleReadChapter(chapter.id, e)}
                          className={`shrink-0 h-7 w-7 rounded-lg border flex items-center justify-center transition-all ${
                            isRead
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-white/20 hover:text-white/50 hover:bg-white/10 opacity-0 group-hover:opacity-100'
                          }`}
                          aria-label={isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                        >
                          <CheckCircle className={`h-3.5 w-3.5 ${isRead ? 'fill-emerald-400' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* GRID VIEW */
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {visibleChapters.map(chapter => {
                  const isNew = Date.now() - new Date(chapter.created_at).getTime() < 864e5 * 3;
                  const isRead = readChapters.has(chapter.id);
                  const unlockAt = (chapter as any).vip_unlock_at as string | null;
                  const isVipLocked = chapter.is_vip && !(unlockAt && new Date(unlockAt).getTime() <= Date.now());

                  return (
                    <Link
                      key={chapter.id}
                      to={`/read/${manga.id}/${chapter.chapter_number}`}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden group transition-transform hover:scale-[1.03] hover:shadow-xl hover:shadow-black/50 ${isRead ? 'opacity-45 hover:opacity-70' : ''}`}
                    >
                      <img src={manga.cover} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 p-2">
                        <div className="text-[11px] font-black text-white leading-tight">Cap. {chapter.chapter_number}</div>
                        {isNew && !isRead && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-rose-600 text-white mt-0.5 inline-block">Novo</span>
                        )}
                        {isRead && <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5" />}
                        {isVipLocked && <Crown className="h-3 w-3 text-amber-400 mt-0.5" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Infinite scroll loader */}
            {visibleCount < filteredChapters.length && (
              <div ref={loaderRef} className="text-center py-6">
                <div className="inline-flex items-center gap-2 text-white/30 text-xs">
                  <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-rose-500 rounded-full animate-spin" />
                  Carregando mais capítulos…
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SYNOPSIS ── */}
        {tab === 'synopsis' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/8 bg-[#141419] p-5">
              <p className="text-sm text-white/65 leading-relaxed whitespace-pre-line">
                {synopsisExpanded ? synopsis : synopsisShort}
              </p>
              {synopsis.length > 320 && (
                <button
                  onClick={() => setSynopsisExpanded(s => !s)}
                  className="mt-4 flex items-center gap-1.5 text-rose-400 text-sm font-bold hover:text-rose-300 transition-colors"
                >
                  {synopsisExpanded ? <><ChevronUp className="h-4 w-4" />Mostrar menos</> : <><ChevronDown className="h-4 w-4" />Mostrar mais</>}
                </button>
              )}
            </div>

            {manga.genres?.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2.5">Gêneros</h3>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.map(g => (
                    <Link key={g} to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-sm text-white/55 hover:bg-rose-600/15 hover:text-rose-300 hover:border-rose-500/25 transition-colors">
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <RatingSection titleId={manga.id} />
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === 'reviews' && (
          <div className="rounded-2xl border border-white/8 bg-[#141419] p-5">
            <CommentsSection titleId={manga.id} />
          </div>
        )}

        {/* ══════════════════════════════════════
            REACTIONS — always visible
        ══════════════════════════════════════ */}
        <div className="mt-5 rounded-2xl border border-white/8 bg-[#141419] p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Sua reação</h3>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map(({ key, emoji, label }) => {
              const active = myReaction === key;
              const count = reactions[key];
              return (
                <button
                  key={key}
                  onClick={() => handleReaction(key)}
                  title={label}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-bold transition-all duration-200 ${
                    active
                      ? 'border-rose-500/50 bg-rose-500/15 text-white scale-105 shadow-lg shadow-rose-500/15'
                      : 'border-white/8 bg-white/4 text-white/50 hover:bg-white/8 hover:text-white hover:border-white/15'
                  }`}
                >
                  <span className="text-lg leading-none">{emoji}</span>
                  <span className="tabular-nums text-xs">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════
            SHARE MODAL
        ══════════════════════════════════════ */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="max-w-sm bg-[#18181f] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2"><Share2 className="h-5 w-5 text-rose-400" />Compartilhar</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
                <span className="text-xs text-white/40 truncate flex-1">{window.location.href}</span>
                <button onClick={copyLink} className="shrink-0 p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: 'Twitter/X', icon: <Twitter className="h-4 w-4" />, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(manga.title)}&url=${encodeURIComponent(window.location.href)}`, color: 'hover:bg-sky-500/15 hover:border-sky-500/30 hover:text-sky-300' },
                  { label: 'Facebook', icon: <Facebook className="h-4 w-4" />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, color: 'hover:bg-blue-500/15 hover:border-blue-500/30 hover:text-blue-300' },
                ].map(({ label, icon, href, color }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/50 font-semibold text-sm transition-colors ${color}`}>
                    {icon}{label}
                  </a>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   HELPER COMPONENTS
───────────────────────────────────────── */

const MetaTile = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30">
      {icon}
      <span>{label}</span>
    </div>
    <div>{children}</div>
  </div>
);

export default MangaDetails;
