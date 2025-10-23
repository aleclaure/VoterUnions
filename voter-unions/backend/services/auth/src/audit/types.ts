/**
 * Audit Service Type Definitions
 *
 * Defines types for secure audit logging with encryption
 */

/**
 * Audit action types - all security-relevant events
 */
export type AuditActionType =
  // Authentication events
  | 'login_success'
  | 'login_failed'
  | 'logout'

  // Registration events
  | 'signup_success'
  | 'signup_failed'

  // Password events
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_success'

  // Session events
  | 'token_refreshed'
  | 'session_expired'

  // Security events
  | 'rate_limit_triggered'
  | 'suspicious_activity';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'user'
  | 'session'
  | 'device';

/**
 * Platform types
 */
export type Platform = 'web' | 'ios' | 'android' | 'unknown';

/**
 * Audit event structure
 */
export interface AuditEvent {
  // Required fields
  userId: string;                    // Will be encrypted
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string | null;
  deviceId: string;                  // Will be hashed
  platform: Platform;
  success: boolean;

  // Optional fields
  username?: string;                 // Will be encrypted (if present)
  errorMessage?: string;
  metadata?: Record<string, any>;    // Will be encrypted (if present)
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encrypted: Buffer;
  iv: Buffer;                        // Initialization vector
  tag: Buffer;                       // Authentication tag (GCM mode)
}

/**
 * Query filters for admin dashboard
 */
export interface AuditQueryFilters {
  actionType?: AuditActionType;
  platform?: Platform;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
}

/**
 * Decrypted audit log (for admin queries)
 */
export interface DecryptedAuditLog {
  id: number;
  userId: string;                    // Decrypted
  username: string | null;           // Decrypted
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string | null;
  deviceFingerprint: string;         // SHA-256 hash (not reversible)
  platform: Platform;
  timestampBucket: Date;             // Rounded to nearest hour
  success: boolean;
  errorMessage: string | null;
  metadata: Record<string, any> | null;  // Decrypted
  createdAt: Date;
}

/**
 * Audit statistics (aggregated)
 */
export interface AuditStats {
  actionType: AuditActionType;
  platform: Platform;
  totalCount: number;
  successCount: number;
  failureCount: number;
  uniqueDevices: number;
  firstSeen: Date;
  lastSeen: Date;
}
