// CRITICAL: Import crypto polyfill FIRST before any other imports
// This provides crypto.getRandomValues() for @noble/curves on React Native
import 'react-native-get-random-values';

export { default } from './App';
