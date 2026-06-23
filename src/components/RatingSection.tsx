import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRating, useSubmitRating } from "@/hooks/useRatings";
import { useToast } from "@/hooks/use-toast";

interface RatingSectionProps {
  titleId: string;
}

const RatingSection = ({ titleId }: RatingSectionProps) => {
  const { user } = useAuth();
  const { data: userRating } = useUserRating(titleId);
  const submitRating = useSubmitRating();
  const { toast } = useToast();
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const currentRating = userRating?.rating || 0;
  const displayRating = hoveredStar ?? currentRating;

  const handleRate = async (rating: number) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para avaliar",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitRating.mutateAsync({ titleId, rating });
      toast({
        title: "Avaliação registrada!",
        description: `Você avaliou com ${rating} estrela${rating > 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao avaliar",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card/50 rounded-lg p-4 border border-border/40">
      <p className="text-sm text-muted-foreground mb-3">Avalie esta obra</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(null)}
            disabled={submitRating.isPending}
            className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= displayRating
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
      {userRating && (
        <p className="text-xs text-muted-foreground mt-2">
          Sua avaliação: {userRating.rating} estrela{userRating.rating > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default RatingSection;
