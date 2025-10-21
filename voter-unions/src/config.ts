/**
 * Application Configuration
 * 
 * Central configuration file for feature flags and environment variables.
 * This enables safe migration from Supabase to WebAuthn-based backend.
 * 
 * Feature Flags:
 * - REQUIRE_EMAIL_VERIFICATION: Toggle email verification guards (all 11 guards)
 * - USE_WEBAUTHN: Switch authentication method (Supabase email/password vs WebAuthn)
 * - USE_NEW_BACKEND: Switch data backend (Supabase vs new API microservices)
 * - WEBAUTHN_ROLLOUT_PERCENT: Gradual rollout percentage (0-100)
 */

// Check if in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Parse boolean from environment variable
 */
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parse number from environment variable
 */
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Application Configuration
 */
export const CONFIG = {
  /**
   * Email Verification Feature Flag
   * 
   * When true: Email verification is required for protected actions
   * When false: Email verification guards are disabled (development/migration mode)
   * 
   * Default: true (production), false (development)
   */
  REQUIRE_EMAIL_VERIFICATION: parseBoolean(
    process.env.EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION,
    true // Default: enabled
  ),

  /**
   * Device Token Authentication Feature Flag
   * 
   * When true: Use Device Token Auth (privacy-first, no email collection)
   * When false: Use Supabase email/password authentication
   * 
   * Note: Originally planned for WebAuthn, but using Device Token Auth for
   * Expo Go compatibility. Both achieve privacy-first authentication.
   * 
   * Default: false (Supabase during migration)
   */
  USE_DEVICE_AUTH: parseBoolean(
    process.env.EXPO_PUBLIC_USE_DEVICE_AUTH,
    true // Default: use Device Token Auth (privacy-first)
  ),
  
  // Deprecated: USE_WEBAUTHN renamed to USE_DEVICE_AUTH
  // Keep for backward compatibility during migration
  get USE_WEBAUTHN() {
    return this.USE_DEVICE_AUTH;
  },

  /**
   * Backend API Feature Flag
   * 
   * When true: Use new microservices backend (privacy-first)
   * When false: Use Supabase backend (current implementation)
   * 
   * Default: false (Supabase during migration)
   */
  USE_NEW_BACKEND: parseBoolean(
    process.env.EXPO_PUBLIC_USE_NEW_BACKEND,
    false // Default: use Supabase
  ),

  /**
   * WebAuthn Rollout Percentage
   * 
   * Controls gradual rollout of WebAuthn authentication.
   * Value: 0-100 (percentage of users in rollout)
   * 
   * Default: 0 (no users in rollout)
   */
  WEBAUTHN_ROLLOUT_PERCENT: parseNumber(
    process.env.EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT,
    0 // Default: 0% rollout
  ),

  /**
   * New Backend API URL
   * 
   * Base URL for the new microservices backend.
   * Only used when USE_NEW_BACKEND is true.
   */
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',

  /**
   * Supabase Configuration
   * 
   * Existing Supabase configuration.
   * Used when USE_NEW_BACKEND is false.
   */
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;

/**
 * 🔒 PRODUCTION SAFETY: Force new backend in production
 * 
 * NOTE: This check is DISABLED during Week 0-7 while migration is in progress.
 * It will be re-enabled in Week 7 after 100% rollout is complete.
 * 
 * During migration, production can use Supabase backend until new API is ready.
 * 
 * TODO (Week 7): Uncomment this block after migration is complete and all users are on WebAuthn
 */
// if (!isDevelopment && CONFIG.USE_NEW_BACKEND !== true) {
//   throw new Error(
//     '🔒 CRITICAL SECURITY ERROR: Production MUST use new backend.\n' +
//     'Set EXPO_PUBLIC_USE_NEW_BACKEND=true in your production environment.\n' +
//     'This ensures WebAuthn authentication and privacy-first architecture are enforced.'
//   );
// }

/**
 * Development Warnings
 */
if (isDevelopment) {
  // Warn if using legacy Supabase backend
  if (!CONFIG.USE_NEW_BACKEND) {
    console.warn('⚠️  Using Supabase backend (development mode)');
    console.warn('   Set EXPO_PUBLIC_USE_NEW_BACKEND=true to test new backend');
  }

  // Warn if email verification is disabled
  if (!CONFIG.REQUIRE_EMAIL_VERIFICATION) {
    console.warn('⚠️  Email verification disabled (development mode)');
    console.warn('   Set EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION=true to test verification');
  }

  // Log rollout percentage
  if (CONFIG.WEBAUTHN_ROLLOUT_PERCENT > 0) {
    console.log(`📊 WebAuthn rollout: ${CONFIG.WEBAUTHN_ROLLOUT_PERCENT}% of users`);
  }
}

/**
 * Configuration Summary (logged at startup)
 */
console.log('🔧 Application Configuration:');
console.log(`   Authentication: ${CONFIG.USE_DEVICE_AUTH ? 'Device Token (Privacy-First)' : 'Supabase'}`);
console.log(`   Backend: ${CONFIG.USE_NEW_BACKEND ? 'New API' : 'Supabase'}`);
console.log(`   Email Verification: ${CONFIG.REQUIRE_EMAIL_VERIFICATION ? 'Enabled' : 'Disabled'}`);
console.log(`   Environment: ${isDevelopment ? 'Development' : 'Production'}`);
