import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, BookOpen, Crown, Star, Flame, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankedUser {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  score: number;
  chapters_read?: number;
  achievements_count?: number;
}

const useRankings = () => {
  const chaptersRanking = useQuery({
    queryKey: ['ranking-chapters'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_chapter_reading_rankings', { _limit: 50 });
      if (error) throw error;
      return (data || []) as RankedUser[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const combinedRanking = useQuery({
    queryKey: ['ranking-combined'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_reading_rankings', { _limit: 50 });
      if (error) throw error;
      return (data || []) as RankedUser[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return { chapters: chaptersRanking, combined: combinedRanking };
};

const RankingRow = ({ user, rank }: { user: RankedUser; rank: number }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 transition-all',
        rank === 1 && 'border-primary/30 bg-primary/10',
        rank === 2 && 'border-secondary/40 bg-secondary/20',
        rank === 3 && 'border-accent-cyan/30 bg-accent-cyan/10',
        rank > 3 && 'border-border/30 bg-card/40 hover:border-border/60',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          rank === 1 && 'bg-primary text-primary-foreground',
          rank === 2 && 'bg-secondary text-secondary-foreground',
          rank === 3 && 'bg-accent-cyan text-background',
          rank > 3 && 'bg-muted text-muted-foreground',
        )}
      >
        {rank <= 3 ? rank === 1 ? <Crown className="h-4 w-4" /> : rank === 2 ? <Medal className="h-4 w-4" /> : <Award className="h-4 w-4" /> : rank}
      </div>

      <Avatar className="h-10 w-10 border border-border/50">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="bg-muted">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <h3 className={cn('truncate text-sm font-semibold', rank === 1 && 'text-primary')}>
          {user.username || 'Anônimo'}
        </h3>
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          {user.chapters_read !== undefined ? (
            <span className="flex items-center gap-0.5">
              <BookOpen className="h-3 w-3" />
              {user.chapters_read} caps
            </span>
          ) : null}
          {user.achievements_count !== undefined && user.achievements_count > 0 ? (
            <span className="flex items-center gap-0.5">
              <Trophy className="h-3 w-3" />
              {user.achievements_count}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold', rank === 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground')}>
        <Star className="h-3.5 w-3.5" />
        {user.score}
      </div>
    </div>
  );
};

export default function Ranking() {
  const [activeTab, setActiveTab] = useState<'combined' | 'chapters'>('combined');
  const rankings = useRankings();
  const data = activeTab === 'combined' ? rankings.combined.data : rankings.chapters.data;
  const isLoading = activeTab === 'combined' ? rankings.combined.isLoading : rankings.chapters.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="mb-1 flex items-center gap-3 text-3xl font-bold">
            <Trophy className="h-8 w-8 text-primary" />
            Ranking de Leitores
          </h1>
          <p className="text-sm text-muted-foreground">Os leitores mais dedicados da plataforma</p>
        </div>

        <div className="mb-6 flex w-fit gap-1.5 rounded-xl border border-border/30 bg-card/50 p-1">
          <button
            onClick={() => setActiveTab('combined')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'combined' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Flame className="h-4 w-4" /> Geral
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'chapters' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BookOpen className="h-4 w-4" /> Capítulos
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="py-16 text-center">
            <Trophy className="mx-auto mb-4 h-14 w-14 text-muted-foreground/20" />
            <p className="text-muted-foreground">Nenhum ranking disponível ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((user, i) => (
              <RankingRow key={user.user_id} user={user} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
