import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  AlignLeft, MessageSquare, Image as ImageIcon, Calendar,
  User as UserIcon, Brush, Activity, Eye,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'chapters' | 'synopsis' | 'reviews';

// ─── Status config ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ongoing:       'Em andamento',
  Em_andamento:  'Em andamento',
  completed:     'Completo',
  hiatus:        'Hiatus',
  cancelled:     'Cancelado',
};

const STATUS_DOT: Record<string, string> = {
  ongoing:      'bg-emerald-500',
  Em_andamento: 'bg-emerald-500',
  completed:    'bg-sky-500',
  hiatus:       'bg-amber-500',
  cancelled:    'bg-red-500',
};

// ─── Component ─────────────────────────────────────────────────────────────────

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

  const [tab, setTab] = useState<Tab>('chapters');
  const [chapterQuery, setChapterQuery] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('broken_chapter');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isFavorite = favorites?.includes(manga?.id || "") ?? false;
  const readingProgress = getProgressForTitle(manga?.id || "");
  // Find first chapter number instead of hardcoding 1
  const firstChapter = useMemo(() => {
    if (!chapters?.length) return null;
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)[0]?.chapter_number ?? null;
  }, [chapters]);

  useIncrementViews(manga?.id);

  const statusIcons: Record<ReadingStatus, React.ReactNode> = {
    reading:   <BookOpen className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    planning:  <BookMarked className="h-4 w-4" />,
    dropped:   <Trash2 className="h-4 w-4" />,
    on_hold:   <Pause className="h-4 w-4" />,
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

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[420px] bg-muted animate-pulse" />
        <div className="container mx-auto px-4 max-w-4xl mt-6 space-y-3">
          <div className="h-8 w-2/3 bg-muted animate-pulse rounded-xl" />
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold mb-4">Título não encontrado</h1>
          <Button asChild><Link to="/catalog">Voltar ao Catálogo</Link></Button>
        </div>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const formatViews = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toString();
  };

  const ratingDisplay = (manga.rating || 0).toFixed(1);
  const favoritesCount = (manga as any).favorites_count ?? (manga as any).favorites ?? null;
  const favDisplay = favoritesCount !== null ? formatViews(Number(favoritesCount)) : '—';
  const synopsis = manga.synopsis || '';
  const SYNOPSIS_LIMIT = 260;
  const synopsisShort = synopsis.length > SYNOPSIS_LIMIT
    ? synopsis.slice(0, SYNOPSIS_LIMIT).trimEnd() + '…'
    : synopsis;
  const statusKey = (manga.status || 'ongoing') as string;
  const statusLabel = STATUS_LABEL[statusKey] || (manga.status || '').replace(/_/g, ' ');
  const dotClass = STATUS_DOT[statusKey] || 'bg-emerald-500';

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleShare = async () => {
    try {
      await navigator.share({ title: manga.title, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copiado!" });
    }
  };

  const handleReportClose = (open: boolean) => {
    setReportOpen(open);
    if (!open) {
      setReportFeedback(null);
      setReportMessage('');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />

      {/* ── HERO ── */}
      <div className="relative">
        {/* Blurred banner */}
        <div className="relative w-full h-[260px] sm:h-[340px] md:h-[400px] overflow-hidden">
          <img
            src={manga.cover}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-top scale-105 blur-lg brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        {/* Poster + title block — floats over banner */}
        <div className="container mx-auto px-4 max-w-4xl relative z-10 -mt-36 sm:-mt-48">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">

            {/* Poster */}
            <div className="relative w-[148px] sm:w-[180px] aspect-[3/4] rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-2xl shadow-black/70 shrink-0">
              <img src={manga.cover} alt={manga.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-rose-600 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-md shadow">
                {manga.type}
              </div>
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              {manga.alternative_titles && manga.alternative_titles.length > 0 && (
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-semibold line-clamp-1 mb-1">
                  {manga.alternative_titles.join(' · ')}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-[1.1] tracking-tight break-words">
                {manga.title}
              </h1>

              {/* Meta pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/70 backdrop-blur border border-border/40 text-[11px] font-bold">
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  {statusLabel}
                </span>
                {manga.year && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/70 backdrop-blur border border-border/40 text-[11px] font-semibold text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {manga.year}
                  </span>
                )}
                {manga.author && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/70 backdrop-blur border border-border/40 text-[11px] font-semibold text-muted-foreground max-w-[180px]">
                    <UserIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{manga.author}</span>
                  </span>
                )}
                {manga.artist && manga.artist !== manga.author && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/70 backdrop-blur border border-border/40 text-[11px] font-semibold text-muted-foreground max-w-[180px]">
                    <Brush className="h-3 w-3 shrink-0" />
                    <span className="truncate">{manga.artist}</span>
                  </span>
                )}
              </div>

              {/* Genre chips */}
              {manga.genres?.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2.5">
                  {manga.genres.slice(0, 6).map(g => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="container mx-auto px-4 max-w-4xl mt-5 relative z-10">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <StatPill icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />} label="Nota" value={ratingDisplay} />
            <StatPill icon={<Heart className="h-3.5 w-3.5 text-rose-400" />} label="Favoritos" value={favDisplay} />
            <StatPill icon={<BookOpen className="h-3.5 w-3.5 text-primary" />} label="Capítulos" value={String(chapters?.length || 0)} />
            <StatPill icon={<Eye className="h-3.5 w-3.5 text-muted-foreground" />} label="Visitas" value={formatViews(manga.views || 0)} />
          </div>
        </div>
      </div>

      {/* ── PRIMARY ACTIONS ── */}
      <div className="container mx-auto px-4 max-w-4xl mt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Read / Continue */}
          {readingProgress ? (
            <Button asChild size="lg" className="h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-600/25">
              <Link to={`/read/${manga.id}/${readingProgress.chapter.chapter_number}`}>
                <Play className="h-4 w-4 fill-current mr-1.5" />
                Continuar Cap. {readingProgress.chapter.chapter_number}
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              disabled={firstChapter === null}
              className="h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-600/25 disabled:opacity-50"
            >
              <Link to={firstChapter !== null ? `/read/${manga.id}/${firstChapter}` : '#'}>
                <Play className="h-4 w-4 fill-current mr-1.5" />
                {firstChapter !== null ? `Ler Cap. ${firstChapter}` : 'Sem capítulos'}
              </Link>
            </Button>
          )}

          {/* Favorite */}
          <Button
            size="lg"
            variant={isFavorite ? 'outline' : 'default'}
            className={`h-13 rounded-2xl font-black text-sm ${
              isFavorite
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                : 'bg-card border border-border hover:bg-card/80'
            }`}
            onClick={() => {
              if (!user) {
                toast({ title: "Faça login para favoritar", variant: "destructive" });
                return;
              }
              toggleFavorite.mutate({ titleId: manga.id, isFavorite }, {
                onSuccess: () => toast({ title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos" }),
              });
            }}
            disabled={toggleFavorite.isPending}
          >
            <Heart className={`h-4 w-4 mr-1.5 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>

        {/* Report button */}
        <Dialog open={reportOpen} onOpenChange={handleReportClose}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 text-sm font-medium"
            >
              <Flag className="h-3.5 w-3.5 mr-2 text-rose-400" />
              Reportar problema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Flag className="h-4 w-4 text-rose-400" />
                Reportar problema
              </DialogTitle>
              <DialogDescription>
                Nos conta o que aconteceu com <strong>{manga.title}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tipo de problema</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broken_chapter">Capítulo não carrega</SelectItem>
                    <SelectItem value="wrong_info">Informação incorreta</SelectItem>
                    <SelectItem value="missing_chapter">Capítulo faltando</SelectItem>
                    <SelectItem value="duplicate">Obra duplicada</SelectItem>
                    <SelectItem value="copyright">Direitos autorais</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Detalhes</label>
                <Textarea
                  value={reportMessage}
                  onChange={e => setReportMessage(e.target.value)}
                  placeholder="Descreva o problema..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right tabular-nums">{reportMessage.length}/500</p>
              </div>
              {reportFeedback && (
                <div className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  reportFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {reportFeedback.text}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleReportClose(false)}>
                {reportFeedback?.type === 'success' ? 'Fechar' : 'Cancelar'}
              </Button>
              <Button
                size="sm"
                disabled={reportSubmitting || reportMessage.trim().length < 5 || reportFeedback?.type === 'success'}
                onClick={async () => {
                  setReportSubmitting(true);
                  setReportFeedback(null);
                  const { error } = await supabase.from('title_reports').insert({
                    title_id: manga.id,
                    reporter_id: user?.id ?? null,
                    report_type: reportType,
                    message: reportMessage.trim(),
                  });
                  setReportSubmitting(false);
                  if (error) {
                    setReportFeedback({ type: 'error', text: 'Não foi possível enviar. Tente novamente.' });
                    return;
                  }
                  setReportFeedback({ type: 'success', text: 'Relatório enviado — obrigado!' });
                  setReportMessage('');
                  toast({ title: 'Relatório enviado!' });
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {reportSubmitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Secondary icon bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Compartilhar</TooltipContent>
          </Tooltip>

          {user && (
            <Select
              value={readingStatus || ''}
              onValueChange={value => {
                updateStatus.mutate({ status: value as ReadingStatus }, {
                  onSuccess: () => toast({
                    title: "Lista atualizada",
                    description: STATUS_CONFIG[value as ReadingStatus]?.label,
                  }),
                });
              }}
            >
              <SelectTrigger className={`w-auto h-10 rounded-xl px-3 text-sm ${isInList ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}>
                {isInList ? (
                  <span className="flex items-center gap-2">
                    {statusIcons[readingStatus!]}
                    {STATUS_CONFIG[readingStatus!]?.label}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ListPlus className="h-4 w-4" />
                    Adicionar à Lista
                  </span>
                )}
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

          {isAdmin && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="rounded-xl h-10 w-10">
                    <Link to={`/upload/chapter/${manga.id}`}><Upload className="h-4 w-4" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload capítulo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="rounded-xl h-10 w-10">
                    <Link to={`/upload/bulk/${manga.id}`}><Layers className="h-4 w-4" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload em massa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="rounded-xl h-10 w-10">
                    <Link to={`/manga/${manga.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar obra</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="container mx-auto px-4 max-w-4xl mt-7">
        <div className="flex border-b border-border/40 gap-0 overflow-x-auto scrollbar-none">
          <TabButton active={tab === 'chapters'} onClick={() => setTab('chapters')}>
            <BookOpen className="h-3.5 w-3.5" />
            Capítulos
            <span className="tabular-nums text-[10px] text-muted-foreground ml-1">({chapters?.length || 0})</span>
          </TabButton>
          <TabButton active={tab === 'synopsis'} onClick={() => setTab('synopsis')}>
            <AlignLeft className="h-3.5 w-3.5" />
            Sobre
          </TabButton>
          <TabButton active={tab === 'reviews'} onClick={() => setTab('reviews')}>
            <MessageSquare className="h-3.5 w-3.5" />
            Comentários
          </TabButton>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="container mx-auto px-4 max-w-4xl mt-5 space-y-3">

        {/* ── Chapters ── */}
        {tab === 'chapters' && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={chapterQuery}
                  onChange={e => setChapterQuery(e.target.value)}
                  placeholder="Buscar capítulo..."
                  className="pl-9 h-10 rounded-xl bg-muted/30 border-border/40 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-border/40 shrink-0"
                onClick={() => setSortDesc(s => !s)}
                aria-label={sortDesc ? 'Ordenar crescente' : 'Ordenar decrescente'}
                title={sortDesc ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            {filteredChapters.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum capítulo encontrado.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredChapters.map(chapter => {
                  const isNew = Date.now() - new Date(chapter.created_at).getTime() < 1000 * 60 * 60 * 24 * 3;
                  const unlockAt = (chapter as any).vip_unlock_at as string | null;
                  const isAutoUnlocked = unlockAt && new Date(unlockAt).getTime() <= Date.now();
                  const isVipLocked = chapter.is_vip && !isAutoUnlocked;

                  return (
                    <Link
                      key={chapter.id}
                      to={`/read/${manga.id}/${chapter.chapter_number}`}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors group
                        ${isVipLocked
                          ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                          : 'border-border/30 bg-card/30 hover:bg-card/60 hover:border-border/60'}
                      `}
                    >
                      {/* Left accent bar */}
                      <div className={`w-0.5 h-10 rounded-full shrink-0 ${isVipLocked ? 'bg-amber-500/60' : isNew ? 'bg-rose-500' : 'bg-border/40'}`} />

                      {/* Chapter info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm group-hover:text-primary transition-colors">
                            Cap. {chapter.chapter_number}
                          </span>
                          {chapter.chapter_title && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {chapter.chapter_title}
                            </span>
                          )}
                          {isVipLocked && (
                            unlockAt
                              ? <VipCountdown unlockAt={unlockAt} variant="badge" />
                              : <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0 gap-0.5 h-4">
                                  <Crown className="h-2.5 w-2.5" />VIP
                                </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isNew
                            ? <span className="text-rose-400 font-bold">Novo</span>
                            : new Date(chapter.created_at).toLocaleDateString('pt-BR')
                          }
                        </p>
                      </div>

                      {/* Arrow hint */}
                      <div className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors text-lg leading-none">›</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Synopsis / About ── */}
        {tab === 'synopsis' && (
          <div className="space-y-5">
            {synopsis && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Sinopse</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {synopsisExpanded ? synopsis : synopsisShort}
                </p>
                {synopsis.length > SYNOPSIS_LIMIT && (
                  <button
                    onClick={() => setSynopsisExpanded(s => !s)}
                    className="mt-2 text-primary text-sm font-semibold hover:underline"
                  >
                    {synopsisExpanded ? 'Mostrar menos' : 'Mostrar mais'}
                  </button>
                )}
              </div>
            )}

            {manga.genres?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Gêneros</h3>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.map(g => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 text-xs text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border/30 pt-5">
              <RatingSection titleId={manga.id} />
            </div>
          </div>
        )}

        {/* ── Comments ── */}
        {tab === 'reviews' && (
          <CommentsSection titleId={manga.id} />
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatPill = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/40 shrink-0">
    {icon}
    <span className="text-xs font-bold tabular-nums">{value}</span>
    <span className="text-[10px] text-muted-foreground/70">{label}</span>
  </div>
);

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`
      relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0
      ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}
    `}
  >
    {children}
    {active && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-t-full" />
    )}
  </button>
);

export default MangaDetails;
