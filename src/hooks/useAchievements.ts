import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDetailedUserStats } from './useDetailedUserStats';
import { useEffect } from 'react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: (stats: any) => boolean;
  category: 'reading' | 'social' | 'collection' | 'time';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  // Reading achievements
  {
    id: 'first_chapter',
    name: 'Primeiro Passo',
    description: 'Leu seu primeiro capítulo',
    icon: '📖',
    category: 'reading',
    rarity: 'common',
    requirement: (stats) => (stats?.chaptersRead || 0) >= 1,
  },
  {
    id: 'avid_reader',
    name: 'Leitor Ávido',
    description: 'Leu mais de 100 capítulos',
    icon: '📚',
    category: 'reading',
    rarity: 'rare',
    requirement: (stats) => (stats?.chaptersRead || 0) >= 100,
  },
  {
    id: 'bookworm',
    name: 'Devorador de Páginas',
    description: 'Leu mais de 500 capítulos',
    icon: '🐛',
    category: 'reading',
    rarity: 'epic',
    requirement: (stats) => (stats?.chaptersRead || 0) >= 500,
  },
  {
    id: 'legend_reader',
    name: 'Lenda da Leitura',
    description: 'Leu mais de 1000 capítulos',
    icon: '👑',
    category: 'reading',
    rarity: 'legendary',
    requirement: (stats) => (stats?.chaptersRead || 0) >= 1000,
  },
  // Genre achievements
  {
    id: 'manhwa_fan',
    name: 'Fã de Manhwa',
    description: 'Manhwa é seu gênero mais lido',
    icon: '🇰🇷',
    category: 'reading',
    rarity: 'rare',
    requirement: (stats) => stats?.typeDistribution?.[0]?.type === 'Manhwa',
  },
  {
    id: 'manga_fan',
    name: 'Fã de Mangá',
    description: 'Mangá é seu gênero mais lido',
    icon: '🇯🇵',
    category: 'reading',
    rarity: 'rare',
    requirement: (stats) => stats?.typeDistribution?.[0]?.type === 'Manga',
  },
  {
    id: 'manhua_fan',
    name: 'Fã de Manhua',
    description: 'Manhua é seu gênero mais lido',
    icon: '🇨🇳',
    category: 'reading',
    rarity: 'rare',
    requirement: (stats) => stats?.typeDistribution?.[0]?.type === 'Manhua',
  },
  {
    id: 'novel_lover',
    name: 'Amante de Novels',
    description: 'Novel é seu tipo mais lido',
    icon: '📝',
    category: 'reading',
    rarity: 'rare',
    requirement: (stats) => stats?.typeDistribution?.[0]?.type === 'Novel',
  },
  // Collection achievements
  {
    id: 'collector_10',
    name: 'Colecionador',
    description: 'Adicionou 10 obras aos favoritos',
    icon: '⭐',
    category: 'collection',
    rarity: 'common',
    requirement: (stats) => (stats?.favoritesCount || 0) >= 10,
  },
  {
    id: 'collector_50',
    name: 'Grande Colecionador',
    description: 'Adicionou 50 obras aos favoritos',
    icon: '💫',
    category: 'collection',
    rarity: 'rare',
    requirement: (stats) => (stats?.favoritesCount || 0) >= 50,
  },
  // Time achievements
  {
    id: 'time_10h',
    name: 'Dedicado',
    description: 'Passou 10 horas lendo',
    icon: '⏰',
    category: 'time',
    rarity: 'common',
    requirement: (stats) => ((stats?.estimatedReadingTime || 0) / 60) >= 10,
  },
  {
    id: 'time_100h',
    name: 'Maratonista',
    description: 'Passou 100 horas lendo',
    icon: '🏃',
    category: 'time',
    rarity: 'epic',
    requirement: (stats) => ((stats?.estimatedReadingTime || 0) / 60) >= 100,
  },
  // Streak achievements
  {
    id: 'streak_7',
    name: 'Constante',
    description: 'Manteve uma sequência de 7 dias',
    icon: '🔥',
    category: 'time',
    rarity: 'rare',
    requirement: (stats) => (stats?.readingStreak || 0) >= 7,
  },
  {
    id: 'streak_30',
    name: 'Incansável',
    description: 'Manteve uma sequência de 30 dias',
    icon: '🌟',
    category: 'time',
    rarity: 'legendary',
    requirement: (stats) => (stats?.readingStreak || 0) >= 30,
  },
  // Genre diversity
  {
    id: 'genre_explorer',
    name: 'Explorador',
    description: 'Leu obras de 5 gêneros diferentes',
    icon: '🗺️',
    category: 'reading',
    rarity: 'rare',
    requirement: (stats) => (stats?.favoriteGenres?.length || 0) >= 5,
  },
];

export const useAchievements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: stats } = useDetailedUserStats(user?.id);

  const unlockedQuery = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const unlockMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
        })
        .select()
        .single();

      if (error && !error.message.includes('duplicate')) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-achievements', user?.id] });
    },
  });

  // Check for new achievements when stats change
  useEffect(() => {
    if (!stats || !user || !unlockedQuery.data) return;

    const unlockedIds = new Set(unlockedQuery.data.map(a => a.achievement_id));
    
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlockedIds.has(achievement.id) && achievement.requirement(stats)) {
        unlockMutation.mutate(achievement.id);
      }
    });
  }, [stats, user, unlockedQuery.data]);

  const unlockedAchievements = ACHIEVEMENTS.filter(a => 
    unlockedQuery.data?.some(ua => ua.achievement_id === a.id)
  );

  const lockedAchievements = ACHIEVEMENTS.filter(a => 
    !unlockedQuery.data?.some(ua => ua.achievement_id === a.id)
  );

  return {
    achievements: ACHIEVEMENTS,
    unlocked: unlockedAchievements,
    locked: lockedAchievements,
    isLoading: unlockedQuery.isLoading,
    totalPoints: unlockedAchievements.reduce((acc, a) => {
      switch (a.rarity) {
        case 'legendary': return acc + 100;
        case 'epic': return acc + 50;
        case 'rare': return acc + 25;
        default: return acc + 10;
      }
    }, 0),
  };
};
