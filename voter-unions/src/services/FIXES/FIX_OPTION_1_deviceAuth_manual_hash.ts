/**
 * FIX OPTION 1: Manual Hashing in Native deviceAuth.ts
 *
 * PROBLEM: If elliptic doesn't hash internally, native signatures won't verify
 * SOLUTION: Manually hash the challenge before signing (match web behavior)
 *
 * APPLY THIS FIX IF:
 * - cryptoCompatibilityTest shows signatures DON'T match
 * - Native authentication fails with "Invalid signature"
 * - Backend logs show all 3 verification strategies failed for native
 *
 * HOW TO APPLY:
 * 1. Replace the signChallenge function in src/services/deviceAuth.ts
 * 2. Test native registration and login
 * 3. Verify backend logs show successful verification
 */

import { ec as EC } from 'elliptic';
import { sha256 } from '@noble/hashes/sha256';
import * as platformStorage from './platformStorage';

const ec = new EC('p256');

/**
 * Sign a challenge with device private key - WITH MANUAL HASHING
 *
 * This version ALWAYS hashes the challenge before signing, matching
 * the web implementation exactly.
 *
 * @param challenge Challenge string from server
 * @param privateKey Hex-encoded private key
 * @returns Hex-encoded signature (DER format)
 */
export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  try {
    // Create keypair from private key
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');

    // CRITICAL: Manually hash the challenge with SHA-256 FIRST
    // This matches the web implementation in webDeviceAuth.ts
    const messageHash = sha256(new TextEncoder().encode(challenge));

    // Sign the HASH (not the raw challenge)
    const signature = keyPair.sign(messageHash);

    // Return signature in DER format
    return signature.toDER('hex');
  } catch (error) {
    console.error('Native signature generation failed:', error);
    throw new Error('Signature generation failed: ' + (error as Error).message);
  }
}

/**
 * Verify a signature (for testing) - WITH MANUAL HASHING
 *
 * @param challenge Original challenge string
 * @param signature Hex-encoded signature (DER format)
 * @param publicKey Hex-encoded public key
 * @returns true if signature is valid
 */
export function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Create public key from hex
    const key = ec.keyFromPublic(publicKey, 'hex');

    // CRITICAL: Manually hash the challenge FIRST
    const messageHash = sha256(new TextEncoder().encode(challenge));

    // Verify signature against the HASH
    return key.verify(messageHash, signature);
  } catch (error) {
    console.error('Native signature verification failed:', error);
    return false;
  }
}

/**
 * CHANGES SUMMARY:
 *
 * BEFORE (potentially incompatible):
 * ```typescript
 * const signature = keyPair.sign(challenge);
 * ```
 *
 * AFTER (guaranteed compatible):
 * ```typescript
 * const messageHash = sha256(new TextEncoder().encode(challenge));
 * const signature = keyPair.sign(messageHash);
 * ```
 *
 * WHY THIS WORKS:
 * - Web already hashes before signing (webDeviceAuth.ts:161)
 * - Backend expects signatures of sha256(challenge) (crypto.ts:59)
 * - This makes native behavior identical to web
 * - Both platforms now sign sha256(challenge)
 *
 * VERIFICATION:
 * After applying this fix, both platforms will:
 * 1. Hash challenge: sha256("abc123...")
 * 2. Sign the hash with P-256 ECDSA
 * 3. Backend verifies hash signature successfully
 */

export const FIX_DETAILS = {
  name: 'FIX_OPTION_1: Manual Hashing',
  description: 'Force native to hash before signing, matching web behavior',
  changes: [
    'Import sha256 from @noble/hashes/sha256',
    'Hash challenge before signing: sha256(encode(challenge))',
    'Update verifySignature to also hash before verifying',
  ],
  pros: [
    '✅ Guarantees compatibility with web',
    '✅ Guarantees compatibility with backend',
    '✅ Simple, one-time change',
    '✅ Makes both platforms identical',
  ],
  cons: [
    '⚠️ Requires changing working code (if elliptic already hashes)',
    '⚠️ Adds dependency on @noble/hashes for native',
  ],
  when_to_use: 'If native auth fails with "Invalid signature"',
};
