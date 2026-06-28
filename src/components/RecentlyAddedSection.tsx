import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, BookOpen, Star, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatViews = (v?: number) => {
  if (!v) return null;
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Em andamento': { color: 'bg-emerald-400', label: 'Em andamento' },
  ongoing:        { color: 'bg-emerald-400', label: 'Em andamento' },
  completed:      { color: 'bg-blue-400',    label: 'Completo' },
  'Completo':     { color: 'bg-blue-400',    label: 'Completo' },
  hiatus:         { color: 'bg-amber-400',   label: 'Hiato' },
  cancelled:      { color: 'bg-red-400',     label: 'Cancelado' },
};
const getStatus = (s: string) => STATUS_CONFIG[s] ?? { color: 'bg-emerald-400', label: s };

const PAGE_SIZE = 6; // 3 linhas × 2 colunas

// ─── Card grande (igual KuroMangas "Novas Obras") ─────────────────────────────
// Cover 2:3, badges Status + Tipo sobrepostos no topo,
// título + meta abaixo da imagem (fora, fundo escuro)

const NewWorksCard = memo(({ m }: { m: Title }) => {
  const status = getStatus(m.status);
  const views  = formatViews(m.views);

  return (
    <Link
      to={`/manga/${m.slug || m.id}`}
      className="group block"
    >
      {/* Cover */}
      <div className="relative overflow-hidden rounded-xl bg-muted mb-2" style={{ aspectRatio: '2/3' }}>
        <img
          src={m.cover}
          alt={m.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Top-left: status badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white">
            <span className={`h-1.5 w-1.5 rounded-full ${status.color} shrink-0`} />
            {status.label}
          </span>
        </div>

        {/* Top-right: chapters count */}
        {m.chapters !== undefined && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 rounded-md border border-white/10 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-black text-white">
              <BookOpen className="h-2.5 w-2.5" />
              {m.chapters}
            </span>
          </div>
        )}

        {/* Bottom gradient + rating */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent h-20 pointer-events-none" />
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[11px] font-black text-white">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {m.rating?.toFixed(1) || '0.0'}
        </div>
      </div>

      {/* Info abaixo da imagem */}
      <div className="px-0.5">
        {/* Tipo em cima — igual à screenshot ("Manga" em cinza pequeno) */}
        <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">{m.type}</p>
        <h3 className="text-[13px] font-black leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {m.title}
        </h3>
        {views && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Eye className="h-2.5 w-2.5" />
            {views} views
          </p>
        )}
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

  const weeklyCount = titles.filter((t) => {
    if (!t.created_at) return false;
    return Date.now() - new Date(t.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <section className="container mx-auto px-3 md:px-4 py-5 md:py-7">

      {/* Header — igual ao KuroMangas */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          {/* Ícone estrela âmbar igual ao screenshot */}
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="font-black text-xl md:text-2xl tracking-tight leading-none">
            Novas Obras
          </h2>
        </div>

        {/* Paginação com setas — igual ao screenshot */}
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

      {/* Grid 2 colunas — igual ao KuroMangas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {pageItems.map((m) => (
          <NewWorksCard key={m.id} m={m} />
        ))}
      </div>

      {/* Ver tudo link abaixo */}
      {titles.length > PAGE_SIZE && (
        <div className="mt-5 text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-semibold group" asChild>
            <Link to="/catalog?sort=newest">
              Ver todos os lançamentos
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
