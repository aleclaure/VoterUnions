/**
 * JWT token generation
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

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
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, deviceId } as TokenPayload,
    REFRESH_SECRET,
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
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
