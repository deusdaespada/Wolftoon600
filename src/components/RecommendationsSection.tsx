import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import MangaCard from "@/components/MangaCard";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useAuth } from "@/contexts/AuthContext";

interface Title {
  id: string;
  title: string;
  cover: string;
  type: "Mangá" | "Manhua" | "Manhwa" | "Novel";
  genres: string[];
  rating: number;
  views: number;
  status: string;
  year: number;
  author: string;
  synopsis: string;
}

const RecommendationsSection = () => {
  const { user } = useAuth();
  const { data: recommendations, isLoading } = useRecommendations(6);

  if (!user || isLoading || !recommendations?.length) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="font-display text-3xl font-semibold">Recomendados para Você</h2>
        </div>
        <Button variant="ghost" className="text-primary hover:text-primary-glow" asChild>
          <Link to="/catalog">
            Ver todos <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {recommendations.map((manga, index) => (
          <div 
            key={manga.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <MangaCard 
              id={manga.id}
              title={manga.title}
              cover={manga.cover}
              type={manga.type as "Mangá" | "Manhua" | "Manhwa" | "Novel"}
              genres={manga.genres}
              rating={manga.rating}
              views={manga.views}
              status={manga.status as "Completo" | "Em andamento"}
              slug={manga.slug}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendationsSection;
