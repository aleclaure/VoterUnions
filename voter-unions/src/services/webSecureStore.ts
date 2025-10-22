/**
 * Web Secure Storage Service
 *
 * Browser-compatible encrypted storage using IndexedDB + Web Crypto API.
 * Provides the same interface as expo-secure-store for cross-platform compatibility.
 *
 * Architecture:
 * - Storage: IndexedDB for persistent key-value storage
 * - Encryption: AES-GCM 256-bit via Web Crypto API
 * - Master Key: Derived from device ID using PBKDF2
 * - Security: Each value encrypted with unique IV
 *
 * Trade-offs:
 * - Less secure than hardware-backed keystores (iOS Keychain, Android Keystore)
 * - Relies on browser sandboxing for security
 * - Master key derivation uses device ID (stored in localStorage)
 * - If localStorage is cleared, all encrypted data becomes inaccessible
 */

import { getWebDeviceId } from './webDeviceId';

const DB_NAME = 'voter_unions_secure_store';
const DB_VERSION = 1;
const STORE_NAME = 'secure_data';
const MASTER_KEY_SALT = 'voter-unions-web-secure-store-v1';

// Cache for the master encryption key
let cachedMasterKey: CryptoKey | null = null;

/**
 * Initialize IndexedDB
 *
 * Creates the database and object store if they don't exist
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB: ' + request.error?.message));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Derive master encryption key from device ID
 *
 * Uses PBKDF2 to derive a strong encryption key from the device ID.
 * The device ID is a UUID stored in localStorage.
 *
 * @returns CryptoKey for AES-GCM encryption
 */
async function getMasterKey(): Promise<CryptoKey> {
  // Return cached key if available
  if (cachedMasterKey) {
    return cachedMasterKey;
  }

  try {
    // Get device ID (UUID from localStorage)
    const deviceId = getWebDeviceId();

    // Convert device ID to key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(deviceId),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(MASTER_KEY_SALT),
        iterations: 100000, // 100k iterations for security
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );

    // Cache the key
    cachedMasterKey = key;
    return key;
  } catch (error) {
    throw new Error('Failed to derive master encryption key: ' + (error as Error).message);
  }
}

/**
 * Encrypt data using AES-GCM
 *
 * @param plaintext - Data to encrypt
 * @returns Encrypted data with IV prepended
 */
async function encrypt(plaintext: string): Promise<ArrayBuffer> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Get master key
    const key = await getMasterKey();

    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Prepend IV to encrypted data (IV is not secret)
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);

    return result.buffer;
  } catch (error) {
    throw new Error('Encryption failed: ' + (error as Error).message);
  }
}

/**
 * Decrypt data using AES-GCM
 *
 * @param encryptedData - Encrypted data with IV prepended
 * @returns Decrypted plaintext
 */
async function decrypt(encryptedData: ArrayBuffer): Promise<string> {
  try {
    const data = new Uint8Array(encryptedData);

    // Extract IV (first 12 bytes)
    const iv = data.slice(0, 12);

    // Extract encrypted data (remaining bytes)
    const encrypted = data.slice(12);

    // Get master key
    const key = await getMasterKey();

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error('Decryption failed: ' + (error as Error).message);
  }
}

/**
 * Store encrypted value in IndexedDB
 *
 * Mirrors expo-secure-store's setItemAsync interface
 *
 * @param key - Storage key
 * @param value - Value to store (will be encrypted)
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    // Encrypt the value
    const encryptedData = await encrypt(value);

    // Store in IndexedDB
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(encryptedData, key);

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(new Error('Failed to store encrypted data: ' + request.error?.message));
      };
    });
  } catch (error) {
    throw new Error('setItemAsync failed: ' + (error as Error).message);
  }
}

/**
 * Retrieve and decrypt value from IndexedDB
 *
 * Mirrors expo-secure-store's getItemAsync interface
 *
 * @param key - Storage key
 * @returns Decrypted value or null if not found
 */
export async function getItemAsync(key: string): Promise<string | null> {
  try {
    // Retrieve from IndexedDB
    const db = await openDatabase();

    const encryptedData = await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };

      request.onerror = () => {
        db.close();
        reject(new Error('Failed to retrieve encrypted data: ' + request.error?.message));
      };
    });

    // Return null if not found
    if (!encryptedData) {
      return null;
    }

    // Decrypt and return
    return await decrypt(encryptedData);
  } catch (error) {
    throw new Error('getItemAsync failed: ' + (error as Error).message);
  }
}

/**
 * Delete value from IndexedDB
 *
 * Mirrors expo-secure-store's deleteItemAsync interface
 *
 * @param key - Storage key to delete
 */
export async function deleteItemAsync(key: string): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(new Error('Failed to delete encrypted data: ' + request.error?.message));
      };
    });
  } catch (error) {
    throw new Error('deleteItemAsync failed: ' + (error as Error).message);
  }
}

/**
 * Clear all stored data
 *
 * Useful for logout or testing
 */
export async function clearAll(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(new Error('Failed to clear encrypted data: ' + request.error?.message));
      };
    });
  } catch (error) {
    throw new Error('clearAll failed: ' + (error as Error).message);
  }
}

/**
 * Check if web secure storage is available
 *
 * @returns true if IndexedDB and Web Crypto API are available
 */
export function isAvailable(): boolean {
  try {
    return (
      typeof indexedDB !== 'undefined' &&
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined'
    );
  } catch {
    return false;
  }
}
