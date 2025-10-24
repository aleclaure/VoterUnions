/**
 * JWT token generation
 */

import jwt from 'jsonwebtoken';

// Load secrets from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Strict validation in production
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || !REFRESH_SECRET) {
    throw new Error(
      'CRITICAL SECURITY: JWT_SECRET and REFRESH_SECRET must be set in production. ' +
      'Generate secure secrets with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (JWT_SECRET.length < 32 || REFRESH_SECRET.length < 32) {
    throw new Error(
      'CRITICAL SECURITY: JWT secrets must be at least 32 characters in production'
    );
  }

  // Check for default development secrets in production
  if (JWT_SECRET.includes('dev-secret') || REFRESH_SECRET.includes('dev-secret')) {
    throw new Error(
      'CRITICAL SECURITY: Development secrets detected in production. ' +
      'You must use cryptographically secure random secrets.'
    );
  }
}

// Warnings in development
if (process.env.NODE_ENV !== 'production') {
  if (!JWT_SECRET || !REFRESH_SECRET) {
    console.warn('⚠️  WARNING: Using default JWT secrets - NOT SAFE FOR PRODUCTION');
    console.warn('⚠️  Set JWT_SECRET and REFRESH_SECRET environment variables');
  }
}

// Final secret values (with development fallbacks)
const finalJwtSecret = JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? '' // Will never be used (error thrown above)
    : 'dev-secret-only-for-local-development-change-in-production'
);

const finalRefreshSecret = REFRESH_SECRET || (
  process.env.NODE_ENV === 'production'
    ? ''
    : 'dev-refresh-secret-only-for-local-development-change-in-production'
);

export interface TokenPayload {
  userId: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access and refresh tokens
 *
 * @param userId User ID
 * @param deviceId Device ID
 * @returns Access token (15 min) and refresh token (30 days)
 */
export async function generateTokens(userId: string, deviceId: string) {
  const accessToken = jwt.sign(
    { userId, deviceId } as TokenPayload,
    finalJwtSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, deviceId } as TokenPayload,
    finalRefreshSecret,
    { expiresIn: '30d' }
  );

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, finalJwtSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, finalRefreshSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
}
