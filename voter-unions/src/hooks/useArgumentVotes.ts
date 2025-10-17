import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { ArgumentVote } from '../types';

export const useUserVote = (argumentId: string) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['userVote', argumentId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('argument_votes')
        .select('*')
        .eq('argument_id', argumentId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ArgumentVote | null;
    },
    enabled: !!user && !!argumentId,
  });
};

export const useVoteOnArgument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ argumentId, voteType, debateId, deviceId }: { 
      argumentId: string; 
      voteType: 'upvote' | 'downvote';
      debateId: string;
      deviceId: string;
    }) => {
      if (!user) throw new Error('Must be logged in to vote');
      if (!deviceId) throw new Error('Device verification in progress. Please wait and try again.');

      const { data: existingVote } = await supabase
        .from('argument_votes')
        .select('*')
        .eq('argument_id', argumentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from('argument_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
          return { action: 'removed', voteType };
        } else {
          const { error } = await supabase
            .from('argument_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
          return { action: 'changed', voteType };
        }
      } else {
        const { error } = await supabase
          .from('argument_votes')
          .insert({
            argument_id: argumentId,
            user_id: user.id,
            vote_type: voteType,
            device_id: deviceId,
          });
        if (error) throw error;
        return { action: 'added', voteType };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['arguments', variables.debateId] });
      queryClient.invalidateQueries({ queryKey: ['userVote', variables.argumentId] });
      queryClient.invalidateQueries({ queryKey: ['debateStats', variables.debateId] });
    },
  });
};
