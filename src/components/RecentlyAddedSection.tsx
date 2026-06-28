import { memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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
  completed:      { color: 'bg-blue-400',    label: 'Completo'     },
  'Completo':     { color: 'bg-blue-400',    label: 'Completo'     },
  hiatus:         { color: 'bg-amber-400',   label: 'Hiato'        },
  cancelled:      { color: 'bg-red-400',     label: 'Cancelado'    },
};
const getStatus = (s: string) => STATUS_CONFIG[s] ?? { color: 'bg-emerald-400', label: s };

// ─── Card portrait com título sobreposto ─────────────────────────────────────
// Largura fixa ~160px, altura alta (~240px), título+tipo no gradiente inferior

const NewWorksCard = memo(({ m }: { m: Title }) => {
  const status = getStatus(m.status);

  return (
    <Link
      to={`/manga/${m.slug || m.id}`}
      className="group snap-start shrink-0 w-[158px] block"
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-muted"
        style={{ height: '240px' }}
      >
        <img
          src={m.cover}
          alt={m.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Gradiente inferior para legibilidade do título */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

        {/* Top badges — status esquerda, capítulos direita */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
          {m.status && (
            <span className="flex items-center gap-1 rounded-lg bg-black/65 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white leading-none truncate max-w-[100px]">
              <span className={`h-1.5 w-1.5 rounded-full ${status.color} shrink-0`} />
              {status.label}
            </span>
          )}
          {m.chapters !== undefined && (
            <span className="flex items-center gap-1 rounded-lg bg-black/65 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-black text-white leading-none shrink-0 ml-auto">
              <BookOpen className="h-2.5 w-2.5" />
              {m.chapters}
            </span>
          )}
        </div>

        {/* Título + tipo sobrepostos no gradiente — fundo da imagem */}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="text-[13px] font-black leading-snug line-clamp-2 text-white drop-shadow-sm">
            {m.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-white/65 font-semibold">{m.type}</p>
        </div>
      </div>
    </Link>
  );
});
NewWorksCard.displayName = 'NewWorksCard';

// ─── Main ─────────────────────────────────────────────────────────────────────

const SCROLL_AMOUNT = 340;

const RecentlyAddedSection = memo(({ titles }: Props) => {
  const railRef = useRef<HTMLDivElement>(null);

  if (!titles?.length) return null;

  const scroll = (dir: 'left' | 'right') => {
    railRef.current?.scrollBy({ left: dir === 'right' ? SCROLL_AMOUNT : -SCROLL_AMOUNT, behavior: 'smooth' });
  };

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

        {/* Setas de scroll */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rail horizontal com snap — igual às screenshots */}
      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 md:-mx-4 md:px-4 snap-x snap-mandatory scrollbar-hide"
      >
        {titles.map((m) => (
          <NewWorksCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
});

RecentlyAddedSection.displayName = 'RecentlyAddedSection';
export default RecentlyAddedSection;
