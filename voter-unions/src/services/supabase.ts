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

// Run cleanup on import
clearOldSecureStoreSession();

// Create and export Supabase client
// Using AsyncStorage instead of SecureStore to avoid 2048-byte limit (recommended by Expo + Supabase 2024)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
