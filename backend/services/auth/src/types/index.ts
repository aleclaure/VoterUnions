/**
 * Type definitions for Auth Service
 */

export interface User {
  id: string;
  created_at: Date;
  last_login_at?: Date;
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
