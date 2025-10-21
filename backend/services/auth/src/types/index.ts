/**
 * Type definitions for Auth Service
 */

export interface User {
  id: string;
  created_at: Date;
  last_login_at?: Date;
  email?: string;
  email_verified?: boolean;
}

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports?: string[];
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export interface RegistrationChallenge {
  challenge: string;
  userId: string;
}

export interface AuthenticationChallenge {
  challenge: string;
  userId: string;
  credentialIds: string[];
}

/**
 * Device Token Authentication Types
 */

export interface DeviceCredential {
  id: string;
  user_id: string;
  public_key: string;
  device_id: string;
  device_name: string | null;
  os_name: string | null;
  os_version: string | null;
  last_used_at: Date;
  created_at: Date;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
}

export interface DeviceRegistrationRequest {
  publicKey: string;
  deviceId: string;
  deviceName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
}

export interface DeviceVerificationRequest {
  publicKey: string;
  challenge: string;
  signature: string;
  deviceId: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}
