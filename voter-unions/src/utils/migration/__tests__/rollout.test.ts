/**
 * Rollout Utilities Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isUserInRollout,
  shouldUseWebAuthn,
  getRolloutStatus,
  calculateRolloutSize,
  testRolloutDistribution,
} from '../rollout';

describe('Rollout Utilities', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('isUserInRollout', () => {
    it('should be deterministic for same user ID', async () => {
      const userId = 'test-user-123';
      const percentage = 50;

      const result1 = await isUserInRollout(userId, percentage);
      const result2 = await isUserInRollout(userId, percentage);

      expect(result1).toBe(result2);
    });

    it('should return false for 0% rollout', async () => {
      const userId = 'test-user-123';
      const result = await isUserInRollout(userId, 0);
      expect(result).toBe(false);
    });

    it('should return true for 100% rollout', async () => {
      const userId = 'test-user-123';
      const result = await isUserInRollout(userId, 100);
      expect(result).toBe(true);
    });

    it('should distribute users evenly across percentages', async () => {
      // Test with 100 different user IDs
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const results = await Promise.all(
        userIds.map(userId => isUserInRollout(userId, 50))
      );

      const inRollout = results.filter(Boolean).length;
      
      // Should be close to 50% (allow 20% variance due to randomness)
      expect(inRollout).toBeGreaterThan(30);
      expect(inRollout).toBeLessThan(70);
    });
  });

  describe('shouldUseWebAuthn', () => {
    it('should return false when USE_WEBAUTHN is false', async () => {
      process.env.EXPO_PUBLIC_USE_WEBAUTHN = 'false';
      process.env.EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT = '100';

      delete require.cache[require.resolve('../../config')];
      
      const userId = 'test-user-123';
      const result = await shouldUseWebAuthn(userId);

      expect(result).toBe(false);
    });

    it('should check rollout percentage when USE_WEBAUTHN is true', async () => {
      process.env.EXPO_PUBLIC_USE_WEBAUTHN = 'true';
      process.env.EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT = '0';

      delete require.cache[require.resolve('../../config')];
      
      const userId = 'test-user-123';
      const result = await shouldUseWebAuthn(userId);

      expect(result).toBe(false);
    });
  });

  describe('getRolloutStatus', () => {
    it('should return detailed rollout status', async () => {
      const userId = 'test-user-123';
      const percentage = 50;

      const status = await getRolloutStatus(userId, percentage);

      expect(status).toHaveProperty('userId', userId);
      expect(status).toHaveProperty('userHash');
      expect(status).toHaveProperty('rolloutPercentage', percentage);
      expect(status).toHaveProperty('inRollout');
      expect(typeof status.userHash).toBe('number');
      expect(status.userHash).toBeGreaterThanOrEqual(0);
      expect(status.userHash).toBeLessThan(100);
    });

    it('should be consistent with isUserInRollout', async () => {
      const userId = 'test-user-123';
      const percentage = 50;

      const status = await getRolloutStatus(userId, percentage);
      const inRollout = await isUserInRollout(userId, percentage);

      expect(status.inRollout).toBe(inRollout);
    });
  });

  describe('calculateRolloutSize', () => {
    it('should calculate correct rollout size', () => {
      expect(calculateRolloutSize(1000, 50)).toBe(500);
      expect(calculateRolloutSize(10000, 10)).toBe(1000);
      expect(calculateRolloutSize(100, 25)).toBe(25);
    });

    it('should handle 0% rollout', () => {
      expect(calculateRolloutSize(1000, 0)).toBe(0);
    });

    it('should handle 100% rollout', () => {
      expect(calculateRolloutSize(1000, 100)).toBe(1000);
    });
  });

  describe('testRolloutDistribution', () => {
    it('should return distribution statistics', async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const percentage = 50;

      const stats = await testRolloutDistribution(userIds, percentage);

      expect(stats).toHaveProperty('total', 100);
      expect(stats).toHaveProperty('inRollout');
      expect(stats).toHaveProperty('actualPercentage');
      expect(stats.inRollout).toBeGreaterThan(30);
      expect(stats.inRollout).toBeLessThan(70);
    });

    it('should calculate actual percentage correctly', async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const percentage = 50;

      const stats = await testRolloutDistribution(userIds, percentage);

      expect(stats.actualPercentage).toBeCloseTo(stats.inRollout, 0);
    });
  });
});
