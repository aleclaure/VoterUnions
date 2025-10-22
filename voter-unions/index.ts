/**
 * Platform-Aware Crypto Polyfill
 *
 * NATIVE (iOS/Android):
 * - Imports expo-crypto for hardware-backed randomness
 * - Polyfills global.crypto for @noble/curves and elliptic
 * - Uses native secure random generators (SecRandomCopyBytes / SecureRandom)
 *
 * WEB (Browser):
 * - Skips polyfill entirely
 * - Uses native window.crypto and crypto.getRandomValues()
 * - Already available in all modern browsers
 *
 * This ensures device token authentication works on ALL platforms.
 */
import { Platform } from 'react-native';

// Only polyfill on native platforms (iOS/Android)
// Web already has native crypto.getRandomValues() support
if (Platform.OS !== 'web') {
  // Import expo-crypto only on native platforms
  // This provides hardware-backed secure randomness
  const { getRandomValues } = require('expo-crypto');

  // Polyfill global crypto object for @noble/curves and elliptic
  if (typeof global.crypto !== 'object') {
    global.crypto = {} as any;
  }
  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = getRandomValues as any;
  }

  console.log('[Native Platform] Crypto polyfill applied for ' + Platform.OS);
} else {
  console.log('[Web Platform] Using native Web Crypto API');
  console.log('🔄 CODE VERSION: ' + new Date().toISOString());
  console.log('📦 Bundle loaded successfully - starting App...');
}

// Import and register the root component
import { registerRootComponent } from 'expo';
import App from './App';

console.log('🎯 Registering root component...');
registerRootComponent(App);
console.log('✅ Root component registered successfully!');
