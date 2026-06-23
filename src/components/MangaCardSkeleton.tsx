import { Skeleton } from "@/components/ui/skeleton";

const MangaCardSkeleton = () => {
  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="relative aspect-[3/4] bg-muted">
        <Skeleton className="w-full h-full" />
        <Skeleton className="absolute top-2 right-2 h-4 w-10 rounded" />
        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
          <Skeleton className="h-2.5 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
};

export default MangaCardSkeleton;
