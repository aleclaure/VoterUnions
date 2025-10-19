/**
 * Data Adapter Security Tests (Guardrail 9)
 * 
 * Tests to ensure sensitive operations never hit Supabase path
 * and that PII detection works correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Data Adapter Security (Guardrail 9)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear module cache before each test
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('Backend Switching', () => {
    it('should use Supabase adapter when USE_NEW_BACKEND=false', async () => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'false';
      process.env.NODE_ENV = 'development';

      // Re-import to get new config
      const { data, getActiveBackend } = await import('../adapter');

      expect(getActiveBackend()).toBe('supabase');
    });

    it('should use API adapter when USE_NEW_BACKEND=true', async () => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'true';
      process.env.NODE_ENV = 'development';

      const { data, getActiveBackend } = await import('../adapter');

      expect(getActiveBackend()).toBe('api');
    });
  });

  describe('Sensitive Operations Blocking (Guardrail 6)', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'false'; // Supabase mode
      process.env.NODE_ENV = 'development';
    });

    it('should block joinUnion on Supabase path', async () => {
      const { data } = await import('../adapter');

      await expect(data.joinUnion('union-123')).rejects.toThrow(
        'SECURITY: joinUnion is API-only'
      );
    });

    it('should block createPost on Supabase path', async () => {
      const { data } = await import('../adapter');

      await expect(
        data.createPost('test content', 'union-123')
      ).rejects.toThrow('SECURITY: createPost is API-only');
    });

    it('should block createComment on Supabase path', async () => {
      const { data } = await import('../adapter');

      await expect(
        data.createComment('test comment', 'post-123')
      ).rejects.toThrow('SECURITY: createComment is API-only');
    });

    it('should block updateProfile on Supabase path', async () => {
      const { data } = await import('../adapter');

      await expect(
        data.updateProfile({ display_name: 'New Name' })
      ).rejects.toThrow('SECURITY: updateProfile is API-only');
    });
  });

  describe('Read Operations (Allowed on Supabase)', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'false';
      process.env.NODE_ENV = 'development';
    });

    it('should allow getProfile on Supabase path', async () => {
      const { data } = await import('../adapter');

      // This should not throw (but may return null if user doesn't exist)
      const result = await data.getProfile('test-user-123');
      expect(result).toBeDefined(); // Either Profile or null
    });

    it('should allow getUnion on Supabase path', async () => {
      const { data } = await import('../adapter');

      const result = await data.getUnion('test-union-123');
      expect(result).toBeDefined();
    });

    it('should allow getPosts on Supabase path', async () => {
      const { data } = await import('../adapter');

      const result = await data.getPosts('test-union-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('PII Detection (Guardrail 8)', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'false';
      process.env.NODE_ENV = 'production'; // Production mode throws errors
    });

    it('should detect email in response', async () => {
      // Mock Supabase to return PII
      vi.mock('../../supabase', () => ({
        supabase: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'user-123',
                    display_name: 'Test User',
                    email: 'test@example.com', // PII!
                  },
                  error: null,
                }),
              }),
            }),
          }),
        },
      }));

      const { data } = await import('../adapter');

      // In production, PII should cause an error
      await expect(data.getProfile('user-123')).rejects.toThrow('PII leak detected');
    });

    it('should allow non-PII responses', async () => {
      // Mock Supabase to return safe data
      vi.mock('../../supabase', () => ({
        supabase: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'user-123',
                    display_name: 'Test User',
                    avatar_url: 'https://example.com/avatar.jpg',
                    bio: 'Test bio',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        },
      }));

      const { data } = await import('../adapter');

      // Should not throw
      const result = await data.getProfile('user-123');
      expect(result).toBeDefined();
    });
  });

  describe('Production Safety (Guardrail 4)', () => {
    it('should throw error in production when USE_NEW_BACKEND=false', async () => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'false';
      process.env.NODE_ENV = 'production';

      // Should throw when importing
      await expect(import('../adapter')).rejects.toThrow(
        'Production must use new backend'
      );
    });

    it('should allow production when USE_NEW_BACKEND=true', async () => {
      process.env.EXPO_PUBLIC_USE_NEW_BACKEND = 'true';
      process.env.NODE_ENV = 'production';

      // Should not throw
      const module = await import('../adapter');
      expect(module.data).toBeDefined();
    });
  });
});
