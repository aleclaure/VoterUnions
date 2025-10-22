/**
 * FIX OPTION 3: Shared Crypto Utilities
 *
 * PROBLEM: Web and native duplicate hashing logic, risk of divergence
 * SOLUTION: Create shared utilities that both platforms use
 *
 * APPLY THIS FIX IF:
 * - You want to prevent future inconsistencies
 * - You want one source of truth for crypto operations
 * - You're refactoring for long-term maintainability
 *
 * HOW TO APPLY:
 * 1. Add this file to src/services/sharedCryptoUtils.ts
 * 2. Update webDeviceAuth.ts to use these utilities
 * 3. Update deviceAuth.ts to use these utilities
 * 4. Both platforms will use identical hashing logic
 */

import { sha256 } from '@noble/hashes/sha256';

/**
 * Shared Crypto Utilities
 *
 * These functions ensure consistent cryptographic operations
 * across web and native platforms.
 */

/**
 * Convert bytes to hex string (browser and Node.js compatible)
 *
 * @param bytes Uint8Array to convert
 * @returns Hex-encoded string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string to bytes (browser and Node.js compatible)
 *
 * @param hex Hex-encoded string
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hash a challenge string with SHA-256
 *
 * This is the CANONICAL way to hash challenges in this app.
 * Both web and native MUST use this function.
 *
 * @param challenge Challenge string from server
 * @returns SHA-256 hash as Uint8Array
 */
export function hashChallenge(challenge: string): Uint8Array {
  // Convert challenge string to UTF-8 bytes
  const challengeBytes = new TextEncoder().encode(challenge);

  // Hash with SHA-256
  const hash = sha256(challengeBytes);

  return hash;
}

/**
 * Hash a challenge and return as hex string
 *
 * Convenience function for when you need the hash as hex.
 *
 * @param challenge Challenge string from server
 * @returns SHA-256 hash as hex string
 */
export function hashChallengeHex(challenge: string): string {
  return bytesToHex(hashChallenge(challenge));
}

/**
 * Prepare message for signing (canonical method)
 *
 * This ensures both web and native sign the EXACT same value.
 *
 * @param message Message to prepare (usually a challenge)
 * @returns Hash ready for signing
 */
export function prepareMessageForSigning(message: string): Uint8Array {
  // For challenges, we always hash with SHA-256 first
  // This matches the backend expectation
  return hashChallenge(message);
}

/**
 * Verify that a hash matches a message
 *
 * Useful for testing and debugging.
 *
 * @param message Original message
 * @param hash Hash to verify (hex or bytes)
 * @returns true if hash matches
 */
export function verifyHash(
  message: string,
  hash: string | Uint8Array
): boolean {
  const expectedHash = hashChallenge(message);
  const actualHash = typeof hash === 'string' ? hexToBytes(hash) : hash;

  if (expectedHash.length !== actualHash.length) {
    return false;
  }

  for (let i = 0; i < expectedHash.length; i++) {
    if (expectedHash[i] !== actualHash[i]) {
      return false;
    }
  }

  return true;
}

/**
 * USAGE EXAMPLES:
 */

// Example 1: Sign a challenge (web)
/*
import { p256 } from '@noble/curves/p256';
import { prepareMessageForSigning, bytesToHex } from './sharedCryptoUtils';

export async function signChallenge(challenge: string, privateKey: string): Promise<string> {
  const privateKeyBytes = hexToBytes(privateKey);
  const messageHash = prepareMessageForSigning(challenge);  // ← Use shared utility
  const signature = p256.sign(messageHash, privateKeyBytes);
  return bytesToHex(signature.toCompactRawBytes());
}
*/

// Example 2: Sign a challenge (native)
/*
import { ec as EC } from 'elliptic';
import { prepareMessageForSigning } from './sharedCryptoUtils';

const ec = new EC('p256');

export async function signChallenge(challenge: string, privateKey: string): Promise<string> {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const messageHash = prepareMessageForSigning(challenge);  // ← Use shared utility
  const signature = keyPair.sign(messageHash);
  return signature.toDER('hex');
}
*/

// Example 3: Verify a hash (testing)
/*
import { verifyHash, hashChallengeHex } from './sharedCryptoUtils';

const challenge = 'test-challenge-123';
const hash = hashChallengeHex(challenge);
console.log('Hash:', hash);
console.log('Valid:', verifyHash(challenge, hash));  // true
*/

/**
 * INTEGRATION CHECKLIST:
 *
 * □ Add this file as src/services/sharedCryptoUtils.ts
 * □ Update webDeviceAuth.ts:
 *   - Import { prepareMessageForSigning, bytesToHex, hexToBytes }
 *   - Replace inline hash logic with prepareMessageForSigning()
 * □ Update deviceAuth.ts:
 *   - Import { prepareMessageForSigning }
 *   - Replace keyPair.sign(challenge) with keyPair.sign(prepareMessageForSigning(challenge))
 * □ Run cryptoCompatibilityTest to verify
 * □ Test both web and native authentication
 * □ Verify backend logs show successful verification
 */

export const FIX_DETAILS = {
  name: 'FIX_OPTION_3: Shared Crypto Utilities',
  description: 'Create shared utilities for consistent crypto operations',
  changes: [
    'Create sharedCryptoUtils.ts with canonical hashing',
    'Update webDeviceAuth.ts to use shared utilities',
    'Update deviceAuth.ts to use shared utilities',
    'Ensure both platforms use identical hashing logic',
  ],
  pros: [
    '✅ Single source of truth for crypto operations',
    '✅ Prevents future divergence',
    '✅ Easier to maintain and test',
    '✅ Well-documented canonical methods',
    '✅ Reusable across entire codebase',
  ],
  cons: [
    '⚠️ Requires refactoring both web and native',
    '⚠️ More initial work than Fix 1 or 2',
    '⚠️ Need to ensure all call sites updated',
  ],
  when_to_use: 'For long-term maintainability and preventing future issues',
  recommended: true,  // This is the BEST solution long-term
};

/**
 * TESTING:
 *
 * After applying this fix, you can verify consistency:
 */

export function testSharedUtilities() {
  const testChallenge = 'test-challenge-12345';

  console.log('Testing Shared Crypto Utilities\n');

  // Test 1: Hash consistency
  const hash1 = hashChallenge(testChallenge);
  const hash2 = hashChallenge(testChallenge);
  console.log('Hash 1:', bytesToHex(hash1));
  console.log('Hash 2:', bytesToHex(hash2));
  console.log('Hashes match:', bytesToHex(hash1) === bytesToHex(hash2), '\n');

  // Test 2: Hex conversion
  const hashHex = hashChallengeHex(testChallenge);
  console.log('Hash (hex):', hashHex);
  console.log('Hash valid:', verifyHash(testChallenge, hashHex), '\n');

  // Test 3: Prepare for signing
  const prepared = prepareMessageForSigning(testChallenge);
  console.log('Prepared for signing:', bytesToHex(prepared));
  console.log('Same as hash:', bytesToHex(prepared) === hashHex, '\n');

  return {
    hashesMatch: bytesToHex(hash1) === bytesToHex(hash2),
    hashValid: verifyHash(testChallenge, hashHex),
    preparedCorrect: bytesToHex(prepared) === hashHex,
  };
}

export default {
  bytesToHex,
  hexToBytes,
  hashChallenge,
  hashChallengeHex,
  prepareMessageForSigning,
  verifyHash,
  testSharedUtilities,
  FIX_DETAILS,
};
