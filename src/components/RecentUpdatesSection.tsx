import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Lock, Star, Flame, Pin, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChapterInfo {
  id: string;
  chapter_number: number;
  chapter_title: string | null;
  created_at: string;
  is_vip?: boolean;
}

interface TitleWithChapters {
  id: string;
  title: string;
  cover: string;
  type: string;
  chapters: ChapterInfo[];
  totalChapters: number;
  latestUpdate: string;
  newChaptersCount: number;
  rating?: number;
  status?: string;
}

interface RecentUpdatesSectionProps {
  groupedChapters: TitleWithChapters[];
}

const isNewChapter = (createdAt: string) => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < 1000 * 60 * 60 * 24 * 3; // 3 days
};

const PAGE_SIZE = 8;

const RecentUpdatesSection = memo(({ groupedChapters }: RecentUpdatesSectionProps) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((groupedChapters?.length || 0) / PAGE_SIZE));
  const pageItems = useMemo(
    () => (groupedChapters || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [groupedChapters, page],
  );

  const pages = useMemo(() => {
    const arr: (number | 'dots')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('dots');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) arr.push(i);
      if (page < totalPages - 2) arr.push('dots');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  if (!groupedChapters || groupedChapters.length === 0) return null;

  return (
    <section className="container mx-auto px-3 md:px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/15 border border-primary/30">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg md:text-xl">Atualizações Recentes</h2>
            <p className="text-muted-foreground text-xs">Capítulos recém-publicados</p>
          </div>
        </div>
      </div>

      {/* List style cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pageItems.map((item) => (
          <div
            key={item.id}
            className="relative flex gap-3 p-2 rounded-2xl bg-card/40 border border-border/40 hover:border-primary/50 transition-colors"
          >
            {/* Cover */}
            <Link
              to={`/manga/${item.id}`}
              className="relative shrink-0 w-[110px] sm:w-[120px] aspect-[3/4] overflow-hidden rounded-xl bg-muted group"
            >
              <img
                src={item.cover}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-[10px] font-bold shadow-md">
                {item.type}
              </span>
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded-md">
                <Pin className="h-2.5 w-2.5 text-white fill-white" />
                <span className="text-[9px] font-medium text-white">Destaque</span>
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1 pr-2">
              <Link to={`/manga/${item.id}`} className="block group">
                <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
              </Link>

              <div className="flex items-center justify-between mt-1 mb-2">
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-semibold">{item.rating?.toFixed(1) ?? '0.0'}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
                    <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {item.status || 'Em andamento'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                {item.chapters.slice(0, 3).map((ch) => {
                  const isNew = isNewChapter(ch.created_at);
                  return (
                    <Link
                      key={ch.id}
                      to={`/read/${item.id}/${ch.chapter_number}`}
                      className="flex items-center justify-between gap-2 text-xs sm:text-sm group/ch"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {ch.is_vip && <Lock className="h-3 w-3 text-amber-400 shrink-0" />}
                        <span
                          className={`font-medium truncate ${
                            ch.is_vip
                              ? 'text-amber-400'
                              : 'text-foreground/80 group-hover/ch:text-primary'
                          } transition-colors`}
                        >
                          Capítulo {ch.chapter_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        {isNew ? (
                          <>
                            <Flame className="h-3 w-3 text-red-500" />
                            <span className="text-red-400 font-medium">Novo</span>
                          </>
                        ) : (
                          <span className="text-[11px]">
                            {formatDistanceToNow(new Date(ch.created_at), { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* In-place pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          {pages.map((p, idx) =>
            p === 'dots' ? (
              <span key={`dots-${idx}`} className="text-muted-foreground px-1">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className={`h-9 w-9 rounded-lg font-bold ${
                  p === page ? 'bg-primary text-primary-foreground border-0' : ''
                }`}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  );
});

RecentUpdatesSection.displayName = 'RecentUpdatesSection';

export default RecentUpdatesSection;
