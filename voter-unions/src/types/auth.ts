/**
 * Authentication Type Definitions
 *
 * Centralized type definitions for all authentication-related data structures.
 * Ensures type safety across device token authentication and session management.
 */

/**
 * Authenticated user object from authentication service
 * Note: This is different from the Profile type which contains user profile data
 */
export interface AuthUser {
  id: string;
  created_at: string;
  last_login_at?: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * Device keypair stored in secure storage
 */
export interface DeviceKeypair {
  publicKey: string;
  privateKey: string;
}

/**
 * Device information for registration and authentication
 */
export interface DeviceInfo {
  deviceId: string;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
}

/**
 * Session data stored in secure storage
 */
export interface SessionData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  createdAt: number; // Unix timestamp in milliseconds
}

/**
 * Device registration request payload
 */
export interface DeviceRegistrationRequest {
  publicKey: string;
  deviceId: string;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
}

/**
 * Device registration response
 */
export interface DeviceRegistrationResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  message?: string;
}

/**
 * Challenge request payload
 */
export interface ChallengeRequest {
  publicKey: string;
}

/**
 * Challenge response
 */
export interface ChallengeResponse {
  challenge: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Device verification request payload
 */
export interface DeviceVerificationRequest {
  publicKey: string;
  challenge: string;
  signature: string;
  deviceId: string;
}

/**
 * Device authentication response
 */
export interface DeviceAuthenticationResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: AuthUser;
  error?: string;
  message?: string;
}

/**
 * Token refresh request payload
 */
export interface TokenRefreshRequest {
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  message?: string;
}

/**
 * Generic authentication result
 */
export interface AuthResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Device registration result
 */
export type DeviceRegistrationResult = AuthResult<AuthUser>;

/**
 * Device authentication result
 */
export interface DeviceAuthenticationResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  error?: string;
}

/**
 * Logout options
 */
export interface LogoutOptions {
  /**
   * Delete device keypair from secure storage
   * Default: false (keep keypair for future logins)
   */
  deleteKeypair?: boolean;

  /**
   * Revoke refresh token on server
   * Default: true
   */
  revokeToken?: boolean;
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  error?: string;
}
