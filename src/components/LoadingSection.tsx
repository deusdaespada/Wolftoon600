import MangaCardSkeleton from "./MangaCardSkeleton";
import { Skeleton } from "./ui/skeleton";
import { Loader2 } from "lucide-react";

interface LoadingSectionProps {
  title?: string;
  count?: number;
  columns?: 2 | 3 | 4 | 6;
  showSpinner?: boolean;
}

const LoadingSection = ({ 
  title, 
  count = 6, 
  columns = 6,
  showSpinner = true 
}: LoadingSectionProps) => {
  const gridClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {showSpinner && (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          )}
          {title ? (
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
          ) : (
            <Skeleton className="h-8 w-40" />
          )}
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className={`grid ${gridClasses[columns]} gap-2`}>
        {Array.from({ length: count }).map((_, index) => (
          <div 
            key={index}
            className="animate-pulse"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MangaCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
};

export default LoadingSection;
