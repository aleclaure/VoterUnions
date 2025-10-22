/**
 * Diagnostic Test Endpoints
 *
 * These endpoints help test signature verification and crypto compatibility.
 * ONLY ENABLE IN DEVELOPMENT - REMOVE IN PRODUCTION
 */

import { FastifyInstance } from 'fastify';
import { verifySignature } from '../crypto';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Convert bytes to hex
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Register diagnostic endpoints
 */
export async function registerDiagnosticRoutes(app: FastifyInstance) {
  /**
   * POST /diagnostic/test-signature
   *
   * Test signature verification with detailed logging
   */
  app.post('/diagnostic/test-signature', async (request, reply) => {
    try {
      const {
        message,
        signature,
        publicKey,
        platform,
      } = request.body as {
        message: string;
        signature: string;
        publicKey: string;
        platform?: 'web' | 'ios' | 'android';
      };

      if (!message || !signature || !publicKey) {
        return reply.code(400).send({
          error: 'Missing required fields',
          required: ['message', 'signature', 'publicKey'],
        });
      }

      app.log.info('=== DIAGNOSTIC SIGNATURE TEST ===');
      app.log.info(`Platform: ${platform || 'unknown'}`);
      app.log.info(`Message: ${message}`);
      app.log.info(`Message Length: ${message.length}`);
      app.log.info(`Signature: ${signature.substring(0, 32)}...`);
      app.log.info(`Signature Length: ${signature.length}`);
      app.log.info(`Public Key: ${publicKey.substring(0, 32)}...`);
      app.log.info(`Public Key Length: ${publicKey.length}`);

      // Calculate expected hash
      const messageHash = sha256(new TextEncoder().encode(message));
      const messageHashHex = bytesToHex(messageHash);
      app.log.info(`Expected Hash: ${messageHashHex}`);

      // Attempt verification
      const isValid = await verifySignature(message, signature, publicKey, platform);

      app.log.info(`Verification Result: ${isValid ? 'SUCCESS ✅' : 'FAILED ❌'}`);
      app.log.info('=== END DIAGNOSTIC TEST ===');

      return {
        valid: isValid,
        diagnostics: {
          platform: platform || 'unknown',
          messageLength: message.length,
          signatureLength: signature.length,
          publicKeyLength: publicKey.length,
          expectedHash: messageHashHex,
          signatureFormat: signature.length === 128
            ? 'compact (64 bytes)'
            : signature.startsWith('30')
              ? 'DER'
              : 'unknown',
        },
      };
    } catch (error) {
      app.log.error({ error }, 'Diagnostic test failed');
      return reply.code(500).send({
        error: 'Diagnostic test failed',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /diagnostic/hash-message
   *
   * Test message hashing (verify client and server hash the same way)
   */
  app.post('/diagnostic/hash-message', async (request, reply) => {
    try {
      const { message } = request.body as { message: string };

      if (!message) {
        return reply.code(400).send({
          error: 'Missing message field',
        });
      }

      const messageBytes = new TextEncoder().encode(message);
      const messageHash = sha256(messageBytes);
      const messageHashHex = bytesToHex(messageHash);

      app.log.info('=== HASH DIAGNOSTIC ===');
      app.log.info(`Message: ${message}`);
      app.log.info(`Message Length: ${message.length}`);
      app.log.info(`Message Bytes (first 32): ${bytesToHex(messageBytes.slice(0, 32))}...`);
      app.log.info(`SHA-256 Hash: ${messageHashHex}`);
      app.log.info('=== END HASH DIAGNOSTIC ===');

      return {
        message,
        messageLength: message.length,
        messageBytes: bytesToHex(messageBytes),
        hash: messageHashHex,
        hashBytes: Array.from(messageHash),
      };
    } catch (error) {
      app.log.error({ error }, 'Hash diagnostic failed');
      return reply.code(500).send({
        error: 'Hash diagnostic failed',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /diagnostic/crypto-info
   *
   * Get information about the crypto setup
   */
  app.get('/diagnostic/crypto-info', async (request, reply) => {
    return {
      curve: 'P-256 (secp256r1)',
      library: '@noble/curves',
      hashAlgorithm: 'SHA-256',
      signatureFormats: ['compact (64 bytes)', 'DER (variable)'],
      verificationStrategies: [
        'Strategy 1: Compact format with SHA-256 hash',
        'Strategy 2: DER format with SHA-256 hash',
        'Strategy 3: Compact format with raw message',
      ],
      endpoints: {
        testSignature: 'POST /diagnostic/test-signature',
        hashMessage: 'POST /diagnostic/hash-message',
        cryptoInfo: 'GET /diagnostic/crypto-info',
      },
    };
  });

  /**
   * POST /diagnostic/generate-test-challenge
   *
   * Generate a test challenge for testing
   */
  app.post('/diagnostic/generate-test-challenge', async (request, reply) => {
    const randomBytes = require('crypto').randomBytes(32);
    const challenge = randomBytes.toString('hex');

    return {
      challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      instructions: [
        '1. Use this challenge in your client',
        '2. Sign it with your private key',
        '3. Send signature to /diagnostic/test-signature',
        '4. Check logs for verification details',
      ],
    };
  });

  app.log.info('Diagnostic routes registered (DEVELOPMENT ONLY)');
}

/**
 * USAGE EXAMPLES:
 *
 * 1. Test web signature:
 * ```bash
 * curl -X POST http://localhost:3001/diagnostic/test-signature \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "message": "test-challenge",
 *     "signature": "abcd1234...",
 *     "publicKey": "04a1b2c3...",
 *     "platform": "web"
 *   }'
 * ```
 *
 * 2. Test native signature:
 * ```bash
 * curl -X POST http://localhost:3001/diagnostic/test-signature \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "message": "test-challenge",
 *     "signature": "30440220...",
 *     "publicKey": "04a1b2c3...",
 *     "platform": "ios"
 *   }'
 * ```
 *
 * 3. Test hashing:
 * ```bash
 * curl -X POST http://localhost:3001/diagnostic/hash-message \
 *   -H "Content-Type: application/json" \
 *   -d '{"message": "test-challenge"}'
 * ```
 *
 * 4. Get crypto info:
 * ```bash
 * curl http://localhost:3001/diagnostic/crypto-info
 * ```
 */
