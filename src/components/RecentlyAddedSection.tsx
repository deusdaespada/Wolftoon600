import { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Calendar, BookOpen, Star, Flame, Clock } from 'lucide-react';

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

const formatRelative = (dateStr?: string) => {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}mês`;
};

const STATUS_DOT: Record<string, string> = {
  ongoing: 'bg-emerald-400',
  Em_andamento: 'bg-emerald-400',
  completed: 'bg-blue-400',
  hiatus: 'bg-amber-400',
  cancelled: 'bg-red-400',
};

const RecentlyAddedSection = memo(({ titles }: Props) => {
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-rotate spotlight every 6s
  useEffect(() => {
    if (!titles?.length) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % Math.min(5, titles.length));
    }, 6000);
    return () => clearInterval(id);
  }, [titles?.length]);

  if (!titles?.length) return null;

  const spotlightPool = titles.slice(0, 5);
  const spotlight = spotlightPool[activeIdx] || spotlightPool[0];
  const sideStack = titles.slice(0, 6).filter((_, i) => i !== activeIdx).slice(0, 4);
  const grid = titles.slice(5, 13);

  return (
    <section className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      {/* HEADER — magazine-style with index marker */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <span className="text-[8px] font-black uppercase text-white/80 leading-none">Nº</span>
            <span className="text-base font-black text-white leading-none mt-0.5">02</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] uppercase tracking-[0.25em] font-black text-blue-400">Edição da semana</span>
            </div>
            <h2 className="font-black text-2xl md:text-3xl tracking-tight bg-gradient-to-r from-blue-200 via-foreground to-cyan-300 bg-clip-text text-transparent leading-none">
              Lançamentos
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/10 font-semibold group" asChild>
          <Link to="/catalog?sort=newest">
            Ver tudo
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>

      {/* MAIN — split editorial layout: big spotlight + side stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        {/* Spotlight */}
        <Link
          to={`/manga/${spotlight.slug || spotlight.id}`}
          className="group lg:col-span-8 relative block aspect-[16/10] sm:aspect-[16/9] rounded-3xl overflow-hidden bg-muted ring-1 ring-blue-400/20"
        >
          <img
            src={spotlight.cover}
            alt={spotlight.title}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-[1200ms]"
          />
          {/* Top-left ribbon */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-md bg-blue-500 text-[10px] font-black tracking-widest uppercase text-white shadow-lg">
              Em destaque
            </span>
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] font-bold text-white border border-white/10">
              {spotlight.type}
            </span>
          </div>
          {/* Bottom-left vertical accent + content */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 z-10">
            <div className="flex items-end gap-3">
              <div className="w-1 h-16 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[spotlight.status] || 'bg-emerald-400'} animate-pulse`} />
                  <Clock className="h-3 w-3" />
                  {formatRelative(spotlight.created_at)}
                </div>
                <h3 className="font-black text-xl sm:text-3xl text-white line-clamp-2 leading-tight drop-shadow-lg mb-2">
                  {spotlight.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-white/85 mb-3">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <strong className="tabular-nums">{spotlight.rating?.toFixed(1) || '0.0'}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{spotlight.chapters ?? 0} caps</span>
                  </span>
                  {!!spotlight.views && (
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      <span className="tabular-nums">
                        {spotlight.views >= 1000 ? `${(spotlight.views / 1000).toFixed(1)}K` : spotlight.views}
                      </span>
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-500/40 group-hover:bg-blue-400 transition-colors">
                  Ler agora
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30 pointer-events-none" />
          {/* Indicator pills bottom-right */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
            {spotlightPool.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.preventDefault(); setActiveIdx(i); }}
                className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-6 bg-blue-400' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </Link>

        {/* Side stack — vertical list */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-2.5">
          {sideStack.map((m, idx) => (
            <Link
              key={m.id}
              to={`/manga/${m.slug || m.id}`}
              className="group relative flex items-center gap-3 p-2.5 rounded-2xl bg-card/60 border border-border/40 hover:border-blue-400/50 hover:bg-card/80 transition-all overflow-hidden"
            >
              <span className="hidden lg:flex absolute -left-1 top-1/2 -translate-y-1/2 font-black text-3xl text-blue-500/15 leading-none">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 ring-1 ring-blue-400/20">
                <img
                  src={m.cover}
                  alt={m.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">
                    {m.type}
                  </span>
                  <span className={`h-1 w-1 rounded-full ${STATUS_DOT[m.status] || 'bg-emerald-400'}`} />
                  <span className="text-[10px] text-muted-foreground">{formatRelative(m.created_at)}</span>
                </div>
                <h4 className="font-black text-xs sm:text-sm text-foreground line-clamp-2 leading-tight group-hover:text-blue-200 transition-colors mb-1">
                  {m.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span className="tabular-nums font-bold">{m.rating?.toFixed(1) || '0.0'}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <BookOpen className="h-2.5 w-2.5" />
                    <span className="tabular-nums">{m.chapters ?? 0}</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SECONDARY ROW — horizontal scroll of newest */}
      {grid.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-blue-400/80">
              Mais novidades
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/40 to-transparent" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 md:-mx-4 md:px-4 snap-x scrollbar-hide">
            {grid.map((m) => (
              <Link
                key={m.id}
                to={`/manga/${m.slug || m.id}`}
                className="snap-start shrink-0 w-[170px] sm:w-[200px] group"
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted ring-1 ring-blue-400/20 group-hover:ring-blue-400/60 shadow-lg shadow-black/40 transition-all">
                  <img
                    src={m.cover}
                    alt={m.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* MANHWA pill (top-left) */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-500 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/40">
                    {m.type}
                  </span>
                  {/* Star rating (top-right) */}
                  <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur text-[11px] font-black text-white border border-white/10">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {m.rating?.toFixed(1) || '0.0'}
                  </span>
                  {/* Bottom gradient + content */}
                  <div className="absolute inset-x-0 bottom-0 pt-12 pb-3 px-3 bg-gradient-to-t from-black via-black/70 to-transparent">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 backdrop-blur text-[10px] font-black text-blue-200 border border-blue-300/20 mb-1.5 uppercase tracking-wider">
                      <Calendar className="h-2.5 w-2.5" />
                      {formatRelative(m.created_at)}
                    </span>
                    <h3 className="font-black text-sm text-white line-clamp-2 leading-tight drop-shadow-lg">
                      {m.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});

RecentlyAddedSection.displayName = 'RecentlyAddedSection';
export default RecentlyAddedSection;
