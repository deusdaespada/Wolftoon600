import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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

const PAGE_SIZE = 4; // 2 por linha × 2 linhas

// ─── Card — 2 colunas, imagem grande, título+tipo FORA da imagem ──────────────
// Replicando exato o KuroMangas da screenshot

const NewWorksCard = memo(({ m }: { m: Title }) => {
  const status = getStatus(m.status);

  return (
    <Link to={`/manga/${m.slug || m.id}`} className="group block">
      {/* Imagem — aspect 3/4 para ficar bem alta como na screenshot */}
      <div className="relative overflow-hidden rounded-2xl bg-muted" style={{ aspectRatio: '3/4' }}>
        <img
          src={m.cover}
          alt={m.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Status badge — canto sup esquerdo */}
        <div className="absolute top-2.5 left-2.5">
          <span className="flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white leading-none">
            <span className={`h-1.5 w-1.5 rounded-full ${status.color} shrink-0`} />
            {status.label}
          </span>
        </div>

        {/* Capítulos — canto sup direito */}
        {m.chapters !== undefined && (
          <div className="absolute top-2.5 right-2.5">
            <span className="flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur-sm px-2 py-1 text-[11px] font-black text-white leading-none">
              <BookOpen className="h-3 w-3" />
              {m.chapters}
            </span>
          </div>
        )}

        {/* Gradiente sutil no fundo para separar dos badges se necessário */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Título e tipo FORA da imagem, abaixo — igual à screenshot */}
      <div className="mt-2 px-0.5">
        <h3 className="text-[14px] font-black leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {m.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground font-semibold">{m.type}</p>
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

      {/* Grid 2 colunas fixo — cards grandes como na screenshot */}
      <div className="grid grid-cols-2 gap-3">
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
