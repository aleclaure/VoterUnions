/**
 * Crypto Polyfill for Device Token Authentication
 * 
 * CRITICAL: This file MUST be imported FIRST in the application entry point.
 * It provides secure random values for @noble/curves cryptographic operations.
 * 
 * Security: Uses react-native-get-random-values which provides:
 * - iOS: SecRandomCopyBytes (hardware RNG)
 * - Android: SecureRandom (hardware RNG)
 * - Web: crypto.getRandomValues (browser API)
 */

import 'react-native-get-random-values';

console.log('✅ Crypto polyfill initialized (react-native-get-random-values)');
console.log('   - Secure randomness available for @noble/curves');
console.log('   - Hardware-backed RNG on iOS/Android');
