/**
 * WebAuthn Registration Routes
 * 
 * POST /auth/register/init - Generate registration challenge
 * POST /auth/register/verify - Verify credential and create user
 */

import type { FastifyInstance } from 'fastify';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { pool, redis } from '../db/index.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { RegisterInitSchema, RegisterVerifySchema } from '../utils/validation.js';
import { randomUUID } from 'crypto';

const RP_NAME = process.env.RP_NAME || 'United Unions';
const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:5000';

export async function registerRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/register/init
   * 
   * Generate a WebAuthn registration challenge
   */
  fastify.post('/auth/register/init', async (request) => {
    RegisterInitSchema.parse(request.body);
    
    // Generate new user ID
    const userId = randomUUID();
    
    // Generate registration options
    const userIdBuffer = Buffer.from(userId.replace(/-/g, ''), 'hex');
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userIdBuffer,
      userName: userId,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
    
    // Store challenge in Redis (5-minute TTL)
    const challengeKey = `reg:${userId}`;
    await redis.setex(challengeKey, 300, options.challenge);
    
    return {
      userId,
      options,
    };
  });
  
  /**
   * POST /auth/register/verify
   * 
   * Verify WebAuthn credential and create user account
   */
  fastify.post('/auth/register/verify', async (request, reply) => {
    const body = RegisterVerifySchema.parse(request.body);
    const { userId, credential } = body;
    
    // Retrieve challenge from Redis
    const challengeKey = `reg:${userId}`;
    const expectedChallenge = await redis.get(challengeKey);
    
    if (!expectedChallenge) {
      return reply.status(400).send({
        error: 'Challenge expired or not found',
      });
    }
    
    try {
      // Verify the registration response
      const verification = await verifyRegistrationResponse({
        response: credential as RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
      });
      
      if (!verification.verified || !verification.registrationInfo) {
        return reply.status(400).send({
          error: 'Verification failed',
        });
      }
      
      const { credential: verifiedCredential } = verification.registrationInfo;
      
      // CRITICAL: In SimpleWebAuthn v11, credential.id is a Uint8Array
      // We need to store it as base64url string for database compatibility
      // and to match the credential.id sent by the browser during authentication
      const credentialID = Buffer.from(verifiedCredential.id).toString('base64url');
      const credentialPublicKey = Buffer.from(verifiedCredential.publicKey).toString('base64url');
      const counter = verifiedCredential.counter;
      
      // Start database transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Create user
        await client.query(
          'INSERT INTO users (id) VALUES ($1)',
          [userId]
        );
        
        // Store credential (credential_id is stored as base64url string)
        await client.query(
          `INSERT INTO webauthn_credentials 
           (user_id, credential_id, public_key, counter) 
           VALUES ($1, $2, $3, $4)`,
          [
            userId,
            credentialID,
            credentialPublicKey,
            counter,
          ]
        );
        
        // Generate tokens
        const accessToken = generateAccessToken(userId);
        const refreshToken = generateRefreshToken(userId);
        const expiresAt = getRefreshTokenExpiry();
        
        // Store refresh token
        await client.query(
          `INSERT INTO sessions (user_id, refresh_token, expires_at)
           VALUES ($1, $2, $3)`,
          [userId, refreshToken, expiresAt]
        );
        
        await client.query('COMMIT');
        
        // Delete challenge from Redis
        await redis.del(challengeKey);
        
        return {
          userId,
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes in seconds
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Registration verification error:', error);
      return reply.status(500).send({
        error: 'Registration failed',
      });
    }
  });
}
