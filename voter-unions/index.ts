// CRITICAL: Polyfill crypto.getRandomValues() FIRST before any other imports
// This provides secure randomness for @noble/curves on React Native
import { getRandomValues } from 'expo-crypto';

// Polyfill global crypto object for @noble/curves
if (typeof global.crypto !== 'object') {
  global.crypto = {} as any;
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = getRandomValues as any;
}

export { default } from './App';
