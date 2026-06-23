import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Star, Eye, Flame, Sparkles } from "lucide-react";
import { memo, useState, useCallback } from "react";

import type { TitleStatus } from "@/lib/titleFormOptions";

export interface MangaCardProps {
  id: string;
  title: string;
  cover: string;
  type: string;
  rating: number;
  chapters?: number;
  status: TitleStatus;
  genres: string[];
  views: number;
  slug?: string | null;
  isHot?: boolean;
  isNew?: boolean;
  rank?: number;
  author?: string;
  artist?: string;
}

const MangaCard = memo(({ 
  id, title, cover, type, rating, chapters, status, genres, views, slug, isHot, isNew, rank, author, artist
}: MangaCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const handleImageLoad = useCallback(() => setImageLoaded(true), []);

  const formatViews = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  const displayCreator = artist && artist !== author ? `${author} / ${artist}` : author;

  return (
    <Link 
      to={`/manga/${slug || id}`}
      className="group relative block rounded-lg overflow-hidden"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        {!imageLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
        
        <img 
          src={cover} 
          alt={title}
          loading="lazy"
          onLoad={handleImageLoad}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

        {/* Top left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {rank && rank <= 3 && (
            <div className={`
              w-6 h-6 flex items-center justify-center rounded-md font-black text-xs
              ${rank === 1 
                ? 'bg-yellow-400 text-yellow-950' 
                : rank === 2 
                ? 'bg-slate-300 text-slate-900' 
                : 'bg-orange-400 text-orange-950'
              }
            `}>
              {rank}
            </div>
          )}
          {isHot && !rank && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white">
              <Flame className="h-2.5 w-2.5" /> HOT
            </div>
          )}
          {isNew && !isHot && !rank && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500 rounded text-[10px] font-bold text-white">
              <Sparkles className="h-2.5 w-2.5" /> NEW
            </div>
          )}
        </div>

        {/* Type badge top right */}
        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-0 text-[10px] px-1.5 py-0 font-semibold rounded">
          {type}
        </Badge>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h3 className="font-semibold text-[11px] md:text-xs text-white line-clamp-2 leading-tight mb-0.5">
            {title}
          </h3>
          {displayCreator && (
            <p className="text-[9px] text-white/50 truncate mb-1">
              {displayCreator}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[9px] text-white/70">
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {rating.toFixed(1)}
            </span>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-0.5">
              <Eye className="h-2.5 w-2.5" />
              {formatViews(views)}
            </span>
            {chapters !== undefined && (
              <>
                <span className="text-white/30">•</span>
                <span>{chapters} caps</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

MangaCard.displayName = 'MangaCard';

export default MangaCard;
