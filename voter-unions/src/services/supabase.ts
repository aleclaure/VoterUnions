import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Your Supabase credentials - use environment secrets if available
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://yznjhfaeplbwozbhhull.supabase.co';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bmpoZmFlcGxid296YmhodWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDE2ODYsImV4cCI6MjA3NTIxNzY4Nn0.4PvbUvdYVHYV-6bzlW7bRBBIsejkPv59gIEzLmFroeA';

console.log('🔗 Supabase connecting to:', supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'NO URL!');
console.log('🔑 Using anon key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NO KEY!');

// Clear old SecureStore session data (one-time migration from SecureStore to AsyncStorage)
const clearOldSecureStoreSession = async () => {
  try {
    const oldSessionKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    await SecureStore.deleteItemAsync(oldSessionKey);
    console.log('✅ Cleared old SecureStore session data');
  } catch (error) {
    // Silently fail if key doesn't exist
    console.log('ℹ️ No old SecureStore session to clear');
  }
};

// Wrapper around AsyncStorage that handles IndexedDB version conflicts
const SafeAsyncStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error: any) {
      if (typeof window !== 'undefined' && window.indexedDB && 
          (error?.message?.includes('version') || error?.message?.includes('database'))) {
        console.warn('⚠️ IndexedDB error on getItem, deleting database...');
        await deleteAsyncStorageDB();
        // Retry after deletion
        try {
          return await AsyncStorage.getItem(key);
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          return null;
        }
      }
      throw error;
    }
  },
  
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error: any) {
      if (typeof window !== 'undefined' && window.indexedDB && 
          (error?.message?.includes('version') || error?.message?.includes('database'))) {
        console.warn('⚠️ IndexedDB error on setItem, deleting database...');
        await deleteAsyncStorageDB();
        // Retry after deletion
        await AsyncStorage.setItem(key, value);
      } else {
        throw error;
      }
    }
  },
  
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error: any) {
      if (typeof window !== 'undefined' && window.indexedDB && 
          (error?.message?.includes('version') || error?.message?.includes('database'))) {
        console.warn('⚠️ IndexedDB error on removeItem, deleting database...');
        await deleteAsyncStorageDB();
        // Retry after deletion
        await AsyncStorage.removeItem(key);
      } else {
        throw error;
      }
    }
  },
};

// Helper to delete IndexedDB database
const deleteAsyncStorageDB = async (): Promise<void> => {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return new Promise((resolve) => {
      try {
        const deleteRequest = window.indexedDB.deleteDatabase('AsyncStorage');
        
        deleteRequest.onsuccess = () => {
          console.log('✅ IndexedDB deleted successfully');
          resolve();
        };
        
        deleteRequest.onerror = () => {
          console.error('❌ Failed to delete IndexedDB');
          resolve();
        };
        
        deleteRequest.onblocked = () => {
          console.warn('⚠️ IndexedDB deletion blocked');
          resolve();
        };
      } catch (err) {
        console.error('❌ Error deleting IndexedDB:', err);
        resolve();
      }
    });
  }
};

// Run cleanup on import
clearOldSecureStoreSession();

// Create and export Supabase client with safe storage wrapper
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SafeAsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
