import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import MangaCard from "@/components/MangaCard";
import { useTitles } from "@/hooks/useTitles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, Filter } from "lucide-react";
import { TITLE_STATUS_OPTIONS } from "@/lib/titleFormOptions";

const Search = () => {
  const { data: titles, isLoading } = useTitles();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchResults, setSearchResults] = useState(titles || []);

  const allGenres = Array.from(new Set(titles?.flatMap((t) => t.genres) || [])).sort();

  useEffect(() => {
    if (!titles) return;

    let filtered = titles;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (manga) =>
          manga.title.toLowerCase().includes(q) ||
          manga.author.toLowerCase().includes(q) ||
          manga.artist?.toLowerCase().includes(q) ||
          manga.alternative_titles?.some((alt) => alt.toLowerCase().includes(q)) ||
          manga.genres.some((genre) => genre.toLowerCase().includes(q)),
      );
    }

    if (selectedGenre !== "all") {
      filtered = filtered.filter((manga) => manga.genres.includes(selectedGenre));
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((manga) => manga.type === selectedType);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((manga) => manga.status === selectedStatus);
    }

    setSearchResults(filtered);
  }, [titles, searchQuery, selectedGenre, selectedType, selectedStatus]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto mb-12 max-w-4xl">
          <h1 className="mb-4 text-center font-display text-4xl font-semibold">Busca</h1>
          <p className="mb-8 text-center text-muted-foreground">Encontre seu próximo manhwa, manhua ou mangá favorito</p>

          <div className="relative mb-6">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título, autor, artista ou gênero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 border-border/40 bg-card pl-12 text-lg focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Gênero
              </label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="border-border/40 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Gêneros</SelectItem>
                  {allGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Tipo
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="border-border/40 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="Manhwa">Manhwa</SelectItem>
                  <SelectItem value="Manhua">Manhua</SelectItem>
                  <SelectItem value="Mangá">Mangá</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="border-border/40 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {TITLE_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold mb-4">
            {searchQuery
              ? `${searchResults.length} ${searchResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} para "${searchQuery}"`
              : `Todos os títulos (${searchResults.length})`}
          </h2>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {searchResults.map((manga, index) => (
              <div key={manga.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <MangaCard {...manga} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="mb-4">
              <SearchIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
              <h3 className="mb-2 font-display text-2xl font-semibold">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">Tente buscar com outros termos ou explore nosso catálogo completo</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre("all");
                setSelectedType("all");
                setSelectedStatus("all");
              }}
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
