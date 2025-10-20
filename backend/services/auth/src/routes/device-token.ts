/**
 * Device Token Authentication Routes
 * 
 * ECDSA P-256 signature-based authentication (Expo Go compatible)
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { hexToBytes } from '@noble/hashes/utils';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import crypto from 'crypto';

// Request schemas
const RegisterDeviceSchema = z.object({
  publicKey: z.string().length(130), // Hex-encoded P-256 public key (65 bytes)
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
});

const ChallengeSchema = z.object({
  publicKey: z.string().length(130),
});

const VerifyDeviceSchema = z.object({
  publicKey: z.string().length(130),
  challenge: z.string().min(1),
  signature: z.string().min(1),
  deviceId: z.string().min(1),
});

/**
 * Validate P-256 public key format
 */
function validatePublicKey(publicKeyHex: string): boolean {
  try {
    const publicKeyBytes = hexToBytes(publicKeyHex);
    // P-256 public keys are 65 bytes (uncompressed) or 33 bytes (compressed)
    if (publicKeyBytes.length !== 65 && publicKeyBytes.length !== 33) {
      return false;
    }
    // Verify it's a valid point on the curve
    p256.ProjectivePoint.fromHex(publicKeyHex);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify ECDSA P-256 signature
 */
function verifySignature(
  publicKeyHex: string,
  message: string,
  signatureHex: string
): boolean {
  try {
    const messageHash = sha256(message);
    const publicKeyBytes = hexToBytes(publicKeyHex);
    const signatureBytes = hexToBytes(signatureHex);
    
    return p256.verify(signatureBytes, messageHash, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate random challenge for authentication
 */
function generateChallenge(): string {
  return `challenge-${Date.now()}-${crypto.randomBytes(32).toString('hex')}`;
}

// In-memory challenge storage (in production, use Redis)
const challenges = new Map<string, { challenge: string; expiresAt: Date }>();

// Clean up expired challenges every minute
setInterval(() => {
  const now = new Date();
  for (const [key, value] of challenges.entries()) {
    if (value.expiresAt < now) {
      challenges.delete(key);
    }
  }
}, 60000);

export async function deviceTokenRoutes(fastify: FastifyInstance) {

  /**
   * POST /auth/register-device
   * Register a new device with its public key
   */
  fastify.post('/auth/register-device', async (
    request: FastifyRequest<{
      Body: z.infer<typeof RegisterDeviceSchema>;
    }>,
    reply: FastifyReply
  ) => {
    try {
      // Validate request body
      const body = RegisterDeviceSchema.parse(request.body);
      const { publicKey, deviceId, deviceName, osName, osVersion } = body;

      // Validate public key format
      if (!validatePublicKey(publicKey)) {
        return reply.code(400).send({
          error: 'Invalid public key format',
          message: 'Public key must be a valid P-256 public key (130 hex characters)',
        });
      }

      // Check if device already registered
      const existingDevice = await pool.query(
        'SELECT * FROM device_credentials WHERE device_id = $1',
        [deviceId]
      );

      if (existingDevice.rows.length > 0) {
        return reply.code(409).send({
          error: 'Device already registered',
          message: 'This device has already been registered. Use login instead.',
        });
      }

      // Create new user
      const userResult = await pool.query(
        'INSERT INTO users DEFAULT VALUES RETURNING id, created_at'
      );
      const user = userResult.rows[0];

      // Store device credentials
      await pool.query(
        `INSERT INTO device_credentials 
         (user_id, public_key, device_id, device_name, os_name, os_version) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, publicKey, deviceId, deviceName, osName, osVersion]
      );

      // Update last login
      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in sessions table
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await pool.query(
        'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, expiresAt]
      );

      fastify.log.info({
        userId: user.id,
        deviceId,
        action: 'device_registered',
      });

      return {
        user: {
          id: user.id,
          deviceId,
          publicKey,
          createdAt: user.created_at,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          message: error.errors[0].message,
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Registration failed',
        message: 'An error occurred during device registration',
      });
    }
  });

  /**
   * POST /auth/challenge
   * Get a challenge to sign for authentication
   */
  fastify.post('/auth/challenge', async (
    request: FastifyRequest<{
      Body: z.infer<typeof ChallengeSchema>;
    }>,
    reply: FastifyReply
  ) => {
    try {
      // Validate request body
      const body = ChallengeSchema.parse(request.body);
      const { publicKey } = body;

      // Validate public key format
      if (!validatePublicKey(publicKey)) {
        return reply.code(400).send({
          error: 'Invalid public key format',
        });
      }

      // Check if device exists
      const deviceResult = await pool.query(
        'SELECT * FROM device_credentials WHERE public_key = $1',
        [publicKey]
      );

      if (deviceResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Device not found',
          message: 'No device registered with this public key',
        });
      }

      // Generate challenge
      const challenge = generateChallenge();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store challenge (in production, use Redis)
      challenges.set(publicKey, { challenge, expiresAt });

      fastify.log.info({
        publicKey: publicKey.substring(0, 16) + '...',
        action: 'challenge_generated',
      });

      return {
        challenge,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          message: error.errors[0].message,
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Challenge generation failed',
      });
    }
  });

  /**
   * POST /auth/verify-device
   * Verify signature and authenticate user
   */
  fastify.post('/auth/verify-device', async (
    request: FastifyRequest<{
      Body: z.infer<typeof VerifyDeviceSchema>;
    }>,
    reply: FastifyReply
  ) => {
    try {
      // Validate request body
      const body = VerifyDeviceSchema.parse(request.body);
      const { publicKey, challenge, signature, deviceId } = body;

      // Validate public key format
      if (!validatePublicKey(publicKey)) {
        return reply.code(400).send({
          error: 'Invalid public key format',
        });
      }

      // Get stored challenge
      const storedChallenge = challenges.get(publicKey);
      if (!storedChallenge) {
        return reply.code(400).send({
          error: 'Invalid challenge',
          message: 'No challenge found. Request a new challenge.',
        });
      }

      // Check if challenge expired
      if (storedChallenge.expiresAt < new Date()) {
        challenges.delete(publicKey);
        return reply.code(400).send({
          error: 'Challenge expired',
          message: 'Challenge has expired. Request a new challenge.',
        });
      }

      // Verify challenge matches
      if (storedChallenge.challenge !== challenge) {
        return reply.code(400).send({
          error: 'Invalid challenge',
          message: 'Challenge does not match',
        });
      }

      // Verify signature
      const isValidSignature = verifySignature(publicKey, challenge, signature);
      if (!isValidSignature) {
        fastify.log.warn({
          publicKey: publicKey.substring(0, 16) + '...',
          action: 'signature_verification_failed',
        });
        return reply.code(401).send({
          error: 'Invalid signature',
          message: 'Signature verification failed',
        });
      }

      // Delete used challenge
      challenges.delete(publicKey);

      // Get device and user
      const deviceResult = await pool.query(
        'SELECT * FROM device_credentials WHERE public_key = $1 AND device_id = $2',
        [publicKey, deviceId]
      );

      if (deviceResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Device not found',
        });
      }

      const device = deviceResult.rows[0];

      // Update last used timestamp
      await pool.query(
        'UPDATE device_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [device.id]
      );

      // Update user last login
      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [device.user_id]
      );

      // Generate JWT tokens
      const accessToken = generateAccessToken(device.user_id);
      const refreshToken = generateRefreshToken(device.user_id);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await pool.query(
        'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
        [device.user_id, refreshToken, expiresAt]
      );

      fastify.log.info({
        userId: device.user_id,
        deviceId,
        action: 'device_login_success',
      });

      return {
        user: {
          id: device.user_id,
          deviceId: device.device_id,
          publicKey: device.public_key,
          createdAt: device.created_at,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          message: error.errors[0].message,
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Authentication failed',
      });
    }
  });
}
