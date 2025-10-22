/**
 * FIX OPTION 2: Backend Dual Verification Strategy
 *
 * PROBLEM: Web and native may sign different things (hashed vs unhashed)
 * SOLUTION: Backend tries BOTH interpretations automatically
 *
 * APPLY THIS FIX IF:
 * - You don't want to modify client code
 * - You want backend to handle both cases gracefully
 * - Native authentication fails but you can't update the app yet
 *
 * HOW TO APPLY:
 * Replace the verifySignature function in:
 * backend/services/auth/src/crypto.ts
 */

import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Parse DER-encoded signature to extract r and s values
 */
function parseDERSignature(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  let offset = 0;

  if (der[offset++] !== 0x30) throw new Error('Invalid DER signature');
  const totalLength = der[offset++];

  if (der[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const rLength = der[offset++];
  let r = der.slice(offset, offset + rLength);
  offset += rLength;

  if (der[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const sLength = der[offset++];
  let s = der.slice(offset, offset + sLength);

  // Remove leading zeros if present (DER padding)
  if (r.length === 33 && r[0] === 0x00) r = r.slice(1);
  if (s.length === 33 && s[0] === 0x00) s = s.slice(1);

  // Pad to 32 bytes if needed
  if (r.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(r, 32 - r.length);
    r = padded;
  }
  if (s.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(s, 32 - s.length);
    s = padded;
  }

  return { r, s };
}

/**
 * ENHANCED: Verify P-256 ECDSA signature with DUAL hashing strategy
 *
 * This version tries BOTH:
 * 1. Signature of sha256(message) - for web and fixed native
 * 2. Signature of raw message bytes - for unfixed native
 *
 * @param message Challenge string
 * @param signature Hex-encoded signature
 * @param publicKey Hex-encoded public key
 * @param platform Optional platform hint
 * @returns true if signature is valid under ANY interpretation
 */
export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string,
  platform?: 'web' | 'ios' | 'android'
): Promise<boolean> {
  try {
    const publicKeyBytes = hexToBytes(publicKey);
    const signatureBytes = hexToBytes(signature);

    // Strategy 1: Verify signature of SHA-256 hashed message
    // This is what web does and what we EXPECT
    console.log(`[Platform: ${platform || 'unknown'}] Trying Strategy 1: Hashed message`);
    try {
      const messageHash = sha256(new TextEncoder().encode(message));
      const isValid = p256.verify(signatureBytes, messageHash, publicKeyBytes);

      if (isValid) {
        console.log(`[Platform: ${platform}] ✅ Verified with SHA-256 hashed message (EXPECTED)`);
        return true;
      }
    } catch (err) {
      console.log(`[Platform: ${platform}] Strategy 1 failed:`, (err as Error).message);
    }

    // Strategy 2: Try DER format conversion, then verify hashed message
    // Native clients send DER, needs conversion to compact
    if (signatureBytes.length > 64 && signatureBytes[0] === 0x30) {
      console.log(`[Platform: ${platform}] Trying Strategy 2: DER format with hashed message`);
      try {
        const { r, s } = parseDERSignature(signatureBytes);
        const compactSig = new Uint8Array(64);
        compactSig.set(r, 0);
        compactSig.set(s, 32);

        const messageHash = sha256(new TextEncoder().encode(message));
        const isValid = p256.verify(compactSig, messageHash, publicKeyBytes);

        if (isValid) {
          console.log(`[Platform: ${platform}] ✅ Verified DER signature with hashed message (EXPECTED for native)`);
          return true;
        }
      } catch (err) {
        console.log(`[Platform: ${platform}] Strategy 2 failed:`, (err as Error).message);
      }
    }

    // Strategy 3: Verify signature of RAW message bytes (no hash)
    // FALLBACK for native clients that don't hash before signing
    console.log(`[Platform: ${platform}] Trying Strategy 3: Raw message bytes (FALLBACK)`);
    try {
      const rawMessageBytes = new TextEncoder().encode(message);
      const isValid = p256.verify(signatureBytes, rawMessageBytes, publicKeyBytes);

      if (isValid) {
        console.log(`[Platform: ${platform}] ⚠️  Verified with raw message (native not hashing!)`);
        console.log(`[Platform: ${platform}] ⚠️  RECOMMENDATION: Update native client to hash before signing`);
        return true;
      }
    } catch (err) {
      console.log(`[Platform: ${platform}] Strategy 3 failed:`, (err as Error).message);
    }

    // Strategy 4: DER format with raw message (last resort)
    if (signatureBytes.length > 64 && signatureBytes[0] === 0x30) {
      console.log(`[Platform: ${platform}] Trying Strategy 4: DER format with raw message (LAST RESORT)`);
      try {
        const { r, s } = parseDERSignature(signatureBytes);
        const compactSig = new Uint8Array(64);
        compactSig.set(r, 0);
        compactSig.set(s, 32);

        const rawMessageBytes = new TextEncoder().encode(message);
        const isValid = p256.verify(compactSig, rawMessageBytes, publicKeyBytes);

        if (isValid) {
          console.log(`[Platform: ${platform}] ⚠️  Verified DER + raw message (native definitely not hashing!)`);
          console.log(`[Platform: ${platform}] ⚠️  URGENT: Update native client to hash before signing`);
          return true;
        }
      } catch (err) {
        console.log(`[Platform: ${platform}] Strategy 4 failed:`, (err as Error).message);
      }
    }

    console.error(`[Platform: ${platform}] ❌ All 4 verification strategies failed`);
    return false;
  } catch (error) {
    console.error(`[Platform: ${platform}] Signature verification error:`, error);
    return false;
  }
}

/**
 * CHANGES SUMMARY:
 *
 * ADDED TWO NEW STRATEGIES:
 * - Strategy 3: Verify signature of raw message (no hash)
 * - Strategy 4: DER + raw message (belt and suspenders)
 *
 * VERIFICATION ORDER:
 * 1. Compact + Hashed (web, fixed native)
 * 2. DER + Hashed (unfixed native that hashes internally)
 * 3. Compact + Raw (unfixed native that doesn't hash) ← NEW
 * 4. DER + Raw (double-unhashed native) ← NEW
 *
 * WHY THIS WORKS:
 * - Accepts signatures from ANY client configuration
 * - Logs warnings when detecting unhashed signatures
 * - Backward compatible with all client versions
 * - Doesn't require client updates
 *
 * SECURITY NOTE:
 * This is safe because:
 * - We're verifying the signature is valid for the claimed public key
 * - We control both the challenge and the verification
 * - The signature proves possession of the private key regardless
 *   of whether it's a signature of hash(challenge) or just challenge
 */

export const FIX_DETAILS = {
  name: 'FIX_OPTION_2: Backend Dual Verification',
  description: 'Backend accepts both hashed and unhashed signatures',
  changes: [
    'Add Strategy 3: Verify raw message bytes',
    'Add Strategy 4: DER format + raw message',
    'Add logging to detect which strategy worked',
  ],
  pros: [
    '✅ No client changes required',
    '✅ Backward compatible with all clients',
    '✅ Logs warnings for unhashed signatures',
    '✅ Works immediately without app updates',
  ],
  cons: [
    '⚠️ More complex backend logic',
    '⚠️ Hides the root cause instead of fixing it',
    '⚠️ Clients might never get updated',
  ],
  when_to_use: 'If you can't update native clients immediately',
};
