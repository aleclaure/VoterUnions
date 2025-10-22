/**
 * Web Device Token Authentication Service
 *
 * Browser implementation of device token authentication using:
 * - @noble/curves for P-256 ECDSA (modern, audited crypto library)
 * - Web Crypto API for secure randomness
 * - IndexedDB with AES-GCM encryption for secure storage
 * - Browser-based UUID for device identification
 *
 * Security:
 * - NIST P-256 (secp256r1) elliptic curve
 * - AES-256-GCM encrypted storage (via webSecureStore)
 * - Deterministic signatures (RFC 6979)
 * - Secure randomness via Web Crypto API
 *
 * Platform Support:
 * - ✅ Web (Chrome, Firefox, Safari, Edge)
 * - ❌ Native (use deviceAuth.ts instead)
 */

import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as webSecureStore from './webSecureStore';
import * as webDeviceId from './webDeviceId';
import type {
  DeviceKeypair,
  DeviceInfo,
  SessionData,
  DeviceRegistrationResponse,
  DeviceAuthenticationResult,
  ChallengeResponse,
} from '../types/auth';

/**
 * Check if web device authentication is supported
 *
 * Requires Web Crypto API (available in HTTPS contexts and localhost)
 */
export function isWebDeviceAuthSupported(): boolean {
  return typeof window !== 'undefined' &&
         typeof window.crypto !== 'undefined' &&
         typeof window.crypto.subtle !== 'undefined';
}

// Alias for compatibility with platformDeviceAuth
export function isDeviceAuthSupported(): boolean {
  return isWebDeviceAuthSupported();
}

/**
 * Generate ECDSA P-256 keypair using @noble/curves
 *
 * Security:
 * - Uses Web Crypto API for secure randomness (crypto.getRandomValues)
 * - P-256 curve matches backend implementation
 *
 * @returns Object containing hex-encoded public and private keys
 */
export async function generateDeviceKeypair(): Promise<DeviceKeypair> {
  if (!isWebDeviceAuthSupported()) {
    throw new Error('Web Crypto API not available (HTTPS or localhost required)');
  }

  // Generate private key (32 bytes of secure randomness using Web Crypto API)
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  const privateKey = bytesToHex(privateKeyBytes);

  // Derive public key from private key
  const publicKeyBytes = p256.getPublicKey(privateKeyBytes);
  const publicKey = bytesToHex(publicKeyBytes);

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Store device keypair in encrypted IndexedDB
 *
 * Storage:
 * - Encrypted with AES-256-GCM
 * - Key derived from device-specific entropy
 * - Stored in IndexedDB for persistence
 *
 * @param privateKey Hex-encoded private key
 * @param publicKey Hex-encoded public key
 */
export async function storeDeviceKeypair(
  privateKey: string,
  publicKey: string
): Promise<void> {
  await webSecureStore.setItemAsync('device_private_key', privateKey);
  await webSecureStore.setItemAsync('device_public_key', publicKey);
}

/**
 * Retrieve device keypair from encrypted storage
 *
 * @returns Keypair if exists, null otherwise
 */
export async function getDeviceKeypair(): Promise<DeviceKeypair | null> {
  const privateKey = await webSecureStore.getItemAsync('device_private_key');
  const publicKey = await webSecureStore.getItemAsync('device_public_key');

  if (!privateKey || !publicKey) {
    return null;
  }

  return { publicKey, privateKey };
}

/**
 * Sign a challenge with the device private key
 *
 * Uses deterministic ECDSA (RFC 6979) from @noble/curves:
 * - Same challenge + same key = same signature (reproducible)
 * - No random nonce needed (safer against bad RNG)
 *
 * @param challenge String challenge from server
 * @param privateKey Hex-encoded private key
 * @returns Hex-encoded signature (DER format, compact)
 */
export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  // Hash the challenge with SHA-256
  const messageHash = sha256(challenge);

  // Convert private key from hex to bytes
  const privateKeyBytes = hexToBytes(privateKey);

  // Sign with P-256 (deterministic, RFC 6979)
  const signatureBytes = p256.sign(messageHash, privateKeyBytes);

  // Return signature in compact hex format (64 bytes: r + s)
  return bytesToHex(signatureBytes.toCompactRawBytes());
}

/**
 * Verify a signature (for testing)
 *
 * @param challenge Original challenge string
 * @param signature Hex-encoded signature (compact format)
 * @param publicKey Hex-encoded public key
 * @returns true if signature is valid
 */
