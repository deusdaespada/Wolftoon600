import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, BookOpen, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Title {
  id: string;
  slug?: string | null;
  title: string;
  cover: string;
  type: string;
  status: string;
  rating: number;
  chapters?: number;
  views?: number;
  created_at?: string;
  genres?: string[];
}

interface Props {
  titles: Title[];
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Em andamento': { color: 'bg-emerald-400', label: 'Em andamento' },
  ongoing:        { color: 'bg-emerald-400', label: 'Em andamento' },
  completed:      { color: 'bg-blue-400',    label: 'Completo' },
  'Completo':     { color: 'bg-blue-400',    label: 'Completo' },
  hiatus:         { color: 'bg-amber-400',   label: 'Hiato' },
  cancelled:      { color: 'bg-red-400',     label: 'Cancelado' },
};
const getStatus = (s: string) => STATUS_CONFIG[s] ?? { color: 'bg-emerald-400', label: s };

const PAGE_SIZE = 6;

// ─── Card 16/9 com título sobreposto ─────────────────────────────────────────

const NewWorksCard = memo(({ m }: { m: Title }) => {
  const status = getStatus(m.status);

  return (
    <Link to={`/manga/${m.slug || m.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: '16/9' }}>
        <img
          src={m.cover}
          alt={m.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
        />

        {/* Gradiente de baixo — onde fica o título */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white leading-none">
            <span className={`h-1.5 w-1.5 rounded-full ${status.color} shrink-0`} />
            {status.label}
          </span>
        </div>

        {m.chapters !== undefined && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-black text-white leading-none">
              <BookOpen className="h-2.5 w-2.5" />
              {m.chapters}
            </span>
          </div>
        )}

        {/* Título sobreposto no gradiente */}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/60 mb-0.5">{m.type}</p>
          <h3 className="text-[13px] font-black leading-snug line-clamp-2 text-white drop-shadow">
            {m.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-0.5 text-[10px] text-white/70">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {m.rating?.toFixed(1) || '0.0'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
NewWorksCard.displayName = 'NewWorksCard';

// ─── Main ─────────────────────────────────────────────────────────────────────

const RecentlyAddedSection = memo(({ titles }: Props) => {
  const [page, setPage] = useState(1);

  if (!titles?.length) return null;

  const totalPages = Math.max(1, Math.ceil(titles.length / PAGE_SIZE));
  const pageItems  = titles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="container mx-auto px-3 md:px-4 py-5 md:py-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="font-black text-xl md:text-2xl tracking-tight leading-none">Novas Obras</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid 2 colunas no mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
        {pageItems.map((m) => (
          <NewWorksCard key={m.id} m={m} />
        ))}
      </div>

      {titles.length > PAGE_SIZE && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-semibold group" asChild>
            <Link to="/catalog?sort=newest">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
});

RecentlyAddedSection.displayName = 'RecentlyAddedSection';
export default RecentlyAddedSection;
