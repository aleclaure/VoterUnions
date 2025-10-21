/**
 * Device Token Authentication Service
 * 
 * Provides cryptographic device-based authentication using ECDSA P-256 signatures.
 * This enables privacy-first authentication without email collection.
 * 
 * Security:
 * - NIST P-256 (secp256r1) elliptic curve
 * - Hardware-backed key storage (iOS Keychain / Android Keystore)
 * - Deterministic signatures (RFC 6979)
 * - Secure randomness via expo-crypto
 * 
 * Platform Support:
 * - ✅ iOS (native)
 * - ✅ Android (native)
 * - ❌ Web (disabled for security)
 */

// @ts-ignore - elliptic doesn't have great TypeScript definitions
import * as elliptic from 'elliptic';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Initialize P-256 curve (also known as secp256r1 or prime256v1)
const EC = elliptic.ec;
const ec = new EC('p256');

/**
 * Check if device authentication is supported on this platform
 * 
 * Device auth is only available on native platforms (iOS/Android) where
 * we have hardware-backed secure storage and reliable device identifiers.
 */
export function isDeviceAuthSupported(): boolean {
  return Platform.OS !== 'web';
}

/**
 * Generate ECDSA P-256 keypair with cryptographically secure randomness
 * 
 * Security:
 * - Uses expo-crypto polyfill for crypto.getRandomValues()
 * - iOS: SecRandomCopyBytes (hardware RNG)
 * - Android: SecureRandom (hardware RNG)
 * 
 * @returns Object containing hex-encoded public and private keys
 * @throws Error if called on unsupported platform (web)
 */
export async function generateDeviceKeypair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  if (!isDeviceAuthSupported()) {
    throw new Error('Device auth not supported on web platform');
  }
  
  // Generate keypair with secure randomness
  const keyPair = ec.genKeyPair();
  
  // Extract keys in hex format
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex');
  
  return {
    publicKey,
    privateKey,
  };
}

/**
 * Store device keypair in hardware-backed secure storage
 * 
 * Storage:
 * - iOS: Keychain (hardware-backed)
 * - Android: Keystore (hardware-backed)
 * 
 * @param privateKey Hex-encoded private key
 * @param publicKey Hex-encoded public key
 */
export async function storeDeviceKeypair(
  privateKey: string,
  publicKey: string
): Promise<void> {
  await SecureStore.setItemAsync('device_private_key', privateKey);
  await SecureStore.setItemAsync('device_public_key', publicKey);
}

/**
 * Retrieve device keypair from secure storage
 * 
 * @returns Keypair if exists, null otherwise
 */
export async function getDeviceKeypair(): Promise<{
  publicKey: string;
  privateKey: string;
} | null> {
  const privateKey = await SecureStore.getItemAsync('device_private_key');
  const publicKey = await SecureStore.getItemAsync('device_public_key');
  
  if (!privateKey || !publicKey) {
    return null;
  }
  
  return { publicKey, privateKey };
}

/**
 * Sign a challenge with the device private key
 * 
 * Uses deterministic ECDSA (RFC 6979) to ensure:
 * - Same challenge + same key = same signature (reproducible)
 * - No random nonce needed (safer against bad RNG)
 * 
 * The challenge is automatically hashed with SHA-256 before signing.
 * 
 * @param challenge String challenge from server
 * @param privateKey Hex-encoded private key
 * @returns Hex-encoded signature (DER format)
 */
export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  // Create keypair from private key
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  
  // Hash the challenge (elliptic will hash it again internally with SHA-256)
  // We pass the raw challenge string and let elliptic handle the hashing
  const signature = keyPair.sign(challenge);
  
  // Return signature in DER format (standard format for ECDSA signatures)
  return signature.toDER('hex');
}

/**
 * Verify a signature (for testing)
 * 
 * @param challenge Original challenge string
 * @param signature Hex-encoded signature (DER format)
 * @param publicKey Hex-encoded public key
 * @returns true if signature is valid
 */
export function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Create public key from hex
    const key = ec.keyFromPublic(publicKey, 'hex');
    
    // Verify signature
    return key.verify(challenge, signature);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Get device information for registration
 * 
 * Collects device metadata for backend tracking and security.
 * This helps detect suspicious activity (e.g., same account from multiple devices).
 * 
 * @returns Device info object
 */
export async function getDeviceInfo(): Promise<{
  deviceId: string;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
}> {
  // Generate stable device ID from multiple sources
  const androidId = Application.getAndroidId();
  const iosId = await Application.getIosIdForVendorAsync();
  
  // Combine IDs to create a stable device identifier
  const deviceId = androidId || iosId || 'unknown';
  
  return {
    deviceId,
    deviceName: Device.deviceName || null,
    osName: Device.osName || null,
    osVersion: Device.osVersion || null,
  };
}

/**
 * Delete device keypair from secure storage
 * 
 * Called during logout to remove credentials
 */
export async function deleteDeviceKeypair(): Promise<void> {
  await SecureStore.deleteItemAsync('device_private_key');
  await SecureStore.deleteItemAsync('device_public_key');
}

/**
 * Check if device has stored keypair
 * 
 * @returns true if keypair exists in secure storage
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
export async function registerDevice(apiUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
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
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
    
    return { success: true };
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
export async function authenticateDevice(apiUrl: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
  error?: string;
}> {
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
      const error = await challengeResponse.json();
      return {
        success: false,
        error: error.message || 'Challenge request failed',
      };
    }
    
    const { challenge } = await challengeResponse.json();
    
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
      const error = await verifyResponse.json();
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
    
    const result = await verifyResponse.json();
    
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
