import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Channel } from '../types';
import { stripHtml } from '../lib/inputSanitization';

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

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', variables.unionId] });
    },
  });
};
