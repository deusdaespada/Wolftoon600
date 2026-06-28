import { memo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Heart, ArrowRight, Clock3, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  /** Optional: dismiss/remove a reading-progress entry */
  onRemove?: (titleId: string) => void;
}

/**
 * Continue Lendo — KuroMangas-inspired horizontal card rail
 *
 * Melhorias v2:
 * - Barra de progresso linear (mais legível que ring)
 * - Botões Cap. anterior / próximo inline
 * - Botão ✕ para remover da lista (onRemove prop)
 * - Cover com overlay de leitura ao hover
 * - Tempo de leitura exibido no canto
 * - Snap scroll + scrollbar-hide para mobile
 */
const ContinueReadingSection = memo(({ items, onRemove }: Props) => {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback(
    (titleId: string) => {
      setDismissed((prev) => new Set([...prev, titleId]));
      onRemove?.(titleId);
    },
    [onRemove],
  );

  if (!items?.length) return null;

  const visible = items
    .filter((i) => i.title && i.chapter && !dismissed.has(i.title_id))
    .slice(0, 10);

  if (!visible.length) return null;

  return (
    <section className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/30">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" strokeWidth={2} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
          </div>
          <div>
            <h2 className="font-black text-2xl md:text-3xl tracking-tight leading-none">Continue Lendo</h2>
            <p className="text-[11px] text-muted-foreground tracking-[0.18em] uppercase font-semibold mt-1">
              {visible.length} obra{visible.length !== 1 ? 's' : ''} em progresso
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 font-semibold group" asChild>
          <Link to="/my-list">
            Ver tudo
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>

      {/* Horizontal rail */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 md:-mx-4 md:px-4 snap-x snap-mandatory scrollbar-hide">
        {visible.map((item) => {
          const total = item.title?.total_chapters ?? 0;
          const current = item.chapter!.chapter_number;
          const progressPct =
            total > 0
              ? Math.min(100, Math.round((current / total) * 100))
              : Math.min(99, Math.round((current / Math.max(current + 2, 2)) * 100));
          const remaining = Math.max(0, total - current);
          const nextChapter = remaining > 0 ? current + 1 : current;
          const prevChapter = current > 1 ? current - 1 : null;
          const isFav = favorites?.includes(item.title_id) ?? false;
          const lastReadLabel = formatDistanceToNow(new Date(item.last_read_at), {
            locale: ptBR,
            addSuffix: false,
          });

          return (
            <article
              key={`${item.title_id}-${item.chapter_id}`}
              className="snap-start shrink-0 w-[280px] sm:w-[300px] flex flex-col rounded-2xl bg-card/60 border border-border/40 hover:border-primary/40 transition-all duration-200 overflow-hidden group"
            >
              {/* Cover */}
              <Link to={`/manga/${item.title_id}`} className="relative block w-full aspect-[16/9] overflow-hidden shrink-0">
                <img
                  src={item.title!.cover}
                  alt={item.title!.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-top scale-100 group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Top-right badges */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {remaining > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-[9px] font-black text-white tabular-nums shadow">
                      +{remaining} novos
                    </span>
                  )}
                  {item.title?.type && (
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-[9px] font-black text-white uppercase">
                      {item.title.type}
                    </span>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDismiss(item.title_id);
                  }}
                  aria-label="Remover do continue lendo"
                  className="absolute top-2 left-2 h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Bottom: title over cover */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <h3 className="font-black text-sm text-white leading-tight line-clamp-1 drop-shadow">
                    {item.title!.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock3 className="h-2.5 w-2.5 text-white/60" />
                    <span className="text-[10px] text-white/60">{lastReadLabel} atrás</span>
                  </div>
                </div>
              </Link>

              {/* Body */}
              <div className="flex flex-col p-3 gap-2.5">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-foreground/80 tabular-nums">
                      Cap. {current}{total > 0 && <span className="text-muted-foreground font-normal"> / {total}</span>}
                    </span>
                    <span className="text-[10px] font-black text-primary tabular-nums">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Prev chapter */}
                  {prevChapter !== null && (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full border-border/40 hover:border-primary/50 hover:bg-primary/10"
                      title={`Capítulo ${prevChapter}`}
                    >
                      <Link to={`/read/${item.title_id}/${prevChapter}`}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}

                  {/* Main CTA */}
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3"
                  >
                    <Link to={`/read/${item.title_id}/${remaining > 0 ? nextChapter : current}`}>
                      <Play className="h-3 w-3 fill-current mr-1" />
                      {remaining > 0 ? `Cap. ${nextChapter}` : 'Reler'}
                    </Link>
                  </Button>

                  {/* Next chapter */}
                  {remaining > 0 && (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full border-border/40 hover:border-primary/50 hover:bg-primary/10"
                      title={`Capítulo ${nextChapter}`}
                    >
                      <Link to={`/read/${item.title_id}/${nextChapter}`}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}

                  {/* Favorite */}
                  <button
                    type="button"
                    onClick={() => {
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
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                      isFav
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
                        : 'bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
});

ContinueReadingSection.displayName = 'ContinueReadingSection';
export default ContinueReadingSection;
