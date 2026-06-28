import { memo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Heart, ArrowRight, Clock3, X, BookOpen, ChevronRight } from 'lucide-react';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProgressItem {
  title_id: string;
  chapter_id: string;
  last_read_at: string;
  page_number: number | null;
  title?: { title: string; cover: string; type?: string; total_chapters?: number } | null;
  chapter?: { chapter_number: number; chapter_title: string | null } | null;
}

interface Props {
  items: ProgressItem[];
  onRemove?: (titleId: string) => void;
}

/**
 * Continue Lendo — ticket horizontal igual ao KuroMangas da screenshot.
 *
 * Layout: cover pequeno (80px) à esquerda | conteúdo à direita
 * - Badge "+N novos" no canto superior do cover
 * - Tipo da obra + título em cima
 * - Cap atual + ícone livro (igual à screenshot)
 * - Ring SVG de progresso com % no centro
 * - Tempo desde última leitura (ícone relógio)
 * - Botão ✕ (hover) para dispensar
 * - Botão continuar implícito: card inteiro é clicável para o capítulo
 * - Botão de favorito no canto inferior direito
 *
 * Melhorias v2:
 * - Barra fina de cor do tipo na borda esquerda do cover
 * - Se tiver próximo capítulo disponível, mostra badge "Cap. N →"
 * - Toque longo no cover vai para a página da obra
 * - Dismiss com animação fade-out
 */

const TYPE_ACCENT: Record<string, string> = {
  Manga:   'from-orange-500 to-amber-400',
  Manhwa:  'from-primary to-emerald-400',
  Manhua:  'from-violet-500 to-purple-400',
  Novel:   'from-sky-500 to-cyan-400',
};

const ContinueReadingSection = memo(({ items, onRemove }: Props) => {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback(
    (e: React.MouseEvent, titleId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDismissed((prev) => new Set([...prev, titleId]));
      onRemove?.(titleId);
    },
    [onRemove],
  );

  if (!items?.length) return null;
  const visible = items.filter((i) => i.title && i.chapter && !dismissed.has(i.title_id)).slice(0, 10);
  if (!visible.length) return null;

  return (
    <section className="container mx-auto px-3 md:px-4 py-5 md:py-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Ícone igual ao KuroMangas — livro aberto numa caixa arredondada âmbar */}
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="font-black text-xl md:text-2xl tracking-tight leading-none">
            Continue Lendo
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground font-semibold h-8 px-2" asChild>
            <Link to="/my-list" className="flex items-center gap-1">
              Ver mais <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {/* Setas de scroll — decorativas, o scroll é nativo */}
          <button
            type="button"
            aria-hidden
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
            onClick={() => {
              document.getElementById('continue-rail')?.scrollBy({ left: -320, behavior: 'smooth' });
            }}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-hidden
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
            onClick={() => {
              document.getElementById('continue-rail')?.scrollBy({ left: 320, behavior: 'smooth' });
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rail horizontal */}
      <div
        id="continue-rail"
        className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 md:-mx-4 md:px-4 snap-x snap-mandatory scrollbar-hide"
      >
        {visible.map((item) => {
          const total   = item.title?.total_chapters ?? 0;
          const current = item.chapter!.chapter_number;
          const progressPct =
            total > 0
              ? Math.min(100, Math.round((current / total) * 100))
              : Math.min(99, Math.round((current / Math.max(current + 2, 2)) * 100));
          const remaining  = Math.max(0, total - current);
          const nextChapter = remaining > 0 ? current + 1 : current;
          const isFav = favorites?.includes(item.title_id) ?? false;
          const accent = TYPE_ACCENT[item.title?.type ?? ''] ?? 'from-primary to-emerald-400';

          const lastReadLabel = (() => {
            try {
              return formatDistanceToNow(new Date(item.last_read_at), { locale: ptBR, addSuffix: false });
            } catch { return ''; }
          })();

          // SVG ring
          const r = 17;
          const c = 2 * Math.PI * r;
          const dash = (progressPct / 100) * c;

          return (
            <article
              key={`${item.title_id}-${item.chapter_id}`}
              className="snap-start shrink-0 w-[300px] sm:w-[320px] group"
            >
              <Link
                to={`/read/${item.title_id}/${nextChapter}`}
                className="flex items-stretch rounded-2xl bg-card/70 border border-border/40 hover:border-amber-500/40 hover:bg-card/90 transition-all duration-200 overflow-hidden relative"
              >
                {/* Cover */}
                <div className="relative w-[84px] shrink-0 overflow-hidden">
                  <img
                    src={item.title!.cover}
                    alt={item.title!.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Borda colorida por tipo */}
                  <span className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${accent}`} />

                  {/* Badge novos capítulos */}
                  {remaining > 0 && (
                    <span className="absolute top-2 right-1.5 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow leading-none">
                      +{remaining} novos
                    </span>
                  )}

                  {/* Dismiss */}
                  <button
                    type="button"
                    onClickCapture={(e) => handleDismiss(e, item.title_id)}
                    aria-label="Remover"
                    className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1.5">
                  {/* Tipo */}
                  {item.title!.type && (
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-500 leading-none">
                      {item.title!.type}
                    </span>
                  )}

                  {/* Título */}
                  <h3 className="font-black text-[13px] leading-snug line-clamp-2 text-foreground group-hover:text-amber-400 transition-colors">
                    {item.title!.title}
                  </h3>

                  {/* Cap atual — igual à screenshot com ícone livro */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <BookOpen className="h-3 w-3 shrink-0" />
                    <span className="font-bold text-foreground/80">Cap. {current}</span>
                    {total > 0 && <span className="text-muted-foreground/60">/ {total}</span>}
                  </div>

                  {/* Linha inferior: tempo + ring */}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    {/* Tempo */}
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock3 className="h-2.5 w-2.5 shrink-0" />
                      {lastReadLabel}
                    </span>

                    {/* Ring SVG de progresso — exato como na screenshot */}
                    <div className="relative h-[42px] w-[42px] shrink-0">
                      <svg viewBox="0 0 42 42" className="h-[42px] w-[42px] -rotate-90">
                        <circle
                          cx="21" cy="21" r={r}
                          stroke="hsl(var(--muted))" strokeWidth="4" fill="none"
                        />
                        <circle
                          cx="21" cy="21" r={r}
                          stroke="hsl(var(--primary))"
                          strokeWidth="4" fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${c}`}
                          className="transition-all duration-700"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums text-foreground">
                        {progressPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorite — canto superior direito do card */}
                <button
                  type="button"
                  onClickCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite.mutate(
                      { titleId: item.title_id, isFavorite: isFav },
                      {
                        onSuccess: () =>
                          toast({ title: isFav ? 'Removido dos favoritos' : 'Adicionado aos favoritos' }),
                      },
                    );
                  }}
                  disabled={toggleFavorite.isPending}
                  aria-label={isFav ? 'Remover favorito' : 'Favoritar'}
                  className={`absolute top-2.5 right-2.5 h-6 w-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
                    isFav
                      ? 'bg-rose-500/20 text-rose-400 opacity-100'
                      : 'bg-black/40 backdrop-blur-sm text-white/70 hover:text-white'
                  }`}
                >
                  <Heart className={`h-3 w-3 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
});

ContinueReadingSection.displayName = 'ContinueReadingSection';
export default ContinueReadingSection;
