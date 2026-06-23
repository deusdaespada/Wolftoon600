import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import wolfLogo from '@/assets/wolftoon-wolf-logo.png';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  showText?: boolean;
}

const BrandLogo = ({ className, compact = false, showText = true }: BrandLogoProps) => {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 shrink-0', className)}>
      <img
        src={wolfLogo}
        alt="Logo da Wolftoon"
        className={cn(
          'rounded-xl object-cover ring-1 ring-border/50 shadow-lg shadow-primary/10',
          compact ? 'h-9 w-9' : 'h-10 w-10',
        )}
      />
      {showText ? (
        <div className="hidden sm:block leading-none">
          <div className="text-lg font-black tracking-tight text-foreground">Wolftoon</div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-primary/80">Wolf Realm</div>
        </div>
      ) : null}
    </Link>
  );
};

export default BrandLogo;
