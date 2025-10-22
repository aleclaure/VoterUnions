/**
 * Password Hashing Utility
 *
 * Provides secure password hashing and verification using bcrypt.
 * Used for hybrid authentication (device token + username/password).
 */

import bcrypt from 'bcrypt';

// Salt rounds for bcrypt (10 is recommended, provides good security/performance balance)
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 *
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 *
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param password - Password to validate
 * @returns Object with valid flag and error message
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Validate username format
 *
 * Requirements:
 * - 3-30 characters
 * - Only alphanumeric, underscore, and hyphen
 * - Must start with letter or number
 *
 * @param username - Username to validate
 * @returns Object with valid flag and error message
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be at most 30 characters long' };
  }

  if (!/^[a-zA-Z0-9]/.test(username)) {
    return { valid: false, error: 'Username must start with a letter or number' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { valid: true };
}
