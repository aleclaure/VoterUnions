/**
 * HYBRID AUTH ENDPOINTS - CORRECTED VERSION
 * 
 * All issues from code review have been fixed.
 * Ready to add to device-token.ts
 * 
 * Instructions:
 * 1. Add import at top of device-token.ts:
 *    import { hashPassword, verifyPassword, validatePasswordStrength, validateUsername } from '../utils/password.js';
 * 
 * 2. Copy these 2 endpoints
 * 3. Paste at END of device-token.ts (before export default function)
 * 4. Deploy
 */

// ============================================================================
// ENDPOINT 1: Set Password (Add username/password to existing device user)
// ============================================================================

app.post('/auth/set-password', async (request, reply) => {
  const { userId, username, password, deviceId } = request.body as {
    userId: string;
    username: string;
    password: string;
    deviceId: string;
  };

  try {
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {  // ✅ FIXED: .valid not .isValid
      return reply.code(400).send({ error: usernameValidation.error });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {  // ✅ FIXED: .valid not .isValid
      return reply.code(400).send({
        error: passwordValidation.error || 'Password does not meet requirements'  // ✅ FIXED: .error not .errors
      });
    }

    // Check if username is already taken
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0 && existingUser.rows[0].user_id !== userId) {
      return reply.code(409).send({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update user with username and password
    await pool.query(
      'UPDATE users SET username = $1, password_hash = $2 WHERE user_id = $3',
      [username, passwordHash, userId]
    );

    return reply.send({
      message: 'Password set successfully',
      username,
    });
  } catch (error) {
    console.error('Set password error:', error);
    return reply.code(500).send({ error: 'Failed to set password' });
  }
});

// ============================================================================
// ENDPOINT 2: Hybrid Login (Verify device token + username/password)
// ============================================================================

app.post('/auth/login-hybrid', async (request, reply) => {
  const {
    username,
    password,
    publicKey,
    challenge,
    signature,
    deviceId,
    platform,
  } = request.body as {
    username: string;
    password: string;
    publicKey: string;
    challenge: string;
    signature: string;
    deviceId: string;
    platform: 'web' | 'ios' | 'android';
  };

  try {
    // Step 1: Get user by username
    const userResult = await pool.query(
      'SELECT user_id, password_hash, public_key, device_id, platform FROM users WHERE username = $1',
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

    // Step 2: Verify device token signature (Layer 1 - Device Auth)
    // ✅ FIXED: Correct parameter order and removed await (function is sync)
    const isValidSignature = verifySignature(
      user.public_key || publicKey,  // 1st param: publicKeyHex
      challenge,                      // 2nd param: message
      signature                       // 3rd param: signatureHex
    );

    if (!isValidSignature) {
      return reply.code(401).send({ error: 'Invalid device signature' });
    }

    // Step 3: Verify password (Layer 2 - Password Auth)
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Both layers verified - generate tokens
    const accessToken = generateAccessToken({
      userId: user.user_id,
      deviceId: user.device_id,
      username: username,
    });

    const refreshToken = generateRefreshToken({
      userId: user.user_id,
      deviceId: user.device_id,
    });

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    // Store session in Redis (with error handling)
    // ✅ FIXED: Added try/catch for Redis failures
    if (redis) {
      try {
        await redis.setex(
          `session:${user.user_id}`,
          30 * 60, // 30 minutes
          JSON.stringify({ deviceId: user.device_id, username })
        );
      } catch (redisError) {
        // Log but don't fail login if Redis is down
        console.warn('Redis session storage failed:', redisError);
      }
    }

    return reply.send({
      user: {
        id: user.user_id,
        username,
        deviceId: user.device_id,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Hybrid login error:', error);
    return reply.code(500).send({ error: 'Login failed' });
  }
});

// ============================================================================
// ✅ ALL FIXES APPLIED - Ready to deploy!
// ============================================================================
