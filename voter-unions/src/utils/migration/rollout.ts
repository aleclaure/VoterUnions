/**
 * Gradual Rollout Utilities
 * 
 * Enables gradual rollout of WebAuthn authentication to a percentage of users.
 * Uses deterministic hashing to ensure consistent rollout decisions per user.
 * 
 * Features:
 * - Deterministic: Same user always gets same rollout decision
 * - Percentage-based: Control rollout from 0% to 100%
 * - Smooth distribution: Users evenly distributed across percentage range
 * - No server needed: All logic runs client-side
 * 
 * Example rollout strategy:
 * - Week 5: 10% of users (testing)
 * - Week 6: 25% of users (early adopters)
 * - Week 7: 50% of users (mainstream)
 * - Week 8: 100% of users (full rollout)
 */

import * as Crypto from 'expo-crypto';
import { CONFIG } from '../../config';

/**
 * Hash a user ID to a deterministic number between 0 and 99
 * 
 * Uses SHA256 to hash the user ID, then converts to a number 0-99.
 * This ensures the same user always gets the same number.
 * 
 * @param userId - User ID to hash
 * @returns Number between 0 and 99
 * 
 * @example
 * await hashUserIdToPercent("user-123"); // => 42 (always 42 for this user)
 */
const hashUserIdToPercent = async (userId: string): Promise<number> => {
  // Hash user ID with SHA256 (returns hex string)
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    userId,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  
  // Convert first 8 hex characters to a number
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  
  // Map to 0-99 range
  return hashNumber % 100;
};

/**
 * Check if a user should be included in the rollout
 * 
 * Deterministic check based on user ID hash.
 * If user hash is less than rollout percentage, they're included.
 * 
 * @param userId - User ID to check
 * @param percentage - Rollout percentage (0-100)
 * @returns True if user is in rollout
 * 
 * @example
 * // 50% rollout
 * await isUserInRollout("user-123", 50); // => true if hash < 50
 * 
 * // 10% rollout
 * await isUserInRollout("user-123", 10); // => true if hash < 10
 * 
 * // 100% rollout
 * await isUserInRollout("user-123", 100); // => true (everyone)
 * 
 * // 0% rollout
 * await isUserInRollout("user-123", 0); // => false (no one)
 */
export const isUserInRollout = async (
  userId: string,
  percentage: number
): Promise<boolean> => {
  // Validate percentage
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;
  
  // Hash user ID to deterministic number 0-99
  const userHash = await hashUserIdToPercent(userId);
  
  // Check if user is in rollout
  return userHash < percentage;
};

/**
 * Check if a user should use WebAuthn based on rollout config
 * 
 * Combines feature flag and rollout percentage to determine
 * if a specific user should use WebAuthn authentication.
 * 
 * @param userId - User ID to check
 * @returns True if user should use WebAuthn
 * 
 * @example
 * // If CONFIG.USE_WEBAUTHN = true and WEBAUTHN_ROLLOUT_PERCENT = 50
 * await shouldUseWebAuthn("user-123"); // => true if user in 50% rollout
 * 
 * // If CONFIG.USE_WEBAUTHN = false
 * await shouldUseWebAuthn("user-123"); // => false (feature disabled)
 */
export const shouldUseWebAuthn = async (userId: string): Promise<boolean> => {
  // Check if WebAuthn feature is enabled
  if (!CONFIG.USE_WEBAUTHN) {
    return false;
  }
  
  // Check if user is in rollout percentage
  return await isUserInRollout(userId, CONFIG.WEBAUTHN_ROLLOUT_PERCENT);
};

/**
 * Get rollout status for a user (for debugging)
 * 
 * Returns detailed rollout information including:
 * - User's hash value (0-99)
 * - Current rollout percentage
 * - Whether user is in rollout
 * 
 * @param userId - User ID to check
 * @param percentage - Rollout percentage (optional, uses CONFIG if not provided)
 * @returns Rollout status object
 * 
 * @example
 * const status = await getRolloutStatus("user-123", 50);
 * // => {
 * //   userId: "user-123",
 * //   userHash: 42,
 * //   rolloutPercentage: 50,
 * //   inRollout: true
 * // }
 */
export const getRolloutStatus = async (
  userId: string,
  percentage?: number
): Promise<{
  userId: string;
  userHash: number;
  rolloutPercentage: number;
  inRollout: boolean;
}> => {
  const rolloutPercentage = percentage ?? CONFIG.WEBAUTHN_ROLLOUT_PERCENT;
  const userHash = await hashUserIdToPercent(userId);
  const inRollout = await isUserInRollout(userId, rolloutPercentage);
  
  return {
    userId,
    userHash,
    rolloutPercentage,
    inRollout,
  };
};

/**
 * Calculate expected rollout distribution
 * 
 * Useful for estimating how many users will be in rollout.
 * 
 * @param totalUsers - Total number of users
 * @param percentage - Rollout percentage (0-100)
 * @returns Expected number of users in rollout
 * 
 * @example
 * calculateRolloutSize(1000, 50); // => 500 users
 * calculateRolloutSize(10000, 10); // => 1000 users
 */
export const calculateRolloutSize = (
  totalUsers: number,
  percentage: number
): number => {
  return Math.floor((totalUsers * percentage) / 100);
};

/**
 * Test rollout distribution
 * 
 * Simulates rollout for a batch of user IDs to verify distribution.
 * Useful for testing rollout logic before deployment.
 * 
 * @param userIds - Array of user IDs to test
 * @param percentage - Rollout percentage
 * @returns Rollout statistics
 * 
 * @example
 * const userIds = ["user-1", "user-2", ..., "user-100"];
 * const stats = await testRolloutDistribution(userIds, 50);
 * // => {
 * //   total: 100,
 * //   inRollout: 52, // Should be close to 50
 * //   actualPercentage: 52
 * // }
 */
export const testRolloutDistribution = async (
  userIds: string[],
  percentage: number
): Promise<{
  total: number;
  inRollout: number;
  actualPercentage: number;
}> => {
  const results = await Promise.all(
    userIds.map(userId => isUserInRollout(userId, percentage))
  );
  
  const inRollout = results.filter(Boolean).length;
  const total = userIds.length;
  const actualPercentage = (inRollout / total) * 100;
  
  return {
    total,
    inRollout,
    actualPercentage,
  };
};
