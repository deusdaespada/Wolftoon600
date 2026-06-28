import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Title } from "@/hooks/useTitles";
import Autoplay from "embla-carousel-autoplay";
import { Star, Eye, Play, BookmarkPlus, BookmarkCheck, BookOpen, ChevronDown } from "lucide-react";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  titles: Title[];
}

const formatViews = (v: number) => {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
};

const HeroCarousel = ({ titles }: HeroCarouselProps) => {
  const plugin = useRef(Autoplay({ delay: 7000, stopOnInteraction: true }));
  const [activeIndex, setActiveIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const { user } = useAuth();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();

  const featured = titles.slice(0, 5);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActiveIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!featured.length) return null;

  const handleFav = (titleId: string) => {
    if (!user) {
      toast({ title: "Faça login", description: "Entre para salvar na sua biblioteca." });
      return;
    }
    const isFav = favorites?.includes(titleId) ?? false;
    toggleFavorite.mutate(
      { titleId, isFavorite: isFav },
      {
        onSuccess: () =>
          toast({ title: isFav ? "Removido da biblioteca" : "Salvo na biblioteca" }),
      },
    );
  };

  return (
    <section className="relative w-full">
      <Carousel
        opts={{ align: "start", loop: true }}
        plugins={[plugin.current]}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {featured.map((title) => {
            const isFav = favorites?.includes(title.id) ?? false;
            return (
              <CarouselItem key={title.id} className="pl-0 basis-full">
                <article className="relative w-full h-[58svh] min-h-[420px] md:h-[100svh] md:min-h-[560px] max-h-[920px] overflow-hidden">
                  {/* Backdrop blur layer */}
                  <img
                    src={title.cover}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
                  />
                  {/* Focal cover */}
                  <img
                    src={title.cover}
                    alt={title.title}
                    loading="eager"
                    fetchPriority="high"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />

                  {/* Cinematic gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />

                  {/* Content */}
                  <div className="relative h-full container mx-auto px-4 md:px-8 flex flex-col justify-end pb-14 md:pb-28 lg:pb-32">
                    <div className="max-w-2xl animate-fade-in">
                      {/* Eyebrow */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] md:text-xs font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/40">
                          ✦ Destaque
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-[10px] md:text-xs font-bold uppercase tracking-wider text-foreground/90">
                          {title.type}
                        </span>
                      </div>

                      {/* Title */}
                      <h1 className="font-black text-[clamp(1.6rem,5vw,4.75rem)] leading-[0.95] tracking-tight text-foreground mb-3 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] line-clamp-2 md:line-clamp-3">
                        {title.title}
                      </h1>

                      {/* Stats row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs md:text-sm text-foreground/85">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="tabular-nums">{title.rating?.toFixed(1) || "0.0"}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="tabular-nums">{formatViews(title.views)}</span>
                        </span>
                        {(title as any).chapters !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="tabular-nums">{(title as any).chapters} caps</span>
                          </span>
                        )}
                        {title.status && (
                          <span className="hidden sm:inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-medium">{title.status}</span>
                          </span>
                        )}
                      </div>

                      {/* Synopsis — hidden on mobile */}
                      {title.synopsis && (
                        <p className="hidden md:block text-sm md:text-base text-foreground/75 line-clamp-3 md:line-clamp-4 mb-5 max-w-xl leading-relaxed">
                          {title.synopsis}
                        </p>
                      )}

                      {/* Genres */}
                      <div className="hidden sm:flex flex-wrap gap-1.5 mb-6">
                        {title.genres.slice(0, 4).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] md:text-xs px-2.5 py-1 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-foreground/90 font-medium"
                          >
                            {g}
                          </span>
                        ))}
                      </div>

                      {/* CTAs */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
                        <Button
                          size="lg"
                          asChild
                          className="h-10 md:h-12 px-5 md:px-6 rounded-full bg-primary text-primary-foreground font-black hover:bg-primary/90 shadow-xl shadow-primary/30 transition-all text-sm md:text-base"
                        >
                          <Link to={`/manga/${title.slug || title.id}`}>
                            <Play className="h-5 w-5 mr-1 fill-current" />
                            Ler Agora
                          </Link>
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => handleFav(title.id)}
                          disabled={toggleFavorite.isPending}
                          className={cn(
                            "h-10 md:h-12 px-4 md:px-5 rounded-full font-bold backdrop-blur-md border-white/20 bg-white/10 text-foreground hover:bg-white/20 hover:text-foreground transition-all text-sm md:text-base",
                            isFav && "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200",
                          )}
                        >
                          {isFav ? (
                            <>
                              <BookmarkCheck className="h-5 w-5 mr-1" />
                              Na Biblioteca
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-5 w-5 mr-1" />
                              Adicionar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Scroll hint */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-1 text-foreground/40 text-[10px] uppercase tracking-[0.3em] font-bold pointer-events-none">
                    <span>Role</span>
                    <ChevronDown className="h-4 w-4 animate-bounce" />
                  </div>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselPrevious className="hidden md:flex left-6 h-11 w-11 bg-background/40 backdrop-blur-xl border-white/15 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all" />
        <CarouselNext className="hidden md:flex right-6 h-11 w-11 bg-background/40 backdrop-blur-xl border-white/15 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all" />
      </Carousel>

      {/* Bottom progress indicators */}
      <div className="absolute bottom-8 md:bottom-10 right-4 md:right-8 z-20 flex items-center gap-2">
        {featured.map((_, idx) => (
          <button
            key={idx}
            onClick={() => api?.scrollTo(idx)}
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              idx === activeIndex
                ? "w-10 bg-primary shadow-lg shadow-primary/50"
                : "w-5 bg-white/30 hover:bg-white/60",
            )}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