export function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Hash the challenge
    const messageHash = sha256(challenge);

    // Convert signature and public key from hex to bytes
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);

    // Verify with P-256
    return p256.verify(signatureBytes, messageHash, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Get device information for registration (web implementation)
 *
 * Collects browser-based device metadata for backend tracking.
 * Uses a stable UUID stored in IndexedDB.
 *
 * @returns Device info object
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  // Get stable browser-based device ID
  const deviceId = webDeviceId.getWebDeviceId();

  // Get browser info
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  return {
    deviceId,
    deviceName: `${platform} Browser`,
    osName: platform,
    osVersion: userAgent,
  };
}

/**
 * Store session data in encrypted IndexedDB
 *
 * Saves user and tokens for automatic restoration on page reload
 *
 * @param sessionData Session object containing user and tokens
 */
export async function storeSession(sessionData: SessionData): Promise<void> {
  await webSecureStore.setItemAsync('device_session', JSON.stringify(sessionData));
}

/**
 * Retrieve stored session from encrypted storage
 *
 * @returns Stored session if exists, null otherwise
 */
export async function getStoredSession(): Promise<SessionData | null> {
  const sessionString = await webSecureStore.getItemAsync('device_session');
  if (!sessionString) {
    return null;
  }

  try {
    const session = JSON.parse(sessionString) as SessionData;

    // Validate session structure
    if (!session.user || !session.accessToken || !session.refreshToken) {
      console.error('Invalid session structure in stored session');
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to parse stored session:', error);
    return null;
  }
}

/**
 * Delete stored session from encrypted storage
 *
 * Called during logout
 */
export async function deleteSession(): Promise<void> {
  await webSecureStore.deleteItemAsync('device_session');
}

/**
 * Delete device keypair from encrypted storage
 *
 * Called during logout to remove credentials
 */
export async function deleteDeviceKeypair(): Promise<void> {
  await webSecureStore.deleteItemAsync('device_private_key');
  await webSecureStore.deleteItemAsync('device_public_key');
}

/**
 * Check if device has stored keypair
 *
 * @returns true if keypair exists in storage
 */
export async function hasDeviceKeypair(): Promise<boolean> {
  const keypair = await getDeviceKeypair();
  return keypair !== null;
}

/**
 * Initialize device authentication
 *
 * Generates and stores a new keypair if one doesn't exist
 *
 * @returns Public key (hex)
 */
export async function initializeDeviceAuth(): Promise<string> {
  // Check if keypair already exists
  const existing = await getDeviceKeypair();
  if (existing) {
    return existing.publicKey;
  }

  // Generate new keypair
  const { publicKey, privateKey } = await generateDeviceKeypair();

  // Store securely
  await storeDeviceKeypair(privateKey, publicKey);

  return publicKey;
}

/**
 * Register device with backend
 *
 * Sends public key and device info to server
 *
 * @param apiUrl Backend API URL
 * @returns Registration result
 */
export async function registerDevice(apiUrl: string): Promise<DeviceRegistrationResponse> {
  try {
    // Initialize device auth (generates keypair if needed)
    const publicKey = await initializeDeviceAuth();

    // Get device info
    const deviceInfo = await getDeviceInfo();

    // Send registration request
    const response = await fetch(`${apiUrl}/auth/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey,
        ...deviceInfo,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }

    const result = await response.json() as DeviceRegistrationResponse;
    return { success: true, ...result };
  } catch (error) {
    console.error('Device registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Authenticate device with backend
 *
 * Completes challenge-response authentication flow
 *
 * @param apiUrl Backend API URL
 * @returns Authentication tokens
 */
export async function authenticateDevice(apiUrl: string): Promise<DeviceAuthenticationResult> {
  try {
    // Get stored keypair
    const keypair = await getDeviceKeypair();
    if (!keypair) {
      return {
        success: false,
        error: 'No device keypair found. Please register first.',
      };
    }

    const { publicKey, privateKey } = keypair;

    // Step 1: Request challenge from server
    const challengeResponse = await fetch(`${apiUrl}/auth/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicKey }),
    });

    if (!challengeResponse.ok) {
      const error = await challengeResponse.json() as { message?: string };
      return {
        success: false,
        error: error.message || 'Challenge request failed',
      };
    }

    const challengeData = await challengeResponse.json() as ChallengeResponse;
    const { challenge } = challengeData;

    // Step 2: Sign challenge with private key
    const signature = await signChallenge(challenge, privateKey);

    // Step 3: Send signature to server for verification
    const deviceInfo = await getDeviceInfo();
    const verifyResponse = await fetch(`${apiUrl}/auth/verify-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey,
        challenge,
        signature,
        deviceId: deviceInfo.deviceId,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json() as { message?: string };
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }

    const result = await verifyResponse.json() as {
      access_token: string;
      refresh_token: string;
      user: any;
    };

    return {
      success: true,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      user: result.user,
    };
  } catch (error) {
    console.error('Device authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
