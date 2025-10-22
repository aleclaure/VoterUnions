/**
 * Platform-Aware Device Authentication Router
 *
 * Automatically routes to the correct device authentication implementation:
 * - Native (iOS/Android): Uses deviceAuth.ts with elliptic + expo-crypto
 * - Web: Uses webDeviceAuth.ts with @noble/curves + Web Crypto API
 *
 * This provides a unified interface for device token authentication across
 * all platforms, ensuring the app learns and adapts to its runtime environment.
 *
 * Usage:
 * ```typescript
 * import * as platformDeviceAuth from './platformDeviceAuth';
 *
 * // Works on all platforms
 * const keypair = await platformDeviceAuth.generateDeviceKeypair();
 * await platformDeviceAuth.registerDevice(apiUrl);
 * ```
 */

import { Platform } from 'react-native';

// Import both implementations
import * as nativeDeviceAuth from './deviceAuth';
import * as webDeviceAuth from './webDeviceAuth';

// Re-export types
export type {
  DeviceKeypair,
  DeviceInfo,
  SessionData,
  DeviceRegistrationResponse,
  DeviceAuthenticationResult,
  ChallengeResponse,
} from '../types/auth';

/**
 * Check if device authentication is supported on current platform
 *
 * Returns true for:
 * - iOS/Android: Always supported (hardware-backed crypto)
 * - Web: Supported if Web Crypto API available (HTTPS or localhost)
 */
export function isDeviceAuthSupported(): boolean {
  if (Platform.OS === 'web') {
    return webDeviceAuth.isWebDeviceAuthSupported();
  } else {
    return nativeDeviceAuth.isDeviceAuthSupported();
  }
}

/**
 * Generate ECDSA P-256 keypair
 *
 * Platform routing:
 * - Native: Uses elliptic + expo-crypto
 * - Web: Uses @noble/curves + Web Crypto API
 *
 * Both use same P-256 curve for consistency.
 */
export async function generateDeviceKeypair() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.generateDeviceKeypair();
  } else {
    return nativeDeviceAuth.generateDeviceKeypair();
  }
}

/**
 * Store device keypair in secure storage
 *
 * Platform routing:
 * - Native: iOS Keychain / Android Keystore
 * - Web: Encrypted IndexedDB via webSecureStore
 */
export async function storeDeviceKeypair(privateKey: string, publicKey: string) {
  if (Platform.OS === 'web') {
    return webDeviceAuth.storeDeviceKeypair(privateKey, publicKey);
  } else {
    return nativeDeviceAuth.storeDeviceKeypair(privateKey, publicKey);
  }
}

/**
 * Retrieve device keypair from secure storage
 */
export async function getDeviceKeypair() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.getDeviceKeypair();
  } else {
    return nativeDeviceAuth.getDeviceKeypair();
  }
}

/**
 * Sign a challenge with device private key
 *
 * Platform routing:
 * - Native: Uses elliptic library for ECDSA
 * - Web: Uses @noble/curves for ECDSA
 *
 * Both produce valid P-256 signatures.
 */
export async function signChallenge(challenge: string, privateKey: string) {
  if (Platform.OS === 'web') {
    return webDeviceAuth.signChallenge(challenge, privateKey);
  } else {
    return nativeDeviceAuth.signChallenge(challenge, privateKey);
  }
}

/**
 * Verify a signature (for testing)
 */
export function verifySignature(challenge: string, signature: string, publicKey: string) {
  if (Platform.OS === 'web') {
    return webDeviceAuth.verifySignature(challenge, signature, publicKey);
  } else {
    return nativeDeviceAuth.verifySignature(challenge, signature, publicKey);
  }
}

/**
 * Get device information
 *
 * Platform routing:
 * - Native: Uses expo-application for hardware device IDs
 * - Web: Uses webDeviceId for browser-based UUID
 */
export async function getDeviceInfo() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.getDeviceInfo();
  } else {
    return nativeDeviceAuth.getDeviceInfo();
  }
}

/**
 * Store session data in secure storage
 */
export async function storeSession(sessionData: any) {
  if (Platform.OS === 'web') {
    return webDeviceAuth.storeSession(sessionData);
  } else {
    return nativeDeviceAuth.storeSession(sessionData);
  }
}

/**
 * Retrieve stored session from secure storage
 */
export async function getStoredSession() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.getStoredSession();
  } else {
    return nativeDeviceAuth.getStoredSession();
  }
}

/**
 * Delete stored session
 */
export async function deleteSession() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.deleteSession();
  } else {
    return nativeDeviceAuth.deleteSession();
  }
}

/**
 * Delete device keypair from secure storage
 */
export async function deleteDeviceKeypair() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.deleteDeviceKeypair();
  } else {
    return nativeDeviceAuth.deleteDeviceKeypair();
  }
}

/**
 * Check if device has stored keypair
 */
export async function hasDeviceKeypair() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.hasDeviceKeypair();
  } else {
    return nativeDeviceAuth.hasDeviceKeypair();
  }
}

/**
 * Initialize device authentication
 *
 * Generates keypair if needed, returns public key
 */
export async function initializeDeviceAuth() {
  if (Platform.OS === 'web') {
    return webDeviceAuth.initializeDeviceAuth();
  } else {
    return nativeDeviceAuth.initializeDeviceAuth();
  }
}

/**
 * Register device with backend
 */
export async function registerDevice(apiUrl: string) {
  if (Platform.OS === 'web') {
    return webDeviceAuth.registerDevice(apiUrl);
  } else {
    return nativeDeviceAuth.registerDevice(apiUrl);
  }
}

/**
 * Authenticate device with backend
 */
export async function authenticateDevice(apiUrl: string) {
  if (Platform.OS === 'web') {
    return webDeviceAuth.authenticateDevice(apiUrl);
  } else {
    return nativeDeviceAuth.authenticateDevice(apiUrl);
  }
}

/**
 * Get current platform info (for debugging)
 */
export function getPlatformInfo() {
  return {
    platform: Platform.OS,
    isWeb: Platform.OS === 'web',
    isNative: Platform.OS !== 'web',
    authSupported: isDeviceAuthSupported(),
  };
}
