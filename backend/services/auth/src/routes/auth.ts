/**
 * WebAuthn Authentication Routes
 * 
 * POST /auth/login/init - Generate authentication challenge
 * POST /auth/login/verify - Verify credential and issue tokens
 * POST /auth/refresh - Refresh access token
 * POST /auth/logout - Invalidate session
 */

import type { FastifyInstance } from 'fastify';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { pool, redis } from '../db/index.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry, verifyToken } from '../utils/jwt.js';
import { AuthInitSchema, AuthVerifySchema, RefreshTokenSchema } from '../utils/validation.js';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:5000';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/login/init
   * 
   * Generate authentication challenge
   */
  fastify.post('/auth/login/init', async (request, reply) => {
    const body = AuthInitSchema.parse(request.body);
    const { userId } = body;
    
    // Get user's credentials
    const result = await pool.query(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'User not found',
      });
    }
    
    const allowCredentials = result.rows.map(row => ({
      id: row.credential_id,
      type: 'public-key' as const,
    }));
    
    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });
    
    // Store challenge in Redis (5-minute TTL)
    const challengeKey = `auth:${userId}`;
    await redis.setex(challengeKey, 300, options.challenge);
    
    return {
      options,
    };
  });
  
  /**
   * POST /auth/login/verify
   * 
   * Verify authentication and issue tokens
   */
  fastify.post('/auth/login/verify', async (request, reply) => {
    const body = AuthVerifySchema.parse(request.body);
    const { userId, credential } = body;
    
    // Retrieve challenge from Redis
    const challengeKey = `auth:${userId}`;
    const expectedChallenge = await redis.get(challengeKey);
    
    if (!expectedChallenge) {
      return reply.status(400).send({
        error: 'Challenge expired or not found',
      });
    }
    
    try {
      // Get stored credential
      const result = await pool.query(
        `SELECT credential_id, public_key, counter 
         FROM webauthn_credentials 
         WHERE credential_id = $1 AND user_id = $2`,
        [credential.id, userId]
      );
      
      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'Credential not found',
        });
      }
      
      const storedCredential = result.rows[0];
      
      // Verify authentication response
      // Note: credential_id and public_key are stored as base64url strings in database
      // SimpleWebAuthn v11 expects them as base64url strings, so we use them directly
      const verification = await verifyAuthenticationResponse({
        response: credential as AuthenticationResponseJSON,
        expectedChallenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: storedCredential.credential_id,
          publicKey: storedCredential.public_key,
          counter: storedCredential.counter,
        },
      });
      
      if (!verification.verified) {
        return reply.status(400).send({
          error: 'Verification failed',
        });
      }
      
      // Update counter (replay protection)
      await pool.query(
        'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
        [verification.authenticationInfo.newCounter, credential.id]
      );
      
      // Update last login
      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
      
      // Generate tokens
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);
      const expiresAt = getRefreshTokenExpiry();
      
      // Store refresh token
      await pool.query(
        `INSERT INTO sessions (user_id, refresh_token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, refreshToken, expiresAt]
      );
      
      // Delete challenge from Redis
      await redis.del(challengeKey);
      
      return {
        userId,
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      console.error('Authentication verification error:', error);
      return reply.status(500).send({
        error: 'Authentication failed',
      });
    }
  });
  
  /**
   * POST /auth/refresh
   * 
   * Refresh access token using refresh token
   */
  fastify.post('/auth/refresh', async (request, reply) => {
    const body = RefreshTokenSchema.parse(request.body);
    const { refreshToken } = body;
    
    try {
      // Verify refresh token
      const payload = verifyToken(refreshToken);
      
      // Check if refresh token exists in database
      const result = await pool.query(
        `SELECT user_id, expires_at FROM sessions 
         WHERE refresh_token = $1 AND user_id = $2`,
        [refreshToken, payload.userId]
      );
      
      if (result.rows.length === 0) {
        return reply.status(401).send({
          error: 'Invalid refresh token',
        });
      }
      
      const session = result.rows[0];
      
      // Check if expired
      if (new Date(session.expires_at) < new Date()) {
        // Delete expired session
        await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
        return reply.status(401).send({
          error: 'Refresh token expired',
        });
      }
      
      // Generate new access token
      const accessToken = generateAccessToken(payload.userId);
      
      return {
        accessToken,
        expiresIn: 900,
      };
    } catch (error) {
      return reply.status(401).send({
        error: 'Invalid refresh token',
      });
    }
  });
  
  /**
   * POST /auth/logout
   * 
   * Invalidate refresh token
   */
  fastify.post('/auth/logout', async (request) => {
    const body = RefreshTokenSchema.parse(request.body);
    const { refreshToken } = body;
    
    // Delete session
    await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    
    return {
      success: true,
    };
  });
}
