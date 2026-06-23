import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Poll {
  id: string;
  title_id: string | null;
  chapter_id: string | null;
  user_id: string;
  question: string;
  options: string[];
  ends_at: string | null;
  created_at: string;
  username?: string;
  avatar_url?: string;
  votes: { option_index: number; count: number }[];
  total_votes: number;
  user_vote?: number | null;
}

export const usePolls = (titleId?: string, chapterId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pollsQuery = useQuery({
    queryKey: ['polls', titleId, chapterId],
    queryFn: async () => {
      let query = supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (titleId) {
        query = query.eq('title_id', titleId);
      }
      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { data: polls, error } = await query;
      if (error) throw error;

      // Get votes for each poll
      const pollsWithVotes = await Promise.all(
        (polls || []).map(async (poll) => {
          // Get profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', poll.user_id)
            .maybeSingle();

          // Get all votes for this poll
          const { data: votes } = await supabase
            .from('poll_votes')
            .select('option_index')
            .eq('poll_id', poll.id);

          // Count votes per option
          const voteCounts: Record<number, number> = {};
          const options = poll.options as string[];
          options.forEach((_, idx) => {
            voteCounts[idx] = 0;
          });
          
          (votes || []).forEach((vote) => {
            voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
          });

          // Get user's vote if logged in
          let userVote = null;
          if (user) {
            const { data: userVoteData } = await supabase
              .from('poll_votes')
              .select('option_index')
              .eq('poll_id', poll.id)
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (userVoteData) {
              userVote = userVoteData.option_index;
            }
          }

          return {
            ...poll,
            options: options,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            votes: Object.entries(voteCounts).map(([idx, count]) => ({
              option_index: parseInt(idx),
              count,
            })),
            total_votes: votes?.length || 0,
            user_vote: userVote,
          } as Poll;
        })
      );

      return pollsWithVotes;
    },
    enabled: !!(titleId || chapterId),
  });

  const createPoll = useMutation({
    mutationFn: async ({
      question,
      options,
      titleId,
      chapterId,
      endsAt,
    }: {
      question: string;
      options: string[];
      titleId?: string;
      chapterId?: string;
      endsAt?: Date;
    }) => {
      if (!user) throw new Error('Você precisa estar logado');

      const { error } = await supabase.from('polls').insert({
        question,
        options,
        title_id: titleId || null,
        chapter_id: chapterId || null,
        user_id: user.id,
        ends_at: endsAt?.toISOString() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', titleId, chapterId] });
    },
  });

  const vote = useMutation({
    mutationFn: async ({
      pollId,
      optionIndex,
    }: {
      pollId: string;
      optionIndex: number;
    }) => {
      if (!user) throw new Error('Você precisa estar logado');

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('poll_votes')
          .update({ option_index: optionIndex })
          .eq('poll_id', pollId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new vote
        const { error } = await supabase.from('poll_votes').insert({
          poll_id: pollId,
          user_id: user.id,
          option_index: optionIndex,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', titleId, chapterId] });
    },
  });

  const deletePoll = useMutation({
    mutationFn: async (pollId: string) => {
      if (!user) throw new Error('Você precisa estar logado');

      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', titleId, chapterId] });
    },
  });

  return {
    polls: pollsQuery.data || [],
    isLoading: pollsQuery.isLoading,
    createPoll,
    vote,
    deletePoll,
    isCreating: createPoll.isPending,
    isVoting: vote.isPending,
  };
};
