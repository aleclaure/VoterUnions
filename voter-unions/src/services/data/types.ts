/**
 * Shared Data Types
 * 
 * Common types used across both Supabase and API data adapters.
 * These types represent the public interface for data access.
 */

/**
 * Public Profile (PII-free)
 * 
 * This excludes sensitive fields like email, last_seen, ip_address, etc.
 */
export interface Profile {
  id: string;
  display_name: string | null;
  username_normalized: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Union
 */
export interface Union {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  member_count: number;
  created_at: string;
  creator_id: string;
}

/**
 * Post
 */
export interface Post {
  id: string;
  content: string;
  union_id: string;
  channel_id: string | null;
  creator_id: string;
  created_at: string;
  comment_count: number;
  creator?: Profile;
}

/**
 * Comment
 */
export interface Comment {
  id: string;
  content: string;
  post_id: string;
  creator_id: string;
  created_at: string;
  creator?: Profile;
}

/**
 * Channel
 */
export interface Channel {
  id: string;
  name: string;
  description: string | null;
  union_id: string;
  creator_id: string;
  created_at: string;
  post_count: number;
}

/**
 * Data Adapter Interface
 * 
 * This defines all data operations that both Supabase and API adapters must implement.
 * Sensitive operations (writes) should throw errors when using Supabase adapter.
 */
export interface DataPort {
  // Profile Operations (Read-only on Supabase)
  getProfile(userId: string): Promise<Profile | null>;
  
  // Union Operations
  getUnion(unionId: string): Promise<Union | null>;
  getUnions(params?: { limit?: number; offset?: number }): Promise<Union[]>;
  
  // Post Operations
  getPost(postId: string): Promise<Post | null>;
  getPosts(unionId: string, channelId?: string): Promise<Post[]>;
  
  // Comment Operations
  getComments(postId: string): Promise<Comment[]>;
  
  // Channel Operations
  getChannels(unionId: string): Promise<Channel[]>;
  
  // Sensitive Operations (API-only)
  // These will throw errors on Supabase adapter
  joinUnion?(unionId: string): Promise<void>;
  createPost?(content: string, unionId: string, channelId?: string): Promise<Post>;
  createComment?(content: string, postId: string): Promise<Comment>;
  updateProfile?(updates: Partial<Profile>): Promise<Profile>;
}
