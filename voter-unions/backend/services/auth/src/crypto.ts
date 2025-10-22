/**
 * Cryptography utilities for device token authentication
 *
 * Platform Support:
 * - Web: @noble/curves (P-256 ECDSA)
 * - Native: elliptic library (client-side, server verifies same way)
 */

import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from 'crypto';

/**
 * Generate authentication challenge
 *
 * @returns Random 32-byte challenge (hex)
 */
export function generateChallenge(): string {
  return randomBytes(32).toString('hex');
}

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
 * Verify P-256 ECDSA signature with platform-aware handling
 *
 * Supports both web (@noble/curves) and native (elliptic) signatures
 * Automatically detects format and tries multiple verification strategies
 *
 * @param message Challenge string
 * @param signature Hex-encoded signature
 * @param publicKey Hex-encoded public key
 * @param platform Optional platform hint ('web' | 'ios' | 'android')
 * @returns true if signature is valid
 */
export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string,
  platform?: 'web' | 'ios' | 'android'
): Promise<boolean> {
  try {
    // Convert public key from hex to bytes
    const publicKeyBytes = hexToBytes(publicKey);

    // Convert signature from hex to bytes
    const signatureBytes = hexToBytes(signature);

    // Hash the message with SHA-256
    const messageHash = sha256(new TextEncoder().encode(message));

    // Strategy 1: Try direct verification (compact format)
    // This works for both @noble/curves and elliptic if they use the same format
    try {
      const isValid = p256.verify(
        signatureBytes,
        messageHash,
        publicKeyBytes
      );

      if (isValid) {
        console.log(`[Platform: ${platform || 'unknown'}] Signature verified with compact format`);
        return true;
      }
    } catch (err) {
      console.log(`[Platform: ${platform || 'unknown'}] Compact format verification failed, trying alternatives`);
    }

    // Strategy 2: Try DER format conversion (if signature looks like DER)
    // Some clients might send DER-encoded signatures
    if (signatureBytes.length > 64 && signatureBytes[0] === 0x30) {
      try {
        const { r, s } = parseDERSignature(signatureBytes);
        const compactSig = new Uint8Array(64);
        compactSig.set(r, 0);
        compactSig.set(s, 32);

        const isValid = p256.verify(compactSig, messageHash, publicKeyBytes);
        if (isValid) {
          console.log(`[Platform: ${platform || 'unknown'}] Signature verified with DER format`);
          return true;
        }
      } catch (err) {
        console.log(`[Platform: ${platform || 'unknown'}] DER format verification failed`);
      }
    }

    // Strategy 3: Try with different hash (some implementations might not hash)
    // This is a fallback for clients that send pre-hashed messages
    try {
      const isValid = p256.verify(
        signatureBytes,
        hexToBytes(message), // Use raw message bytes
        publicKeyBytes
      );

      if (isValid) {
        console.log(`[Platform: ${platform || 'unknown'}] Signature verified with raw message`);
        return true;
      }
    } catch (err) {
      console.log(`[Platform: ${platform || 'unknown'}] Raw message verification failed`);
    }

    console.error(`[Platform: ${platform || 'unknown'}] All verification strategies failed`);
    return false;
  } catch (error) {
    console.error(`[Platform: ${platform || 'unknown'}] Signature verification error:`, error);
    return false;
  }
}

/**
 * Parse DER-encoded signature to extract r and s values
 * DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
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
 * Verify signature with extended error reporting
 * Useful for debugging platform-specific issues
 */
export async function verifySignatureWithDetails(
  message: string,
  signature: string,
  publicKey: string
): Promise<{
  isValid: boolean;
  error?: string;
  details?: any;
}> {
  try {
    const publicKeyBytes = hexToBytes(publicKey);
    const signatureBytes = hexToBytes(signature);
    const messageHash = sha256(new TextEncoder().encode(message));

    const isValid = p256.verify(
      signatureBytes,
      messageHash,
      publicKeyBytes
    );

    return {
      isValid,
      details: {
        messageLength: message.length,
        signatureLength: signature.length,
        publicKeyLength: publicKey.length,
        messageHashLength: messageHash.length,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
