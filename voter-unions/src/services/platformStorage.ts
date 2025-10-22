/**
 * Platform Storage Abstraction
 *
 * Provides unified secure storage interface across all platforms:
 * - iOS/Android: Uses expo-secure-store (hardware-backed keystore)
 * - Web: Uses webSecureStore (IndexedDB + Web Crypto API)
 *
 * This abstraction allows deviceAuth.ts to work seamlessly on all platforms
 * without platform-specific conditional logic.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebSecureStore from './webSecureStore';

/**
 * Store encrypted value
 *
 * @param key - Storage key
 * @param value - Value to store (will be encrypted)
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Use web secure store for browsers
    return WebSecureStore.setItemAsync(key, value);
  } else {
    // Use expo-secure-store for iOS/Android
    return SecureStore.setItemAsync(key, value);
  }
}

/**
 * Retrieve encrypted value
 *
 * @param key - Storage key
 * @returns Decrypted value or null if not found
 */
export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Use web secure store for browsers
    return WebSecureStore.getItemAsync(key);
  } else {
    // Use expo-secure-store for iOS/Android
    return SecureStore.getItemAsync(key);
  }
}

/**
 * Delete value
 *
 * @param key - Storage key to delete
 */
export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Use web secure store for browsers
    return WebSecureStore.deleteItemAsync(key);
  } else {
    // Use expo-secure-store for iOS/Android
    return SecureStore.deleteItemAsync(key);
  }
}

/**
 * Check if secure storage is available
 *
 * @returns true if secure storage is available on current platform
 */
export function isAvailable(): boolean {
  if (Platform.OS === 'web') {
    // Check if web secure store is available
    return WebSecureStore.isAvailable();
  } else {
    // expo-secure-store is always available on iOS/Android
    return true;
  }
}

/**
 * Clear all stored data
 *
 * Useful for logout or testing
 *
 * Note: On native platforms, this only clears keys we know about.
 * expo-secure-store doesn't provide a clearAll method.
 */
export async function clearAll(knownKeys: string[]): Promise<void> {
  if (Platform.OS === 'web') {
    // Web secure store can clear everything
    return WebSecureStore.clearAll();
  } else {
    // For native, delete known keys individually
    await Promise.all(knownKeys.map((key) => SecureStore.deleteItemAsync(key)));
  }
}
