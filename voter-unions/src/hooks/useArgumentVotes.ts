import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { ArgumentVote } from '../types';
import { useEmailVerificationGuard } from './useEmailVerificationGuard';

export const useUserVote = (argumentId: string, deviceId: string | null | undefined) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['userVote', argumentId, user?.id, deviceId],
    queryFn: async () => {
      if (!user || !deviceId) return null;
      
      const { data, error } = await supabase
        .from('argument_votes')
        .select('*')
        .eq('argument_id', argumentId)
        .eq('user_id', user.id)
        .eq('device_id', deviceId) // Critical: filter by device_id for per-device votes
        .maybeSingle();
      
      if (error) throw error;
      return data as ArgumentVote | null;
    },
    enabled: !!user && !!argumentId && !!deviceId,
  });
};

export const useVoteOnArgument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { guardAction } = useEmailVerificationGuard();

  return useMutation({
    mutationFn: async ({ argumentId, voteType, debateId, deviceId }: { 
      argumentId: string; 
      voteType: 'upvote' | 'downvote';
      debateId: string;
      deviceId: string;
    }) => {
      if (!user) throw new Error('Must be logged in to vote');
      if (!deviceId) throw new Error('Device verification in progress. Please wait and try again.');
      
      // Email verification guard
      const allowed = await guardAction('VOTE');
      if (!allowed) throw new Error('Email verification required');

      // Query by BOTH user_id AND device_id to ensure per-device vote tracking
      const { data: existingVote } = await supabase
        .from('argument_votes')
        .select('*')
        .eq('argument_id', argumentId)
        .eq('user_id', user.id)
        .eq('device_id', deviceId) // Critical: match by device_id too
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Same vote - remove it (toggle off)
          const { error } = await supabase
            .from('argument_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
          return { action: 'removed', voteType };
        } else {
          // Different vote - update it (change vote)
          const { error } = await supabase
            .from('argument_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
          return { action: 'changed', voteType };
        }
      } else {
        // No existing vote from this device - insert new
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
