import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Channel } from '../types';

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
      const { data, error } = await supabase
        .from('channels')
        .insert({
          union_id: unionId,
          name,
          hashtag: hashtag.startsWith('#') ? hashtag : `#${hashtag}`,
          description,
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
