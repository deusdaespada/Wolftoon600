import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

interface Title {
  id: string;
  slug?: string | null;
  title: string;
  cover: string;
  type: string;
  genres: string[];
}

interface Props {
  titles: Title[];
}

const MostReadSection = memo(({ titles }: Props) => {
  if (!titles || titles.length === 0) return null;
  const list = titles.slice(0, 10);

  return (
    <section className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/40">
            <Flame className="h-5 w-5 md:h-6 md:w-6 text-red-500" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-black text-2xl md:text-3xl tracking-tight">Mais Lidos</h2>
            <p className="text-muted-foreground text-xs md:text-sm">Os top da semana</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 font-semibold group" asChild>
          <Link to="/ranking">
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>

      {/* Numbered list with big rank numbers (Webtoon-style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {list.map((manga, index) => {
          const rank = index + 1;
          return (
            <Link
              key={manga.id}
              to={`/manga/${manga.slug || manga.id}`}
              className="flex items-center gap-3 group p-2 rounded-xl hover:bg-card/40 transition-colors"
            >
              {/* Cover */}
              <div className="relative shrink-0 w-[70px] h-[90px] rounded-lg overflow-hidden bg-muted">
                <img
                  src={manga.cover}
                  alt={manga.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Big rank number */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-black text-3xl md:text-4xl leading-none tabular-nums ${
                    rank === 1 ? 'text-amber-400' :
                    rank === 2 ? 'text-slate-300' :
                    rank === 3 ? 'text-orange-400' :
                    'text-muted-foreground'
                  }`}>
                    {rank}
                  </span>
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm md:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {manga.title}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {manga.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
});

MostReadSection.displayName = 'MostReadSection';
export default MostReadSection;
