/**
 * Authentication Routes
 *
 * Platform-Aware Device Token Authentication
 * - Separate paths for web vs native
 * - Graceful error handling (no crashes)
 * - Challenge-response flow
 */

import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { generateChallenge, verifySignature } from '../crypto';
import { generateTokens } from '../tokens';
import { ulid } from 'ulid';
import { hashPassword, verifyPassword, validatePasswordStrength, validateUsername } from '../utils/password';
import { auditService } from '../audit/AuditService';

export async function registerRoutes(app: FastifyInstance) {
  /**
   * POST /auth/challenge
   *
   * Generate authentication challenge
   * Platform: Both web and native
   */
  app.post('/auth/challenge', async (request, reply) => {
    try {
      const { deviceId, platform } = request.body as {
        deviceId?: string;
        platform?: 'web' | 'ios' | 'android';
      };

      const challenge = generateChallenge();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store challenge
      await db.query(
        `INSERT INTO auth_challenges (challenge, device_id, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (challenge) DO UPDATE SET expires_at = $3`,
        [challenge, deviceId || null, expiresAt]
      );

      app.log.info({
        action: 'challenge_generated',
        platform,
        deviceId: deviceId?.substring(0, 8),
      });

      return {
        challenge,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      app.log.error({ error }, 'Failed to generate challenge');
      return reply.code(500).send({
        error: 'Failed to generate challenge',
        message: 'Please try again',
      });
    }
  });

  /**
   * POST /auth/register-device
   *
   * Register new device with public key
   * Platform: Both web and native (auto-detected)
   */
  app.post('/auth/register-device', async (request, reply) => {
    try {
      const {
        publicKey,
        deviceId,
        platform,
        deviceName,
        deviceModel,
        osVersion,
      } = request.body as {
        publicKey: string;
        deviceId: string;
        platform: 'web' | 'ios' | 'android';
        deviceName?: string;
        deviceModel?: string;
        osVersion?: string;
      };

      // Validate required fields
      if (!publicKey || !deviceId || !platform) {
        return reply.code(400).send({
          error: 'Missing required fields',
          required: ['publicKey', 'deviceId', 'platform'],
        });
      }

      // Validate platform
      if (!['web', 'ios', 'android'].includes(platform)) {
        return reply.code(400).send({
          error: 'Invalid platform',
          validPlatforms: ['web', 'ios', 'android'],
        });
      }

      // Check if device already registered
      const { rows: existingDevices } = await db.query(
        'SELECT user_id FROM users WHERE device_id = $1',
        [deviceId]
      );

      if (existingDevices.length > 0) {
        app.log.warn({
          action: 'registration_failed',
          reason: 'device_already_registered',
          deviceId: deviceId.substring(0, 8),
        });

        // Log failed registration - duplicate device
        await auditService.logEvent({
          userId: 'unknown',
          actionType: 'signup_failed',
          entityType: 'user',
          entityId: null,
          deviceId,
          platform,
          success: false,
          errorMessage: 'Device already registered',
          metadata: {
            failureReason: 'device_already_registered',
          },
        });

        return reply.code(409).send({
          error: 'Device already registered',
          message: 'This device is already registered. Use login instead.',
        });
      }

      // Generate user ID
      const userId = ulid();

      // Create display name
      const displayName = deviceName || `${platform}_user_${userId.substring(0, 8)}`;

      // Insert user
      await db.query(
        `INSERT INTO users (user_id, device_id, public_key, platform, display_name, last_login)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, deviceId, publicKey, platform, displayName]
      );

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(userId, deviceId);

      // Store session
      const sessionId = ulid();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.query(
        `INSERT INTO device_sessions (session_id, user_id, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, userId, accessToken, refreshToken, expiresAt]
      );

      app.log.info({
        action: 'device_registered',
        platform,
        userId: userId.substring(0, 8),
        deviceId: deviceId.substring(0, 8),
      });

      // Log successful registration to audit system
      await auditService.logEvent({
        userId,
        username: displayName,
        actionType: 'signup_success',
        entityType: 'user',
        entityId: userId,
        deviceId,
        platform,
        success: true,
        metadata: {
          registrationMethod: 'device-only',
        },
      });

      return {
        success: true,
        user: {
          userId,
          displayName,
          platform,
        },
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      app.log.error({ error }, 'Device registration failed');

      // Log failed registration to audit system
      const body = request.body as any;
      await auditService.logEvent({
        userId: 'unknown',
        actionType: 'signup_failed',
        entityType: 'user',
        entityId: null,
        deviceId: body.deviceId || 'unknown',
        platform: body.platform || 'web',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Registration failed',
      });

      return reply.code(500).send({
        error: 'Registration failed',
        message: 'An error occurred during registration. Please try again.',
      });
    }
  });

  /**
   * POST /auth/verify-device
   *
   * Authenticate device using challenge-response
   * Platform: Both web and native (auto-detected from signature)
   */
  app.post('/auth/verify-device', async (request, reply) => {
    try {
      const {
        challenge,
        signature,
        deviceId,
        publicKey,
      } = request.body as {
        challenge: string;
        signature: string;
        deviceId: string;
        publicKey: string;
      };

      // Validate required fields
      if (!challenge || !signature || !deviceId || !publicKey) {
        return reply.code(400).send({
          error: 'Missing required fields',
          required: ['challenge', 'signature', 'deviceId', 'publicKey'],
        });
      }

      // Verify challenge exists and not expired
      const { rows: challenges } = await db.query(
        'SELECT * FROM auth_challenges WHERE challenge = $1 AND expires_at > NOW()',
        [challenge]
      );

      if (challenges.length === 0) {
        app.log.warn({
          action: 'verification_failed',
          reason: 'invalid_or_expired_challenge',
        });

        // Log failed authentication - expired challenge
        await auditService.logEvent({
          userId: 'unknown',
          actionType: 'login_failed',
          entityType: 'user',
          entityId: null,
          deviceId,
          platform: 'unknown',
          success: false,
          errorMessage: 'Challenge expired or not found',
          metadata: {
            authMethod: 'device-signature',
            failureReason: 'expired_challenge',
          },
        });

        return reply.code(401).send({
          error: 'Invalid or expired challenge',
          message: 'Please request a new challenge',
        });
      }

      // Find user by device ID first to get platform info
      const { rows: users } = await db.query(
        'SELECT * FROM users WHERE device_id = $1',
        [deviceId]
      );

      if (users.length === 0) {
        app.log.warn({
          action: 'verification_failed',
          reason: 'device_not_found',
          deviceId: deviceId.substring(0, 8),
        });

        return reply.code(404).send({
          error: 'Device not registered',
          message: 'Please register this device first',
        });
      }

      const user = users[0];

      // Verify signature with platform information
      const isValidSignature = await verifySignature(
        challenge,
        signature,
        publicKey,
        user.platform // Pass platform to enable platform-specific verification
      );

      if (!isValidSignature) {
        app.log.warn({
          action: 'verification_failed',
          reason: 'invalid_signature',
          platform: user.platform,
          deviceId: deviceId.substring(0, 8),
        });

        // Log failed authentication - invalid signature
        await auditService.logEvent({
          userId: user.user_id,
          username: user.username || user.display_name || undefined,
          actionType: 'login_failed',
          entityType: 'user',
          entityId: user.user_id,
          deviceId,
          platform: user.platform,
          success: false,
          errorMessage: 'Invalid signature',
          metadata: {
            authMethod: 'device-signature',
            failureReason: 'invalid_signature',
          },
        });

        return reply.code(401).send({
          error: 'Invalid signature',
          message: 'Authentication failed. Signature verification failed.',
        });
      }

      // Verify public key matches
      if (user.public_key !== publicKey) {
        app.log.warn({
          action: 'verification_failed',
          reason: 'public_key_mismatch',
          deviceId: deviceId.substring(0, 8),
        });

        // Log failed authentication - public key mismatch
        await auditService.logEvent({
          userId: user.user_id,
          username: user.username || user.display_name || undefined,
          actionType: 'login_failed',
          entityType: 'user',
          entityId: user.user_id,
          deviceId,
          platform: user.platform,
          success: false,
          errorMessage: 'Device public key mismatch',
          metadata: {
            authMethod: 'device-signature',
            failureReason: 'public_key_mismatch',
          },
        });

        return reply.code(401).send({
          error: 'Public key mismatch',
          message: 'The public key does not match the registered device',
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
      );

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user.user_id, deviceId);

      // Store session
      const sessionId = ulid();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.query(
        `INSERT INTO device_sessions (session_id, user_id, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, user.user_id, accessToken, refreshToken, expiresAt]
      );

      // Delete used challenge
      await db.query('DELETE FROM auth_challenges WHERE challenge = $1', [challenge]);

      app.log.info({
        action: 'device_authenticated',
        platform: user.platform,
        userId: user.user_id.substring(0, 8),
        deviceId: deviceId.substring(0, 8),
      });

      // Log successful device authentication
      await auditService.logEvent({
        userId: user.user_id,
        username: user.username || user.display_name || undefined,
        actionType: 'login_success',
        entityType: 'user',
        entityId: user.user_id,
        deviceId,
        platform: user.platform,
        success: true,
        metadata: {
          authMethod: 'device-signature',
        },
      });

      return {
        success: true,
        user: {
          userId: user.user_id,
          displayName: user.display_name,
          platform: user.platform,
        },
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      app.log.error({ error }, 'Device verification failed');
      return reply.code(500).send({
        error: 'Verification failed',
        message: 'An error occurred during authentication. Please try again.',
      });
    }
  });

  /**
   * POST /auth/refresh
   *
   * Refresh access token using refresh token
   * Platform: Both web and native
   */
  app.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        return reply.code(400).send({
          error: 'Missing refresh token',
        });
      }

      // Find session by refresh token
      const { rows: sessions } = await db.query(
        'SELECT * FROM device_sessions WHERE refresh_token = $1',
        [refreshToken]
      );

      if (sessions.length === 0) {
        return reply.code(401).send({
          error: 'Invalid refresh token',
        });
      }

      const session = sessions[0];

      // Get user
      const { rows: users } = await db.query(
        'SELECT * FROM users WHERE user_id = $1',
        [session.user_id]
      );

      if (users.length === 0) {
        return reply.code(401).send({
          error: 'User not found',
        });
      }

      const user = users[0];

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
        user.user_id,
        user.device_id
      );

      // Update session
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.query(
        `UPDATE device_sessions
         SET access_token = $1, refresh_token = $2, expires_at = $3
         WHERE session_id = $4`,
        [accessToken, newRefreshToken, expiresAt, session.session_id]
      );

      app.log.info({
        action: 'token_refreshed',
        userId: user.user_id.substring(0, 8),
      });

      // Log successful token refresh
      await auditService.logEvent({
        userId: user.user_id,
        username: user.username || user.display_name || undefined,
        actionType: 'token_refreshed',
        entityType: 'session',
        entityId: session.session_id,
        deviceId: user.device_id,
        platform: user.platform,
        success: true,
      });

      return {
        accessToken,
        newRefreshToken,
        expiresIn: 900,
      };
    } catch (error) {
      app.log.error({ error }, 'Token refresh failed');
      return reply.code(500).send({
        error: 'Refresh failed',
        message: 'An error occurred while refreshing token',
      });
    }
  });

  /**
   * POST /auth/login-hybrid
   *
   * Hybrid authentication: Device token + Username/Password
   * Phase 1: Two-factor authentication combining device verification and password
   *
   * Flow:
   * 1. Verify device token (challenge-response signature)
   * 2. Verify username/password
   * 3. Return tokens only if BOTH are valid
   *
   * Platform: Both web and native
   */
  app.post('/auth/login-hybrid', async (request, reply) => {
    try {
      const {
        username,
        password,
        challenge,
        signature,
        deviceId,
        publicKey,
      } = request.body as {
        username: string;
        password: string;
        challenge: string;
        signature: string;
        deviceId: string;
        publicKey: string;
      };

      // Validate required fields
      if (!username || !password || !challenge || !signature || !deviceId || !publicKey) {
        return reply.code(400).send({
          error: 'Missing required fields',
          required: ['username', 'password', 'challenge', 'signature', 'deviceId', 'publicKey'],
        });
      }

      // Verify challenge exists and not expired
      const { rows: challenges } = await db.query(
        'SELECT * FROM auth_challenges WHERE challenge = $1 AND expires_at > NOW()',
        [challenge]
      );

      if (challenges.length === 0) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'invalid_or_expired_challenge',
          username,
        });

        return reply.code(401).send({
          error: 'Invalid or expired challenge',
          message: 'Please request a new challenge',
        });
      }

      // Find user by username
      const { rows: users } = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (users.length === 0) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'user_not_found',
          username,
        });

        // Log failed hybrid login - user not found
        await auditService.logEvent({
          userId: 'unknown',
          username: username,
          actionType: 'login_failed',
          entityType: 'user',
          entityId: null,
          deviceId,
          platform: 'unknown',
          success: false,
          errorMessage: 'User not found',
          metadata: {
            authMethod: 'hybrid',
            failureReason: 'user_not_found',
          },
        });

        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        });
      }

      const user = users[0];

      // Verify password_hash exists (user has set up hybrid auth)
      if (!user.password_hash) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'password_not_set',
          username,
        });

        // Log failed hybrid login - password not set
        await auditService.logEvent({
          userId: user.user_id,
          username: username,
          actionType: 'login_failed',
          entityType: 'user',
          entityId: user.user_id,
          deviceId,
          platform: user.platform,
          success: false,
          errorMessage: 'Password not set for this account',
          metadata: {
            authMethod: 'hybrid',
            failureReason: 'password_not_set',
          },
        });

        return reply.code(401).send({
          error: 'Hybrid authentication not configured',
          message: 'This account has not set up username/password authentication',
        });
      }

      // Layer 1: Verify device token signature
      const isValidSignature = await verifySignature(
        challenge,
        signature,
        publicKey,
        user.platform
      );

      if (!isValidSignature) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'invalid_signature',
          username,
          deviceId: deviceId.substring(0, 8),
        });

        return reply.code(401).send({
          error: 'Invalid device signature',
          message: 'Device authentication failed',
        });
      }

      // Verify public key matches
      if (user.public_key !== publicKey) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'public_key_mismatch',
          username,
          deviceId: deviceId.substring(0, 8),
        });

        return reply.code(401).send({
          error: 'Public key mismatch',
          message: 'Device verification failed',
        });
      }

      // Verify device ID matches
      if (user.device_id !== deviceId) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'device_id_mismatch',
          username,
          deviceId: deviceId.substring(0, 8),
        });

        // Log failed hybrid login - device mismatch
        await auditService.logEvent({
          userId: user.user_id,
          username: username,
          actionType: 'login_failed',
          entityType: 'user',
          entityId: user.user_id,
          deviceId,
          platform: user.platform,
          success: false,
          errorMessage: 'Device mismatch',
          metadata: {
            authMethod: 'hybrid',
            failureReason: 'device_mismatch',
          },
        });

        return reply.code(401).send({
          error: 'Device mismatch',
          message: 'This account is registered to a different device',
        });
      }

      // Layer 2: Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        app.log.warn({
          action: 'hybrid_login_failed',
          reason: 'invalid_password',
          username,
        });

        // Log failed hybrid login - invalid password
        await auditService.logEvent({
          userId: user.user_id,
          username: username,
          actionType: 'login_failed',
          entityType: 'user',
          entityId: user.user_id,
          deviceId,
          platform: user.platform,
          success: false,
          errorMessage: 'Invalid password',
          metadata: {
            authMethod: 'hybrid',
            failureReason: 'invalid_password',
          },
        });

        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        });
      }

      // Both layers verified successfully!
      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
      );

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user.user_id, deviceId);

      // Store session
      const sessionId = ulid();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.query(
        `INSERT INTO device_sessions (session_id, user_id, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, user.user_id, accessToken, refreshToken, expiresAt]
      );

      // Delete used challenge
      await db.query('DELETE FROM auth_challenges WHERE challenge = $1', [challenge]);

      app.log.info({
        action: 'hybrid_login_success',
        username,
        userId: user.user_id.substring(0, 8),
        deviceId: deviceId.substring(0, 8),
      });

      // Log successful hybrid login
      await auditService.logEvent({
        userId: user.user_id,
        username: user.username || user.display_name || undefined,
        actionType: 'login_success',
        entityType: 'user',
        entityId: user.user_id,
        deviceId,
        platform: user.platform,
        success: true,
        metadata: {
          authMethod: 'hybrid',
          usedPassword: true,
          usedDeviceSignature: true,
        },
      });

      return {
        success: true,
        user: {
          userId: user.user_id,
          username: user.username,
          displayName: user.display_name,
          platform: user.platform,
        },
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      app.log.error({ error }, 'Hybrid login failed');
      return reply.code(500).send({
        error: 'Login failed',
        message: 'An error occurred during authentication. Please try again.',
      });
    }
  });

  /**
   * POST /auth/set-password
   *
   * Set username and password for existing device-only user
   * Phase 1: Enable hybrid authentication for existing users
   *
   * Platform: Both web and native
   */
  app.post('/auth/set-password', async (request, reply) => {
    try {
      const {
        userId,
        username,
        password,
        deviceId,
      } = request.body as {
        userId: string;
        username: string;
        password: string;
        deviceId: string;
      };

      // Validate required fields
      if (!userId || !username || !password || !deviceId) {
        return reply.code(400).send({
          error: 'Missing required fields',
          required: ['userId', 'username', 'password', 'deviceId'],
        });
      }

      // Validate username format
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return reply.code(400).send({
          error: 'Invalid username',
          message: usernameValidation.error,
        });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return reply.code(400).send({
          error: 'Weak password',
          message: passwordValidation.error,
        });
      }

      // Check if user exists and owns this device
      const { rows: users } = await db.query(
        'SELECT * FROM users WHERE user_id = $1 AND device_id = $2',
        [userId, deviceId]
      );

      if (users.length === 0) {
        app.log.warn({
          action: 'set_password_failed',
          reason: 'user_not_found_or_device_mismatch',
          userId: userId.substring(0, 8),
        });

        return reply.code(404).send({
          error: 'User not found',
          message: 'User not found or device mismatch',
        });
      }

      const user = users[0];

      // Check if username already taken
      const { rows: existingUsers } = await db.query(
        'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
        [username, userId]
      );

      if (existingUsers.length > 0) {
        app.log.warn({
          action: 'set_password_failed',
          reason: 'username_taken',
          username,
        });

        return reply.code(409).send({
          error: 'Username taken',
          message: 'This username is already in use',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Update user with username and password
      await db.query(
        'UPDATE users SET username = $1, password_hash = $2 WHERE user_id = $3',
        [username, passwordHash, userId]
      );

      app.log.info({
        action: 'password_set',
        username,
        userId: userId.substring(0, 8),
      });

      // Log successful password change
      await auditService.logEvent({
        userId: user.user_id,
        username: username,
        actionType: 'password_changed',
        entityType: 'user',
        entityId: user.user_id,
        deviceId,
        platform: user.platform,
        success: true,
        metadata: {
          method: 'authenticated_set_password',
          hadPreviousPassword: !!user.password_hash,
        },
      });

      return {
        success: true,
        message: 'Username and password set successfully',
        user: {
          userId: user.user_id,
          username,
          displayName: user.display_name,
        },
      };
    } catch (error) {
      app.log.error({ error }, 'Set password failed');

      // Log failed password change
      const body = request.body as any;
      await auditService.logEvent({
        userId: body.userId || 'unknown',
        username: body.username,
        actionType: 'password_changed',
        entityType: 'user',
        entityId: body.userId || null,
        deviceId: body.deviceId || 'unknown',
        platform: 'unknown',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Password change failed',
      });

      return reply.code(500).send({
        error: 'Failed to set password',
        message: 'An error occurred. Please try again.',
      });
    }
  });

  app.log.info('Auth routes registered successfully');
}
