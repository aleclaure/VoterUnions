/**
 * Device Token Authentication Routes
 *
 * ECDSA P-256 signature-based authentication (Expo Go compatible)
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pool, redis } from '../db/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import crypto from 'crypto';
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { hashPassword, verifyPassword, validatePasswordStrength, validateUsername } from '../utils/password.js';

// Request schemas
const RegisterDeviceSchema = z.object({
  publicKey: z.string().min(1), // Hex-encoded P-256 public key
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
});

const ChallengeSchema = z.object({
  publicKey: z.string().min(1),
});

const VerifyDeviceSchema = z.object({
  publicKey: z.string().min(1),
  challenge: z.string().min(1),
  signature: z.string().min(1),
  deviceId: z.string().min(1),
});

/**
 * Validate P-256 public key format
 */
function validatePublicKey(publicKeyHex: string): boolean {
  try {
    // Verify it's a valid point on the P-256 curve
    // This will throw if the hex string is invalid or not a valid curve point
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
    // Hash the message with SHA-256 (required for ECDSA)
    const messageHash = sha256(message);

    // Verify signature using P-256 curve
    // Both signature and publicKey can be hex strings
    const isValid = p256.verify(signatureHex, messageHash, publicKeyHex);

    return isValid;
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

/**
 * Hash refresh token for secure storage
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Store challenge in Redis with expiry
 */
async function storeChallenge(publicKey: string, challenge: string, expirySeconds: number): Promise<void> {
  const key = `device_challenge:${publicKey}`;
  await redis.setex(key, expirySeconds, challenge);
}

/**
 * Get challenge from Redis
 */
async function getChallenge(publicKey: string): Promise<string | null> {
  const key = `device_challenge:${publicKey}`;
  return await redis.get(key);
}

/**
 * Delete challenge from Redis (after use)
 */
async function deleteChallenge(publicKey: string): Promise<void> {
  const key = `device_challenge:${publicKey}`;
  await redis.del(key);
}

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

      // Store hashed refresh token in sessions table
      const hashedRefreshToken = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await pool.query(
        'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashedRefreshToken, expiresAt]
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
      const expirySeconds = 5 * 60; // 5 minutes

      // Store challenge in Redis with expiry
      await storeChallenge(publicKey, challenge, expirySeconds);

      fastify.log.info({
        publicKey: publicKey.substring(0, 16) + '...',
        action: 'challenge_generated',
      });

      const expiresAt = new Date(Date.now() + expirySeconds * 1000);
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

      // Get stored challenge from Redis
      const storedChallenge = await getChallenge(publicKey);
      if (!storedChallenge) {
        return reply.code(400).send({
          error: 'Invalid challenge',
          message: 'No challenge found or challenge expired. Request a new challenge.',
        });
      }

      // Verify challenge matches
      if (storedChallenge !== challenge) {
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

      // Delete used challenge from Redis
      await deleteChallenge(publicKey);

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

      // Store hashed refresh token
      const hashedRefreshToken = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await pool.query(
        'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
        [device.user_id, hashedRefreshToken, expiresAt]
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

  // ============================================================================
  // HYBRID AUTH ENDPOINTS - Add username/password to device token auth
  // ============================================================================

  /**
   * POST /auth/set-password
   * Set username and password for existing device user (hybrid auth)
   */
  fastify.post('/auth/set-password', async (
    request: FastifyRequest<{
      Body: {
        userId: string;
        username: string;
        password: string;
        deviceId: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId, username, password, deviceId } = request.body;

      // Validate username
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return reply.code(400).send({ error: usernameValidation.error });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return reply.code(400).send({
          error: passwordValidation.error || 'Password does not meet requirements'
        });
      }

      // Check if username is already taken
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0 && existingUser.rows[0].id !== userId) {
        return reply.code(409).send({ error: 'Username already taken' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Update user with username and password
      await pool.query(
        'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3',
        [username, passwordHash, userId]
      );

      fastify.log.info({
        userId,
        deviceId,
        action: 'password_set',
      });

      return {
        message: 'Password set successfully',
        username,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to set password' });
    }
  });

  /**
   * POST /auth/login-hybrid
   * Login with device token AND username/password (two-factor auth)
   */
  fastify.post('/auth/login-hybrid', async (
    request: FastifyRequest<{
      Body: {
        username: string;
        password: string;
        publicKey: string;
        challenge: string;
        signature: string;
        deviceId: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const {
        username,
        password,
        publicKey,
        challenge,
        signature,
        deviceId,
      } = request.body;

      // Step 1: Get user by username
      const userResult = await pool.query(
        'SELECT id, password_hash FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      // Verify user has hybrid auth set up
      if (!user.password_hash) {
        return reply.code(401).send({
          error: 'Hybrid authentication not set up for this user',
        });
      }

      // Step 2: Verify password (Layer 1 - Password Auth)
      const isValidPassword = await verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Step 3: Get device credentials
      const deviceResult = await pool.query(
        'SELECT * FROM device_credentials WHERE user_id = $1 AND device_id = $2',
        [user.id, deviceId]
      );

      if (deviceResult.rows.length === 0) {
        return reply.code(401).send({ error: 'Device not found for this user' });
      }

      const device = deviceResult.rows[0];

      // Get stored challenge
      const storedChallenge = await getChallenge(device.public_key);
      if (!storedChallenge || storedChallenge !== challenge) {
        return reply.code(400).send({
          error: 'Invalid challenge',
          message: 'Challenge does not match or has expired',
        });
      }

      // Step 4: Verify device signature (Layer 2 - Device Auth)
      const isValidSignature = verifySignature(device.public_key, challenge, signature);

      if (!isValidSignature) {
        fastify.log.warn({
          userId: user.id,
          deviceId,
          action: 'hybrid_auth_signature_failed',
        });
        return reply.code(401).send({ error: 'Invalid device signature' });
      }

      // Both layers verified - delete used challenge
      await deleteChallenge(device.public_key);

      // Update timestamps
      await pool.query(
        'UPDATE device_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [device.id]
      );

      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store hashed refresh token
      const hashedRefreshToken = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashedRefreshToken, expiresAt]
      );

      fastify.log.info({
        userId: user.id,
        username,
        deviceId,
        action: 'hybrid_login_success',
      });

      return {
        user: {
          id: user.id,
          username,
          deviceId,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });
}
