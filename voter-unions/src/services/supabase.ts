import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Supabase credentials - MUST be provided via environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Runtime validation - fail fast if credentials are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'
  );
}

console.log('🔗 Supabase connecting to:', supabaseUrl.substring(0, 40) + '...');
console.log('🔑 Using anon key:', supabaseAnonKey.substring(0, 20) + '...');

// Secure storage wrapper using expo-secure-store (hardware-backed encryption)
// Falls back to AsyncStorage on web platform where SecureStore is unavailable
const SecureAuthStorage = {
  getItem: async (key: string) => {
    try {
      // Use SecureStore on native platforms for hardware-backed encryption
      if (SecureStore.isAvailableAsync && await SecureStore.isAvailableAsync()) {
        return await SecureStore.getItemAsync(key);
      }
      // Fallback to AsyncStorage on web with IndexedDB error handling
      return await getFromAsyncStorageSafely(key);
    } catch (error) {
      console.error('❌ Error getting secure item:', error);
      return null;
    }
  },
  
  setItem: async (key: string, value: string) => {
    try {
      // Use SecureStore on native platforms
      if (SecureStore.isAvailableAsync && await SecureStore.isAvailableAsync()) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      // Fallback to AsyncStorage on web
      await setToAsyncStorageSafely(key, value);
    } catch (error) {
      console.error('❌ Error setting secure item:', error);
      throw error;
    }
  },
  
  removeItem: async (key: string) => {
    try {
      // Use SecureStore on native platforms
      if (SecureStore.isAvailableAsync && await SecureStore.isAvailableAsync()) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
      // Fallback to AsyncStorage on web
      await removeFromAsyncStorageSafely(key);
    } catch (error) {
      console.error('❌ Error removing secure item:', error);
      throw error;
    }
  },
};

// AsyncStorage helpers with IndexedDB error handling (web platform only)
const getFromAsyncStorageSafely = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error: any) {
    if (typeof window !== 'undefined' && window.indexedDB && 
        (error?.message?.includes('version') || error?.message?.includes('database'))) {
      console.warn('⚠️ IndexedDB error, attempting recovery...');
      await deleteAsyncStorageDB();
      return await AsyncStorage.getItem(key);
    }
    throw error;
  }
};

const setToAsyncStorageSafely = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error: any) {
    if (typeof window !== 'undefined' && window.indexedDB && 
        (error?.message?.includes('version') || error?.message?.includes('database'))) {
      console.warn('⚠️ IndexedDB error, attempting recovery...');
      await deleteAsyncStorageDB();
      await AsyncStorage.setItem(key, value);
    } else {
      throw error;
    }
  }
};

const removeFromAsyncStorageSafely = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error: any) {
    if (typeof window !== 'undefined' && window.indexedDB && 
        (error?.message?.includes('version') || error?.message?.includes('database'))) {
      console.warn('⚠️ IndexedDB error, attempting recovery...');
      await deleteAsyncStorageDB();
      await AsyncStorage.removeItem(key);
    } else {
      throw error;
    }
  }
};

const deleteAsyncStorageDB = async (): Promise<void> => {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return new Promise((resolve) => {
      try {
        const deleteRequest = window.indexedDB.deleteDatabase('AsyncStorage');
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
        deleteRequest.onblocked = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }
};

// Create and export Supabase client with secure token storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureAuthStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
