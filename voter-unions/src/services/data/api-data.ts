/**
 * API Data Adapter
 * 
 * Privacy-first adapter for new microservices backend.
 * 
 * Features:
 * - WebAuthn JWT authentication
 * - Zero-knowledge architecture
 * - Encrypted memberships
 * - Blind-signature voting
 * - E2EE messaging
 * 
 * This adapter will be implemented in Week 3-5.
 * For now, it returns clear error messages indicating the API is not ready.
 */

import { CONFIG } from '../../config';
import type { Profile, Union, Post, Comment, Channel, DataPort } from './types';

/**
 * Helper to call API endpoints
 * 
 * TODO (Week 3): Implement actual API calls with WebAuthn JWT
 */
const apiCall = async (endpoint: string, options?: RequestInit): Promise<any> => {
  throw new Error(
    `🚧 API Adapter Not Implemented Yet\n` +
    `Endpoint: ${endpoint}\n` +
    `The new backend API will be available after Week 3-5 implementation.\n` +
    `For now, set EXPO_PUBLIC_USE_NEW_BACKEND=false to use Supabase.`
  );
};

/**
 * Get user profile
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Get union by ID
 */
export const getUnion = async (unionId: string): Promise<Union | null> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Get list of unions
 */
export const getUnions = async (params?: { limit?: number; offset?: number }): Promise<Union[]> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Get post by ID
 */
export const getPost = async (postId: string): Promise<Post | null> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Get posts for a union/channel
 */
export const getPosts = async (unionId: string, channelId?: string): Promise<Post[]> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Get comments for a post
 */
export const getComments = async (postId: string): Promise<Comment[]> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Get channels for a union
 */
export const getChannels = async (unionId: string): Promise<Channel[]> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Join a union
 * 
 * TODO (Week 3): Implement with encrypted membership tokens
 */
export const joinUnion = async (unionId: string): Promise<void> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Create a post
 * 
 * TODO (Week 3): Implement with E2EE content encryption
 */
export const createPost = async (content: string, unionId: string, channelId?: string): Promise<Post> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Create a comment
 * 
 * TODO (Week 3): Implement with E2EE content encryption
 */
export const createComment = async (content: string, postId: string): Promise<Comment> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};

/**
 * Update profile
 * 
 * TODO (Week 3): Implement with privacy-preserving updates
 */
export const updateProfile = async (updates: Partial<Profile>): Promise<Profile> => {
  throw new Error('API adapter not implemented yet. Set EXPO_PUBLIC_USE_NEW_BACKEND=false');
};
