import { BookOpen, Clock, Heart, Flame, TrendingUp, BookMarked } from 'lucide-react';
import { DetailedUserStats } from '@/hooks/useDetailedUserStats';

interface ProfileStatsProps {
  stats: DetailedUserStats | undefined;
  isLoading: boolean;
}

const ProfileStats = ({ stats, isLoading }: ProfileStatsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card/50 rounded-2xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const statCards = [
    {
      icon: BookOpen,
      value: stats?.chaptersRead || 0,
      label: 'Capítulos Lidos',
      color: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-400',
    },
    {
      icon: BookMarked,
      value: stats?.titlesRead || 0,
      label: 'Obras Lidas',
      color: 'from-purple-500/20 to-purple-600/10',
      iconColor: 'text-purple-400',
    },
    {
      icon: Heart,
      value: stats?.favoritesCount || 0,
      label: 'Favoritos',
      color: 'from-red-500/20 to-red-600/10',
      iconColor: 'text-red-400',
    },
    {
      icon: Clock,
      value: formatTime(stats?.estimatedReadingTime || 0),
      label: 'Tempo de Leitura',
      color: 'from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Flame,
      value: stats?.readingStreak || 0,
      label: 'Dias de Sequência',
      color: 'from-orange-500/20 to-orange-600/10',
      iconColor: 'text-orange-400',
    },
    {
      icon: TrendingUp,
      value: stats?.favoriteGenres?.[0]?.genre || '-',
      label: 'Gênero Favorito',
      color: 'from-primary/20 to-primary/10',
      iconColor: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} backdrop-blur-sm border border-border/50 p-4 group hover:border-primary/30 transition-all duration-300`}
        >
          <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <stat.icon className="h-16 w-16 -mt-2 -mr-2" />
          </div>
          <stat.icon className={`h-5 w-5 ${stat.iconColor} mb-2`} />
          <div className="font-bold text-xl truncate">{stat.value}</div>
          <div className="text-xs text-muted-foreground truncate">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
