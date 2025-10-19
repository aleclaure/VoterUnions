/**
 * Data Adapter Interface
 * 
 * Single point of control for switching between Supabase and API backends.
 * Uses feature flag CONFIG.USE_NEW_BACKEND to determine which implementation to use.
 * 
 * Usage:
 *   import { data } from '@/services/data/adapter';
 *   const profile = await data.getProfile(userId);
 * 
 * During migration (USE_NEW_BACKEND=false):
 * - Read operations: Use Supabase (public-only data)
 * - Write operations: Throw errors (must use API)
 * 
 * After migration (USE_NEW_BACKEND=true):
 * - All operations: Use new API (privacy-first)
 */

import { CONFIG } from '../../config';
import * as SupabaseData from './supabase-data';
import * as ApiData from './api-data';

// 🔒 PRODUCTION SAFETY: Ensure production uses new backend (AFTER migration completes)
// This check is also in config.ts, but we double-check here as belt-and-suspenders
// 
// NOTE: This check is DISABLED during Week 0-7 while migration is in progress.
// It will be re-enabled in Week 7 after 100% rollout is complete.
// 
// TODO (Week 7): Uncomment this block after migration is complete
//
// const isDevelopment = process.env.NODE_ENV !== 'production';
// if (!isDevelopment && CONFIG.USE_NEW_BACKEND !== true) {
//   throw new Error('🔒 CRITICAL: Production must use new backend');
// }

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * 🔒 GUARDRAIL 8: PII Detection
 * 
 * List of keys that indicate Personally Identifiable Information (PII).
 * If these keys are found in API responses, it indicates a privacy leak.
 */
const PII_KEYS = [
  'email',
  'password',
  'password_hash',
  'ip',
  'ip_address',
  'user_agent',
  'device_id', // Device ID is considered PII under GDPR
  'phone',
  'phone_number',
  'ssn',
  'social_security',
  'address',
  'last_seen',
  'email_confirmed_at',
];

/**
 * Check if an object contains PII keys (shallow check)
 * 
 * This helps detect accidental PII exposure in data responses.
 * In production, this throws an error to prevent privacy leaks.
 */
const assertNoPII = (obj: any, context: string): void => {
  if (!obj || typeof obj !== 'object') return;
  
  // Check for PII keys
  const foundPII = Object.keys(obj).filter(key => 
    PII_KEYS.some(banned => key.toLowerCase().includes(banned.toLowerCase()))
  );
  
  if (foundPII.length > 0) {
    const errorMsg = `⚠️  PII DETECTED in ${context}: ${foundPII.join(', ')}`;
    console.error(errorMsg);
    
    // In production, throw error to prevent PII leaks
    if (!isDevelopment) {
      throw new Error(`PII leak detected: ${foundPII.join(', ')}`);
    }
  }
};

/**
 * Wrap a data function to check for PII in results
 */
const wrapWithPIICheck = (fn: Function, name: string) => {
  return async (...args: any[]) => {
    const result = await fn(...args);
    
    // Check result for PII
    if (Array.isArray(result)) {
      result.forEach((item, idx) => assertNoPII(item, `${name}[${idx}]`));
    } else {
      assertNoPII(result, name);
    }
    
    return result;
  };
};

/**
 * Helper to throw error for sensitive operations on Supabase path
 * 
 * During migration, sensitive operations (writes) should ONLY go through the API.
 * This prevents bypassing privacy guarantees while Supabase path still exists.
 */
const throwInLegacyMode = (opName: string) => {
  throw new Error(
    `🔒 SECURITY: ${opName} is API-only\n` +
    `Cannot use Supabase path for sensitive operations.\n` +
    `This ensures privacy-first architecture is enforced.\n` +
    `Set EXPO_PUBLIC_USE_NEW_BACKEND=true to use the API.`
  );
};

/**
 * Switch between backends based on feature flag
 * 
 * When USE_NEW_BACKEND=false (Supabase mode):
 * - Read operations work (public data only)
 * - Write operations throw errors (API-only)
 * - PII detection enabled on all responses
 * 
 * When USE_NEW_BACKEND=true (API mode):
 * - All operations work (privacy-first backend)
 * - PII detection enabled on all responses
 */
const baseAdapter = CONFIG.USE_NEW_BACKEND
  ? ApiData
  : {
      // Read operations from Supabase (safe, public-only)
      ...SupabaseData,
      
      // Block sensitive operations in Supabase mode (Guardrail 6)
      joinUnion: () => throwInLegacyMode('joinUnion'),
      createPost: () => throwInLegacyMode('createPost'),
      createComment: () => throwInLegacyMode('createComment'),
      updateProfile: () => throwInLegacyMode('updateProfile'),
    };

/**
 * 🔒 GUARDRAIL 8: Wrap adapter with PII detection
 * 
 * All data operations are wrapped to check for PII in responses.
 * This catches accidental PII exposure before it reaches the app.
 */
export const data = new Proxy(baseAdapter, {
  get(target, prop) {
    const original = target[prop as keyof typeof target];
    
    // Only wrap functions
    if (typeof original !== 'function') return original;
    
    // Wrap with PII check
    return wrapWithPIICheck(original, String(prop));
  },
});

// Re-export types for convenience
export type { Profile, Union, Post, Comment, Channel, DataPort } from './types';

/**
 * Helper to check which backend is active
 * 
 * Useful for debugging and conditional UI rendering
 */
export const getActiveBackend = (): 'supabase' | 'api' => {
  return CONFIG.USE_NEW_BACKEND ? 'api' : 'supabase';
};

/**
 * Log active backend at startup
 */
console.log(`📊 Data adapter using: ${getActiveBackend()} backend`);
