import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Channel } from '../types';
import { stripHtml } from '../lib/inputSanitization';
import { rateLimiter } from '../services/rateLimit';
import { useEmailVerificationGuard } from './useEmailVerificationGuard';

export const useChannels = (unionId: string) => {
  return useQuery({
    queryKey: ['channels', unionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('union_id', unionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Channel[];
    },
    enabled: !!unionId,
  });
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  const { guardAction } = useEmailVerificationGuard();

  return useMutation({
    mutationFn: async ({
      unionId,
      name,
      hashtag,
      description,
      isPublic,
      userId,
    }: {
      unionId: string;
      name: string;
      hashtag: string;
      description?: string;
      isPublic: boolean;
      userId: string;
    }) => {
      // Email verification guard
      const allowed = await guardAction('CREATE_CHANNEL');
      if (!allowed) throw new Error('Email verification required');
      
      // Rate limiting check
      const rateLimit = await rateLimiter.checkRateLimit('createChannel', userId);
      if (rateLimit.isBlocked && rateLimit.timeRemaining) {
        const timeStr = rateLimiter.formatTimeRemaining(rateLimit.timeRemaining);
        throw new Error(`Too many channels created. Please wait ${timeStr} before creating another channel.`);
      }
      
      // Sanitize inputs to prevent XSS attacks
      const sanitizedName = stripHtml(name);
      const sanitizedHashtag = stripHtml(hashtag);
      const sanitizedDescription = description ? stripHtml(description) : undefined;
      
      const { data, error } = await supabase
        .from('channels')
        .insert({
          union_id: unionId,
          name: sanitizedName,
          hashtag: sanitizedHashtag.startsWith('#') ? sanitizedHashtag : `#${sanitizedHashtag}`,
          description: sanitizedDescription,
          is_public: isPublic,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        await rateLimiter.recordAttempt('createChannel', userId);
        throw error;
      }
      
      // Clear rate limit on success
      await rateLimiter.clearLimit('createChannel', userId);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', variables.unionId] });
    },
  });
};
