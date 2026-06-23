import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Heart, BookmarkCheck, ArrowRight, Clock3 } from 'lucide-react';
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
}

/**
 * Continue Lendo — Compact "ticket" rail layout
 * - Lighter DOM: single image per card, no blurred backdrop, fewer wrappers
 * - Horizontal asymmetric tickets with side stripe + ring progress
 * - Distinct from card / banner styles used elsewhere on home
 */
const ContinueReadingSection = memo(({ items }: Props) => {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();

  if (!items?.length) return null;
  const visible = items.filter((i) => i.title && i.chapter).slice(0, 8);
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
              Pegue de onde parou
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

      {/* Horizontal rail of "tickets" */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 md:-mx-4 md:px-4 snap-x snap-mandatory scrollbar-hide">
        {visible.map((item) => {
          const total = item.title?.total_chapters || 0;
          const current = item.chapter!.chapter_number;
          const progressPct =
            total > 0
              ? Math.min(100, Math.round((current / total) * 100))
              : Math.min(99, Math.round((current / Math.max(current + 1, 1)) * 100));
          const remaining = Math.max(0, total - current);
          const isFav = favorites?.includes(item.title_id) ?? false;
          const nextChapter = remaining > 0 ? current + 1 : current;
          const lastReadLabel = formatDistanceToNow(new Date(item.last_read_at), {
            locale: ptBR,
            addSuffix: false,
          });

          // Compute SVG ring values (lighter than gradient bars, looks distinct)
          const r = 18;
          const c = 2 * Math.PI * r;
          const dash = (progressPct / 100) * c;

          return (
            <article
              key={`${item.title_id}-${item.chapter_id}`}
              className="snap-start shrink-0 w-[300px] sm:w-[320px] flex rounded-2xl bg-card/60 border border-border/40 hover:border-primary/50 transition-colors overflow-hidden group"
            >
              {/* Cover with side stripe */}
              <Link
                to={`/manga/${item.title_id}`}
                className="relative w-[88px] shrink-0 overflow-hidden"
              >
                <img
                  src={item.title!.cover}
                  alt={item.title!.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Vertical accent stripe */}
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary-glow to-emerald-400" />
                {remaining > 0 && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-[9px] font-black text-white tabular-nums shadow">
                    +{remaining}
                  </span>
                )}
              </Link>

              {/* Body */}
              <div className="flex-1 min-w-0 p-3 flex flex-col">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {item.title!.type && (
                      <span className="inline-block text-[9px] font-black uppercase tracking-[0.15em] text-primary mb-0.5">
                        {item.title!.type}
                      </span>
                    )}
                    <h3 className="font-black text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title!.title}
                    </h3>
                  </div>

                  {/* Mini progress ring */}
                  <div className="relative h-11 w-11 shrink-0">
                    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
                      <circle cx="22" cy="22" r={r} stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                      <circle
                        cx="22" cy="22" r={r}
                        stroke="hsl(var(--primary))" strokeWidth="4" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${c}`}
                        className="transition-all"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums text-primary">
                      {progressPct}%
                    </span>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2.5">
                  <span className="font-bold text-foreground/80 tabular-nums">
                    Cap. {current}{total > 0 && <span className="text-muted-foreground font-normal"> / {total}</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-2.5 w-2.5" />
                    {lastReadLabel}
                  </span>
                </div>

                {/* Actions — pill row */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3"
                  >
                    <Link to={`/read/${item.title_id}/${nextChapter}`}>
                      <Play className="h-3 w-3 fill-current mr-1" />
                      {remaining > 0 ? `Cap. ${nextChapter}` : 'Reler'}
                    </Link>
                  </Button>
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
