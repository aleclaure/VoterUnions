import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Post, PostReaction, Comment } from '../types';

export interface PostWithDetails extends Post {
  author_email?: string;
  author_display_name?: string;
  union_name?: string;
  channels?: { hashtag: string; id: string }[];
}

export const usePostReactionsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('post_reactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['posts'] });
          queryClient.invalidateQueries({ queryKey: ['posts', 'public'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

export const usePosts = (unionId?: string) => {
  return useQuery({
    queryKey: unionId ? ['posts', unionId] : ['posts'],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey(email, display_name),
          unions(name),
          post_channels(
            channels(id, hashtag)
          )
        `)
        .order('created_at', { ascending: false });

      if (unionId) {
        query = query.eq('union_id', unionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((post: any) => ({
        ...post,
        author_email: post.profiles?.email,
        author_display_name: post.profiles?.display_name,
        union_name: post.unions?.name,
        channels: (post.post_channels || [])
          .map((pc: any) => pc?.channels)
          .filter((c: any) => c != null) || [],
      })) as PostWithDetails[];
    },
  });
};

export const usePublicPosts = () => {
  return useQuery({
    queryKey: ['posts', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey(email, display_name),
          unions(name),
          post_channels(
            channels(id, hashtag)
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((post: any) => ({
        ...post,
        author_email: post.profiles?.email,
        author_display_name: post.profiles?.display_name,
        union_name: post.unions?.name,
        channels: (post.post_channels || [])
          .map((pc: any) => pc?.channels)
          .filter((c: any) => c != null) || [],
      })) as PostWithDetails[];
    },
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      unionId,
      content,
      channelIds,
      isPublic,
      userId,
    }: {
      unionId: string;
      content: string;
      channelIds: string[];
      isPublic: boolean;
      userId: string;
    }) => {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          union_id: unionId,
          author_id: userId,
          content,
          is_public: isPublic,
        })
        .select()
        .single();

      if (postError) throw postError;

      if (channelIds.length > 0) {
        const { error: channelsError } = await supabase
          .from('post_channels')
          .insert(
            channelIds.map((channelId) => ({
              post_id: post.id,
              channel_id: channelId,
            }))
          );

        if (channelsError) throw channelsError;
      }

      return post;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', variables.unionId] });
      if (variables.isPublic) {
        queryClient.invalidateQueries({ queryKey: ['posts', 'public'] });
      }
      if (variables.channelIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['channels', variables.unionId] });
      }
    },
  });
};

export const usePostReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      reactionType,
    }: {
      postId: string;
      userId: string;
      reactionType: 'upvote' | 'downvote';
    }) => {
      const { data: existing } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
          return null;
        } else {
          const { data, error } = await supabase
            .from('post_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      } else {
        const { data, error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'public'] });
      queryClient.invalidateQueries({ queryKey: ['post-reactions', variables.postId, variables.userId] });
    },
  });
};

export const useUserPostReaction = (postId: string, userId: string | undefined) => {
  return useQuery({
    queryKey: ['post-reactions', postId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PostReaction | null;
    },
    enabled: !!userId && !!postId,
  });
};

export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_author_id_fkey(email, display_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((comment: any) => ({
        ...comment,
        author_email: comment.profiles?.email,
        author_display_name: comment.profiles?.display_name,
      }));
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      content,
    }: {
      postId: string;
      userId: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'public'] });
    },
  });
};
