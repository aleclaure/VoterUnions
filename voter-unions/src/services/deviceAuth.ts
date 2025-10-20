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
 * - Secure randomness via react-native-get-random-values
 * 
 * Platform Support:
 * - ✅ iOS (native)
 * - ✅ Android (native)
 * - ❌ Web (disabled for security)
 */

import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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
 * - Uses react-native-get-random-values polyfill
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
  
  // Generate private key with secure randomness
  const privateKey = p256.utils.randomPrivateKey();
  
  // Derive public key from private key
  const publicKey = p256.getPublicKey(privateKey);
  
  return {
    publicKey: bytesToHex(publicKey),
    privateKey: bytesToHex(privateKey),
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
 * @returns Hex-encoded signature
 */
export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  // Convert challenge string to bytes
  const messageBytes = new TextEncoder().encode(challenge);
  
  // Convert private key hex to bytes
  const privateKeyBytes = hexToBytes(privateKey);
  
  // Sign (p256.sign automatically hashes with SHA-256 and uses RFC 6979)
  const signature = p256.sign(messageBytes, privateKeyBytes);
  
  // Return hex-encoded signature
  return bytesToHex(signature);
}

/**
 * Verify a signature (for testing)
 * 
 * @param challenge Original challenge string
 * @param signature Hex-encoded signature
 * @param publicKey Hex-encoded public key
 * @returns true if signature is valid
 */
export function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(challenge);
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);
    
    return p256.verify(signatureBytes, messageBytes, publicKeyBytes);
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
 * @returns Device information object
 * @throws Error if called on unsupported platform (web)
 */
export async function getDeviceInfo(): Promise<{
  deviceId: string;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
  appVersion: string | null;
}> {
  if (!isDeviceAuthSupported()) {
    throw new Error('Device auth not supported on web platform');
  }
  
  let deviceId: string;
  
  if (Platform.OS === 'ios') {
    // iOS: Use vendor ID (stable across app reinstalls)
    deviceId = await Application.getIosIdForVendorAsync() || `ios-${Date.now()}`;
  } else if (Platform.OS === 'android') {
    // Android: Use Android ID (stable across app reinstalls)
    deviceId = Application.getAndroidId() || `android-${Date.now()}`;
  } else {
    throw new Error('Device auth not supported on web platform');
  }
  
  return {
    deviceId,
    deviceName: Device.deviceName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    appVersion: Application.nativeApplicationVersion,
  };
}

/**
 * Delete device keypair from secure storage (on logout)
 */
export async function deleteDeviceKeypair(): Promise<void> {
  await SecureStore.deleteItemAsync('device_private_key');
  await SecureStore.deleteItemAsync('device_public_key');
}

/**
 * Store session data in secure storage
 * 
 * This allows session restoration on app restart without re-authentication.
 * 
 * @param session Session object with user and tokens
 */
export async function storeSession(session: { user: any; tokens: any }): Promise<void> {
  await SecureStore.setItemAsync('device_session', JSON.stringify(session));
}

/**
 * Retrieve stored session from secure storage
 * 
 * @returns Stored session or null if not found
 */
export async function getStoredSession(): Promise<{ user: any; tokens: any } | null> {
  try {
    const sessionString = await SecureStore.getItemAsync('device_session');
    if (!sessionString) {
      return null;
    }
    return JSON.parse(sessionString);
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return null;
  }
}

/**
 * Delete stored session (on logout)
 */
export async function deleteSession(): Promise<void> {
  await SecureStore.deleteItemAsync('device_session');
}

/**
 * Test device auth functionality
 * 
 * This function verifies that:
 * 1. Secure randomness is working (generates different keys)
 * 2. Key generation works
 * 3. Signing works
 * 4. Verification works
 * 
 * Run this in development to ensure everything is set up correctly.
 */
export async function testDeviceAuth(): Promise<{
  success: boolean;
  details: string[];
  errors: string[];
}> {
  const details: string[] = [];
  const errors: string[] = [];
  
  try {
    // Test 1: Platform support
    details.push(`Platform: ${Platform.OS}`);
    if (!isDeviceAuthSupported()) {
      errors.push('Device auth not supported on this platform');
      return { success: false, details, errors };
    }
    details.push('✅ Platform supported');
    
    // Test 2: RNG (generate two keys, ensure they're different)
    const keypair1 = await generateDeviceKeypair();
    const keypair2 = await generateDeviceKeypair();
    
    if (keypair1.privateKey === keypair2.privateKey) {
      errors.push('RNG appears broken - generated identical keys');
      return { success: false, details, errors };
    }
    details.push('✅ RNG working (generated different keys)');
    details.push(`  Key 1: ${keypair1.privateKey.substring(0, 16)}...`);
    details.push(`  Key 2: ${keypair2.privateKey.substring(0, 16)}...`);
    
    // Test 3: Sign and verify
    const testChallenge = 'test-challenge-' + Date.now();
    const signature = await signChallenge(testChallenge, keypair1.privateKey);
    const isValid = await verifySignature(testChallenge, signature, keypair1.publicKey);
    
    if (!isValid) {
      errors.push('Signature verification failed');
      return { success: false, details, errors };
    }
    details.push('✅ Sign/verify working');
    details.push(`  Challenge: ${testChallenge}`);
    details.push(`  Signature: ${signature.substring(0, 32)}...`);
    
    // Test 4: Deterministic signatures (same input = same output)
    const signature2 = await signChallenge(testChallenge, keypair1.privateKey);
    if (signature !== signature2) {
      errors.push('Signatures are not deterministic (RFC 6979 issue)');
      return { success: false, details, errors };
    }
    details.push('✅ Signatures are deterministic (RFC 6979)');
    
    // Test 5: Storage
    await storeDeviceKeypair(keypair1.privateKey, keypair1.publicKey);
    const retrieved = await getDeviceKeypair();
    
    if (!retrieved || retrieved.privateKey !== keypair1.privateKey) {
      errors.push('Key storage/retrieval failed');
      return { success: false, details, errors };
    }
    details.push('✅ Secure storage working');
    
    // Cleanup
    await deleteDeviceKeypair();
    details.push('✅ All tests passed!');
    
    return { success: true, details, errors };
    
  } catch (error) {
    errors.push(`Test failed with error: ${error}`);
    return { success: false, details, errors };
  }
}
