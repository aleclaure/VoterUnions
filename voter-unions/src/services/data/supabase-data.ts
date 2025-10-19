/**
 * Supabase Data Adapter
 * 
 * READ-ONLY adapter for legacy Supabase backend.
 * 
 * Security Constraints:
 * - Only GET operations (no create/update/delete)
 * - Column allow-list (no select('*') to prevent PII exposure)
 * - Uses public views when available
 * - Anon key only (no user session tokens)
 * 
 * This adapter is used during migration when USE_NEW_BACKEND=false.
 */

import { supabase } from '../supabase';
import type { Profile, Union, Post, Comment, Channel } from './types';

/**
 * Get user profile (PII-free)
 * 
 * Security: Explicitly lists safe columns only
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username_normalized, bio, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception fetching profile:', err);
    return null;
  }
};

/**
 * Get union by ID
 */
export const getUnion = async (unionId: string): Promise<Union | null> => {
  try {
    const { data, error } = await supabase
      .from('unions')
      .select('id, name, description, category, image_url, member_count, created_at, creator_id')
      .eq('id', unionId)
      .single();

    if (error) {
      console.error('Error fetching union:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception fetching union:', err);
    return null;
  }
};

/**
 * Get list of unions
 */
export const getUnions = async (params?: { limit?: number; offset?: number }): Promise<Union[]> => {
  try {
    let query = supabase
      .from('unions')
      .select('id, name, description, category, image_url, member_count, created_at, creator_id')
      .order('created_at', { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching unions:', err);
    return [];
  }
};

/**
 * Get post by ID
 */
export const getPost = async (postId: string): Promise<Post | null> => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        union_id,
        channel_id,
        creator_id,
        created_at,
        comment_count,
        creator:profiles(id, display_name, avatar_url)
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return null;
    }

    return data as any;
  } catch (err) {
    console.error('Exception fetching post:', err);
    return null;
  }
};

/**
 * Get posts for a union/channel
 */
export const getPosts = async (unionId: string, channelId?: string): Promise<Post[]> => {
  try {
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        union_id,
        channel_id,
        creator_id,
        created_at,
        comment_count,
        creator:profiles(id, display_name, avatar_url)
      `)
      .eq('union_id', unionId)
      .order('created_at', { ascending: false });

    if (channelId) {
      query = query.eq('channel_id', channelId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    return (data || []) as any;
  } catch (err) {
    console.error('Exception fetching posts:', err);
    return [];
  }
};

/**
 * Get comments for a post
 */
export const getComments = async (postId: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        post_id,
        creator_id,
        created_at,
        creator:profiles(id, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return (data || []) as any;
  } catch (err) {
    console.error('Exception fetching comments:', err);
    return [];
  }
};

/**
 * Get channels for a union
 */
export const getChannels = async (unionId: string): Promise<Channel[]> => {
  try {
    const { data, error } = await supabase
      .from('channels')
      .select('id, name, description, union_id, creator_id, created_at, post_count')
      .eq('union_id', unionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching channels:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching channels:', err);
    return [];
  }
};

/**
 * ❌ WRITE OPERATIONS ARE NOT EXPORTED
 * 
 * All write operations (create, update, delete) are intentionally not exported.
 * This enforces read-only access to Supabase during migration.
 * 
 * Write operations should go through the API adapter only.
 */
