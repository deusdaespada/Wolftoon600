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
  User as UserIcon, Brush, Activity
} from "lucide-react";

type Tab = 'chapters' | 'synopsis' | 'reviews' | 'gallery';

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'EM ANDAMENTO',
  Em_andamento: 'EM ANDAMENTO',
  completed: 'COMPLETO',
  hiatus: 'HIATUS',
  cancelled: 'CANCELADO',
};

const STATUS_DOT: Record<string, string> = {
  ongoing: 'bg-emerald-500',
  Em_andamento: 'bg-emerald-500',
  completed: 'bg-blue-500',
  hiatus: 'bg-amber-500',
  cancelled: 'bg-red-500',
};

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
  const [reportType, setReportType] = useState<string>('broken_chapter');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isFavorite = favorites?.includes(manga?.id || "") ?? false;
  const readingProgress = getProgressForTitle(manga?.id || "");
  const continueChapter = readingProgress?.chapter?.chapter_number || 1;

  useIncrementViews(manga?.id);

  const statusIcons: Record<ReadingStatus, React.ReactNode> = {
    reading: <BookOpen className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    planning: <BookMarked className="h-4 w-4" />,
    dropped: <Trash2 className="h-4 w-4" />,
    on_hold: <Pause className="h-4 w-4" />,
  };

  const filteredChapters = useMemo(() => {
    let list = chapters || [];
    if (chapterQuery.trim()) {
      const q = chapterQuery.toLowerCase();
      list = list.filter(
        (c) =>
          String(c.chapter_number).includes(q) ||
          (c.chapter_title || '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) =>
      sortDesc ? b.chapter_number - a.chapter_number : a.chapter_number - b.chapter_number,
    );
  }, [chapters, chapterQuery, sortDesc]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[420px] bg-muted animate-pulse" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Título não encontrado</h1>
          <Button asChild><Link to="/catalog">Voltar ao Catálogo</Link></Button>
        </div>
      </div>
    );
  }

  const formatViews = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };
  const ratingDisplay = (manga.rating || 0).toFixed(2);
  const favCount = formatViews((manga as any).favorites_count || (manga as any).favorites || manga.views || 0);

  const handleShare = async () => {
    try {
      await navigator.share({ title: manga.title, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copiado!" });
    }
  };

  const synopsis = manga.synopsis || '';
  const synopsisShort = synopsis.length > 240 ? synopsis.slice(0, 240).trimEnd() + '…' : synopsis;
  const statusKey = (manga.status || 'ongoing') as string;
  const statusLabel = STATUS_LABEL[statusKey] || (manga.status || 'EM ANDAMENTO').toUpperCase();
  const dotClass = STATUS_DOT[statusKey] || 'bg-emerald-500';

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />

      {/* HERO — cinematic banner with floating poster */}
      <div className="relative">
        <div className="relative w-full h-[300px] sm:h-[380px] md:h-[460px] overflow-hidden">
          <img
            src={manga.cover}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-top scale-110 blur-md opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_85%)]" />
        </div>

        {/* Floating poster + title */}
        <div className="container mx-auto px-4 max-w-4xl -mt-40 sm:-mt-52 md:-mt-60 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-7">
            {/* Poster — enlarged */}
            <div className="relative w-[180px] sm:w-[210px] md:w-[240px] aspect-[3/4] rounded-2xl overflow-hidden ring-2 ring-primary/40 shadow-2xl shadow-black/60 shrink-0">
              <img
                src={manga.cover}
                alt={manga.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-500 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                {manga.type}
              </div>
            </div>
            {/* Title block */}
            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
              {manga.alternative_titles && manga.alternative_titles.length > 0 && (
                <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mb-1.5 tracking-wide uppercase font-semibold">
                  {manga.alternative_titles.join(' / ')}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight break-words">
                {manga.title}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/60 backdrop-blur border border-border/40 text-[11px] sm:text-xs font-bold whitespace-nowrap">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-pulse`} />
                  {statusLabel}
                </span>
                {manga.year && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/60 backdrop-blur border border-border/40 text-[11px] sm:text-xs font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                    <Calendar className="h-3 w-3" />
                    {manga.year}
                  </span>
                )}
                {manga.author && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/60 backdrop-blur border border-border/40 text-[11px] sm:text-xs font-semibold text-muted-foreground max-w-[180px] truncate">
                    <UserIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{manga.author}</span>
                  </span>
                )}
              </div>
              {/* Quick genre chips — tap to filter catalog */}
              {manga.genres?.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2.5">
                  {manga.genres.slice(0, 5).map((g) => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      #{g}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats cards (4 metrics) */}
        <div className="container mx-auto px-4 max-w-4xl mt-5 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard color="purple" icon={<Star className="h-4 w-4 fill-purple-400 text-purple-400" />} label="Avaliação" value={ratingDisplay} />
            <StatCard color="cyan" icon={<Heart className="h-4 w-4 fill-cyan-400 text-cyan-400" />} label="Favoritos" value={favCount} />
            <StatCard color="emerald" icon={<BookOpen className="h-4 w-4 text-emerald-400" />} label="Capítulos" value={String(chapters?.length || 0)} />
            <StatCard color="amber" icon={<Activity className="h-4 w-4 text-amber-400" />} label="Visitas" value={formatViews(manga.views || 0)} />
          </div>
        </div>
      </div>

      {/* Optional artist meta row */}
      {manga.artist && (
        <div className="container mx-auto px-4 max-w-4xl mt-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/40 text-xs">
            <Brush className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Arte:</span>
            <span className="font-semibold">{manga.artist}</span>
          </div>
        </div>
      )}

      {/* PRIMARY ACTIONS — red Read + blue Bookmark style */}
      <div className="container mx-auto px-4 max-w-4xl mt-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {readingProgress ? (
            <Button asChild size="lg" className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base shadow-lg shadow-rose-600/30">
              <Link to={`/read/${manga.id}/${continueChapter}`}>
                <Play className="h-5 w-5 fill-current mr-1" />
                Continuar Cap. {continueChapter}
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base shadow-lg shadow-rose-600/30">
              <Link to={`/read/${manga.id}/1`}>
                <Play className="h-5 w-5 fill-current mr-1" />
                Ler Capítulo 1
              </Link>
            </Button>
          )}

          <Button
            size="lg"
            className={`h-14 rounded-2xl font-black text-base shadow-lg ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
            }`}
            onClick={() => {
              if (!user) {
                toast({ title: "Login necessário", description: "Faça login para favoritar", variant: "destructive" });
                return;
              }
              toggleFavorite.mutate({ titleId: manga.id, isFavorite }, {
                onSuccess: () => toast({ title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos" }),
              });
            }}
            disabled={toggleFavorite.isPending}
          >
            <Heart className={`h-5 w-5 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>

        {/* Report button */}
        <Dialog
          open={reportOpen}
          onOpenChange={(open) => {
            setReportOpen(open);
            if (!open) setReportFeedback(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border-rose-500/30 hover:border-rose-400/60 font-semibold text-foreground/90"
            >
              <Flag className="h-4 w-4 mr-2 text-rose-400" />
              Reportar Problema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-400" />
                Reportar problema
              </DialogTitle>
              <DialogDescription>
                Conte o que aconteceu com <strong>{manga.title}</strong>. Nossa equipe revisará em breve.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Tipo</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broken_chapter">Capítulo quebrado / não carrega</SelectItem>
                    <SelectItem value="wrong_info">Informação incorreta</SelectItem>
                    <SelectItem value="missing_chapter">Capítulo faltando</SelectItem>
                    <SelectItem value="duplicate">Obra duplicada</SelectItem>
                    <SelectItem value="copyright">Violação de direitos autorais</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Detalhes</label>
                <Textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                  className="min-h-[110px] resize-none"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{reportMessage.length}/500</p>
              </div>
              {reportFeedback && (
                <div
                  role="status"
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                    reportFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {reportFeedback.text}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                {reportFeedback?.type === 'success' ? 'Fechar' : 'Cancelar'}
              </Button>
              <Button
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
                    setReportFeedback({ type: 'error', text: 'Não foi possível enviar agora. Tente novamente em instantes.' });
                    toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
                    return;
                  }
                  setReportFeedback({ type: 'success', text: 'Relatório enviado! Obrigado por nos ajudar a melhorar a Wolftoon.' });
                  setReportMessage('');
                  toast({ title: 'Relatório enviado!' });
                }}
                className="bg-rose-500 hover:bg-rose-600"
              >
                {reportSubmitting ? 'Enviando...' : 'Enviar relatório'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Secondary icon row: Share / Lista / Admin */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl h-11 w-11" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Compartilhar</TooltipContent>
          </Tooltip>

          {user && (
            <Select
              value={readingStatus || ''}
              onValueChange={(value) => {
                updateStatus.mutate({ status: value as ReadingStatus }, {
                  onSuccess: () => toast({ title: "Lista atualizada", description: `Adicionado como "${STATUS_CONFIG[value as ReadingStatus].label}"` }),
                });
              }}
            >
              <SelectTrigger className={`w-auto h-11 rounded-xl px-3 ${isInList ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}>
                {isInList ? (
                  <span className="flex items-center gap-2">{statusIcons[readingStatus!]}{STATUS_CONFIG[readingStatus!]?.label}</span>
                ) : (
                  <span className="flex items-center gap-2"><ListPlus className="h-4 w-4" />Adicionar à Lista</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    <span className="flex items-center gap-2">{statusIcons[status]}{STATUS_CONFIG[status].label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isAdmin && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="rounded-xl h-11 w-11">
                    <Link to={`/upload/chapter/${manga.id}`}><Upload className="h-5 w-5" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload Capítulo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="rounded-xl h-11 w-11">
                    <Link to={`/upload/bulk/${manga.id}`}><Layers className="h-5 w-5" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload em Massa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="rounded-xl h-11 w-11">
                    <Link to={`/manga/${manga.id}/edit`}><Pencil className="h-5 w-5" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar Obra</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="container mx-auto px-4 max-w-4xl mt-6">
        <div className="border-t border-border/40 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <TabBtn active={tab === 'chapters'} onClick={() => setTab('chapters')} icon={<BookOpen className="h-4 w-4" />}>
              Capítulos ({chapters?.length || 0})
            </TabBtn>
            <TabBtn active={tab === 'synopsis'} onClick={() => setTab('synopsis')} icon={<AlignLeft className="h-4 w-4" />}>
              Sinopse
            </TabBtn>
            <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')} icon={<MessageSquare className="h-4 w-4" />}>
              Comentários
            </TabBtn>
            <TabBtn active={tab === 'gallery'} onClick={() => setTab('gallery')} icon={<ImageIcon className="h-4 w-4" />}>
              Galeria
            </TabBtn>
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="container mx-auto px-4 max-w-4xl mt-5 space-y-4">
        {tab === 'chapters' && (
          <>
            {/* Search bar + sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={chapterQuery}
                  onChange={(e) => setChapterQuery(e.target.value)}
                  placeholder="Buscar por número ou título do capítulo..."
                  className="pl-9 h-12 rounded-xl bg-muted/40 border-border/40"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl bg-muted/40 border-border/40"
                onClick={() => setSortDesc((s) => !s)}
                aria-label="Ordenar"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Mark all (placeholder) */}
            {user && filteredChapters.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">Marcar todos como lido</div>
                  <div className="text-xs text-muted-foreground">Marcar todos os capítulos como lidos</div>
                </div>
              </div>
            )}

            {/* Chapter list */}
            {filteredChapters.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum capítulo encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredChapters.map((chapter) => {
                  const isNew =
                    Date.now() - new Date(chapter.created_at).getTime() < 1000 * 60 * 60 * 24 * 3;
                  return (
                    <Link
                      key={chapter.id}
                      to={`/read/${manga.id}/${chapter.chapter_number}`}
                      className="flex items-center gap-3 p-2.5 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/60 hover:border-primary/40 transition-colors group"
                    >
                      <div className="relative w-[60px] h-[60px] rounded-xl overflow-hidden bg-muted shrink-0">
                        <img
                          src={manga.cover}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm group-hover:text-primary transition-colors">
                            Capítulo {chapter.chapter_number}
                          </span>
                          {(() => {
                            const unlockAt = (chapter as any).vip_unlock_at as string | null;
                            const isAutoUnlocked = unlockAt && new Date(unlockAt).getTime() <= Date.now();
                            if (chapter.is_vip && !isAutoUnlocked) {
                              if (unlockAt) {
                                return <VipCountdown unlockAt={unlockAt} variant="badge" />;
                              }
                              return (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[10px] px-1.5 py-0">
                                  <Crown className="h-2.5 w-2.5 mr-0.5" />VIP
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {isNew ? (
                            <span className="text-rose-400 font-bold">Novo</span>
                          ) : (
                            new Date(chapter.created_at).toLocaleDateString('pt-BR')
                          )}
                          {chapter.chapter_title && (
                            <span className="ml-2 line-clamp-1">{chapter.chapter_title}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'synopsis' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-lg mb-2">Resumo</h3>
              <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {synopsisExpanded ? synopsis : synopsisShort}
                </p>
                {synopsis.length > 240 && (
                  <button
                    onClick={() => setSynopsisExpanded((s) => !s)}
                    className="mt-3 text-rose-400 font-bold text-sm hover:underline"
                  >
                    {synopsisExpanded ? 'Mostrar menos ▲' : 'Mostrar mais ▼'}
                  </button>
                )}
              </div>
            </div>

            {manga.genres?.length > 0 && (
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground mb-2">Gêneros</h3>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.map((g) => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-3 py-1.5 rounded-full bg-muted/40 border border-border/40 text-sm text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <RatingSection titleId={manga.id} />
          </div>
        )}

        {tab === 'reviews' && (
          <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
            <CommentsSection titleId={manga.id} />
          </div>
        )}

        {tab === 'gallery' && (
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Galeria em breve.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const STAT_COLORS: Record<string, string> = {
  purple: 'from-purple-500/25 to-fuchsia-500/15 border-purple-400/30 text-purple-300',
  cyan: 'from-cyan-500/25 to-teal-500/15 border-cyan-400/30 text-cyan-300',
  emerald: 'from-emerald-500/25 to-green-500/15 border-emerald-400/30 text-emerald-300',
  amber: 'from-amber-500/25 to-orange-500/15 border-amber-400/30 text-amber-300',
};

const STAT_GLOWS = {
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
} as const;

const StatCard = ({
  color, icon, label, value,
}: { color: keyof typeof STAT_COLORS; icon: React.ReactNode; label: string; value: string }) => (
  <div className={`group relative rounded-2xl bg-gradient-to-br ${STAT_COLORS[color]} backdrop-blur border px-3 py-2.5 shadow-lg overflow-hidden hover:-translate-y-0.5 transition-transform`}>
    <div className={`absolute -top-6 -right-6 h-16 w-16 rounded-full opacity-20 blur-2xl ${STAT_GLOWS[color]}`} />
    <div className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold opacity-80 mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className="relative font-black text-lg sm:text-xl leading-none tabular-nums">{value}</div>
  </div>
);

const TabBtn = ({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 h-11 rounded-full font-bold text-sm transition-all ${
      active
        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
        : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
    }`}
  >
    {icon}
    {children}
  </button>
);

export default MangaDetails;
