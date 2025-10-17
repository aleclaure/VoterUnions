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
          unions(name),
          post_channels(
            channels(id, hashtag)
          )
        `)
        .order('created_at', { ascending: false });

      if (unionId) {
        query = query.eq('union_id', unionId);
      }

      const { data: posts, error } = await query;

      if (error) {
        console.error('❌ Error fetching posts:', error);
        throw error;
      }

      // Fetch profiles separately and join manually
      const authorIds = [...new Set(posts?.map(p => p.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, username_normalized')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      console.log(`📥 Posts fetched for ${unionId ? `union ${unionId}` : 'all unions'}:`, {
        count: posts?.length || 0,
        posts: posts?.map(p => ({
          id: p.id.substring(0, 8),
          union: p.unions?.name,
          channels: (p.post_channels || []).map((pc: any) => pc?.channels?.hashtag).filter(Boolean),
          hasAuthor: !!profileMap.get(p.author_id)?.display_name
        }))
      });

      return (posts || []).map((post: any) => {
        const author = profileMap.get(post.author_id);
        return {
          ...post,
          author_email: author?.email,
          author_display_name: author?.display_name,
          union_name: post.unions?.name,
          channels: (post.post_channels || [])
            .map((pc: any) => pc?.channels)
            .filter((c: any) => c != null) || [],
        };
      }) as PostWithDetails[];
    },
  });
};

export const usePublicPosts = () => {
  return useQuery({
    queryKey: ['posts', 'public'],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          unions(name),
          post_channels(
            channels(id, hashtag)
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching public posts:', error);
        throw error;
      }

      // Fetch profiles separately and join manually
      const authorIds = [...new Set(posts?.map(p => p.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, username_normalized')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      console.log('📥 Public posts fetched:', {
        count: posts?.length || 0,
        posts: posts?.map(p => ({
          id: p.id.substring(0, 8),
          union: p.unions?.name,
          channels: (p.post_channels || []).map((pc: any) => pc?.channels?.hashtag).filter(Boolean),
          hasAuthor: !!profileMap.get(p.author_id)?.display_name
        }))
      });

      return (posts || []).map((post: any) => {
        const author = profileMap.get(post.author_id);
        return {
          ...post,
          author_email: author?.email,
          author_display_name: author?.display_name,
          union_name: post.unions?.name,
          channels: (post.post_channels || [])
            .map((pc: any) => pc?.channels)
            .filter((c: any) => c != null) || [],
        };
      }) as PostWithDetails[];
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
      console.log('📝 Creating post:', { 
        unionId, 
        content: content.substring(0, 50) + '...', 
        channelIds, 
        isPublic,
        userId 
      });
      
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

      if (postError) {
        console.error('❌ Error creating post:', postError);
        throw postError;
      }

      console.log('✅ Post created successfully!', {
        postId: post.id,
        unionId: post.union_id,
        isPublic: post.is_public,
        willAppearIn: [
          post.is_public ? 'All Posts page (public)' : null,
          `Union: ${unionId}`,
          channelIds.length > 0 ? `Channels: ${channelIds.length}` : 'No specific channels (will show in union All view)'
        ].filter(Boolean)
      });

      if (channelIds.length > 0) {
        console.log('🔗 Linking post to channels...', channelIds);
        const { error: channelsError } = await supabase
          .from('post_channels')
          .insert(
            channelIds.map((channelId) => ({
              post_id: post.id,
              channel_id: channelId,
            }))
          );

        if (channelsError) {
          console.error('❌ Error linking post to channels:', channelsError);
          throw channelsError;
        }
        console.log('✅ Post linked to', channelIds.length, 'channel(s)');
      } else {
        console.log('ℹ️ No channels selected - post will appear in union "All" view only');
      }

      return post;
    },
    onSuccess: (data, variables) => {
      console.log('Invalidating queries after post creation');
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
      deviceId,
    }: {
      postId: string;
      userId: string;
      reactionType: 'upvote' | 'downvote';
      deviceId?: string | null;
    }) => {
      if (!deviceId) {
        throw new Error('Device verification in progress. Please wait and try again.');
      }
      
      // Query by BOTH user_id AND device_id to ensure per-device vote tracking
      const { data: existing } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('device_id', deviceId) // Critical: match by device_id too
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Same reaction - remove it (toggle off)
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
          return null;
        } else {
          // Different reaction - update it (change vote)
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
        // No existing reaction from this device - insert new
        const { data, error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
            device_id: deviceId,
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

export const useUserPostReaction = (postId: string, userId: string | undefined, deviceId: string | null | undefined) => {
  return useQuery({
    queryKey: ['post-reactions', postId, userId, deviceId],
    queryFn: async () => {
      if (!userId || !deviceId) return null;

      const { data, error } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('device_id', deviceId) // Critical: filter by device_id for per-device reactions
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (error) throw error;
      return data as PostReaction | null;
    },
    enabled: !!userId && !!postId && !!deviceId,
  });
};

export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately and join manually
      const authorIds = [...new Set(comments?.map(c => c.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, username_normalized')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (comments || []).map((comment: any) => {
        const author = profileMap.get(comment.author_id);
        return {
          ...comment,
          author_email: author?.email,
          author_display_name: author?.display_name,
        };
      });
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
