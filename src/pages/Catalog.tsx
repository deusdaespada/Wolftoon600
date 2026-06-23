import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import MangaCard from "@/components/MangaCard";
import MangaCardSkeleton from "@/components/MangaCardSkeleton";
import { useTitles } from "@/hooks/useTitles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter, X, Search, BookOpen, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";

const genres = [
  "Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Romance",
  "Terror", "Mistério", "Sci-Fi", "Slice of Life", "Sobrenatural",
  "Esportes", "Escolar", "Artes Marciais", "Isekai", "Psicológico",
  "Reencarnação", "Vingança", "Shounen", "Seinen",
  "Xianxia", "Wuxia", "Xuanhuan", "Cultivo", "Sistema", "LitRPG",
];

const ITEMS_PER_PAGE = 24;

const Catalog = () => {
  const { data: titles, isLoading } = useTitles();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialGenre = searchParams.get('genre');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenre ? [initialGenre] : []);
  const [sortBy, setSortBy] = useState<string>("popularity");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync URL genre param
  useEffect(() => {
    const g = searchParams.get('genre');
    if (g && !selectedGenres.includes(g)) {
      setSelectedGenres([g]);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const filteredMangas = useMemo(() => {
    return (titles || []).filter(manga => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          manga.title.toLowerCase().includes(query) ||
          manga.author.toLowerCase().includes(query) ||
          manga.genres.some(genre => genre.toLowerCase().includes(query)) ||
          (manga.alternative_titles || []).some(alt => alt.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (selectedType !== "all" && manga.type !== selectedType) return false;
      if (selectedStatus !== "all" && manga.status !== selectedStatus) return false;
      if (selectedGenres.length > 0) {
        const hasGenre = selectedGenres.some(genre => manga.genres.includes(genre));
        if (!hasGenre) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "popularity") return b.views - a.views;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "alphabetical") return a.title.localeCompare(b.title);
      return 0;
    });
  }, [titles, searchQuery, selectedType, selectedStatus, selectedGenres, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredMangas.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMangas = filteredMangas.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 4) pages.push('ellipsis-start');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 3) pages.push('ellipsis-end');
      pages.push(totalPages);
    }
    return pages;
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const next = prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre];
      // Update URL
      if (next.length === 1) {
        setSearchParams({ genre: next[0] });
      } else {
        searchParams.delete('genre');
        setSearchParams(searchParams);
      }
      return next;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedGenres([]);
    setSearchParams({});
    setCurrentPage(1);
  };

  const activeFiltersCount = (selectedType !== "all" ? 1 : 0) + (selectedStatus !== "all" ? 1 : 0) + selectedGenres.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-bold text-3xl md:text-4xl flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                Catálogo
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {filteredMangas.length} {filteredMangas.length === 1 ? 'título encontrado' : 'títulos encontrados'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, autor, gênero..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 h-11 bg-card/50 border-border/30 rounded-xl"
            />
          </div>

          {/* Active genre tags */}
          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedGenres.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1.5 font-medium hover:bg-primary/90 transition-colors"
                >
                  {g}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
                Limpar tudo
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-60 shrink-0">
            <div className="sticky top-20">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full mb-3 rounded-xl border-border/30 justify-between"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">{activeFiltersCount}</span>
                )}
              </Button>

              <div className={`${showFilters ? 'block' : 'hidden lg:block'}`}>
                <div className="bg-card/60 border border-border/30 rounded-2xl p-4 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" /> Filtros
                    </h2>
                    {activeFiltersCount > 0 && (
                      <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <X className="h-3 w-3" /> Limpar
                      </button>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-2 block text-muted-foreground">Tipo</Label>
                    <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setCurrentPage(1); }}>
                      <SelectTrigger className="bg-background/50 border-border/30 rounded-lg h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Manhwa">Manhwa</SelectItem>
                        <SelectItem value="Manhua">Manhua</SelectItem>
                        <SelectItem value="Mangá">Mangá</SelectItem>
                        <SelectItem value="Novel">Novel</SelectItem>
                        <SelectItem value="Webtoon">Webtoon</SelectItem>
                        <SelectItem value="HQ">HQ</SelectItem>
                        <SelectItem value="Doujinshi">Doujinshi</SelectItem>
                        <SelectItem value="One-shot">One-shot</SelectItem>
                        <SelectItem value="Light Novel">Light Novel</SelectItem>
                        <SelectItem value="Web Novel">Web Novel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-2 block text-muted-foreground">Status</Label>
                    <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                      <SelectTrigger className="bg-background/50 border-border/30 rounded-lg h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Em andamento">Em andamento</SelectItem>
                        <SelectItem value="Completo">Completo</SelectItem>
                        <SelectItem value="Hiato">Hiato</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-2 block text-muted-foreground">Ordenar</Label>
                    <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                      <SelectTrigger className="bg-background/50 border-border/30 rounded-lg h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popularity">Mais Popular</SelectItem>
                        <SelectItem value="rating">Melhor Avaliado</SelectItem>
                        <SelectItem value="recent">Mais Recente</SelectItem>
                        <SelectItem value="alphabetical">A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-2 block text-muted-foreground">Gêneros</Label>
                    <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {genres.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
                            selectedGenres.includes(genre)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background/50 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(ITEMS_PER_PAGE)].map((_, i) => <MangaCardSkeleton key={i} />)}
              </div>
            ) : filteredMangas.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum título encontrado</p>
                <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                  <X className="h-4 w-4 mr-2" /> Limpar Filtros
                </Button>
              </div>
            ) : (
              <>
                <motion.div
                  key={safePage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  {paginatedMangas.map((manga, index) => (
                    <MangaCard key={manga.id} {...manga} isHot={safePage === 1 && index === 0} isNew={safePage === 1 && (index === 1 || index === 2)} />
                  ))}
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="h-9 w-9 rounded-lg border-border/40" title="Primeira página">
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="h-9 w-9 rounded-lg border-border/40">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {getPageNumbers().map((page, i) =>
                        typeof page === 'string' ? (
                          <span key={page} className="px-1.5 text-muted-foreground text-sm select-none">…</span>
                        ) : (
                          <Button
                            key={page}
                            variant={page === safePage ? "default" : "outline"}
                            size="icon"
                            onClick={() => setCurrentPage(page)}
                            className={`h-9 w-9 rounded-lg text-sm font-medium ${
                              page === safePage
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 pointer-events-none'
                                : 'border-border/40 hover:bg-accent/80'
                            }`}
                          >
                            {page}
                          </Button>
                        )
                      )}

                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="h-9 w-9 rounded-lg border-border/40">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="h-9 w-9 rounded-lg border-border/40" title="Última página">
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Página <span className="font-semibold text-foreground">{safePage}</span> de <span className="font-semibold text-foreground">{totalPages}</span> — {filteredMangas.length} títulos
                    </p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
