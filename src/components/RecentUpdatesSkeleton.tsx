import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Zap } from "lucide-react";

const RecentUpdatesSkeleton = () => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Zap className="h-6 w-6 text-primary fill-primary" />
          <h2 className="font-display text-3xl font-semibold">Atualizações Recentes</h2>
          <Loader2 className="h-5 w-5 text-primary animate-spin ml-2" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div 
            key={index}
            className="bg-card border border-border/40 rounded-xl overflow-hidden animate-pulse"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex gap-4 p-4">
              {/* Cover skeleton */}
              <Skeleton className="w-20 h-28 md:w-24 md:h-32 rounded-lg shrink-0" />

              {/* Content skeleton */}
              <div className="flex-1 space-y-3">
                {/* Title and time */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-36" />
                </div>

                {/* Chapters skeleton */}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentUpdatesSkeleton;
