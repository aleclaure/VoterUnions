import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface DebateStats {
  pro: { count: number; votes: number };
  con: { count: number; votes: number };
  neutral: { count: number; votes: number };
  total: number;
}

export const useDebateStats = (debateId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['debateStats', debateId],
    queryFn: async () => {
      const { data: argumentsData, error } = await supabase
        .from('arguments')
        .select('id, stance, upvotes, downvotes')
        .eq('debate_id', debateId)
        .is('parent_id', null);

      if (error) throw error;

      const stats: DebateStats = {
        pro: { count: 0, votes: 0 },
        con: { count: 0, votes: 0 },
        neutral: { count: 0, votes: 0 },
        total: 0,
      };

      argumentsData?.forEach((arg) => {
        const voteScore = (arg.upvotes || 0) - (arg.downvotes || 0);
        const stance = arg.stance as 'pro' | 'con' | 'neutral';
        stats[stance].count += 1;
        stats[stance].votes += voteScore;
        stats.total += 1;
      });

      return stats;
    },
    enabled: !!debateId,
  });

  useEffect(() => {
    if (!debateId) return;

    const channel = supabase
      .channel(`debate-${debateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arguments',
          filter: `debate_id=eq.${debateId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['debateStats', debateId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'argument_votes',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['debateStats', debateId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [debateId, queryClient]);

  return query;
};
