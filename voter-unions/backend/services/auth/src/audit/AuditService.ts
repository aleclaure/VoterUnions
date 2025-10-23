/**
 * Audit Service - Secure Backend Audit Logging
 *
 * Features:
 * - AES-256-GCM encryption for sensitive data
 * - SHA-256 hashing for device IDs
 * - Time bucketing (hourly precision)
 * - Automatic 30-day retention
 * - Silent failure (doesn't block user operations)
 */

import crypto from 'crypto';
import { db } from '../db';
import type {
  AuditEvent,
  AuditQueryFilters,
  DecryptedAuditLog,
  AuditStats,
  EncryptedData,
} from './types';

export class AuditService {
  private encryptionKey!: Buffer; // ✅ Definite assignment assertion (initialized in constructor)
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyVersion = 1; // For key rotation support

  constructor() {
    this.initializeEncryptionKey();
  }

  /**
   * Initialize encryption key from environment variable
   */
  private initializeEncryptionKey(): void {
    const key = process.env.AUDIT_ENCRYPTION_KEY;

    if (!key) {
      throw new Error(
        'AUDIT_ENCRYPTION_KEY environment variable is required. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    if (key.length !== 64) {
      throw new Error(
        `AUDIT_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ` +
        `Current length: ${key.length}`
      );
    }

    // Validate hex format
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('AUDIT_ENCRYPTION_KEY must contain only hex characters (0-9, a-f)');
    }

    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   *
   * @param plaintext - String to encrypt
   * @returns Encrypted data with IV and authentication tag
   */
  private encrypt(plaintext: string): EncryptedData {
    // Generate random initialization vector (IV)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get authentication tag (for GCM mode)
    const tag = cipher.getAuthTag();

    return { encrypted, iv, tag };
  }

  /**
   * Decrypt data (for admin queries)
   *
   * @param encrypted - Encrypted buffer
   * @param iv - Initialization vector
   * @param tag - Authentication tag
   * @returns Decrypted plaintext
   */
  private decrypt(encrypted: Buffer, iv: Buffer, tag: Buffer): string {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

      // Set authentication tag
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Decryption failed (tampered data or wrong key)
      console.error('[AuditService] Decryption failed:', error);
      return '[DECRYPTION_FAILED]';
    }
  }

  /**
   * Hash device ID for privacy (one-way hash)
   *
   * @param deviceId - Device identifier
   * @returns SHA-256 hash (64 hex characters)
   */
  private hashDevice(deviceId: string): string {
    return crypto
      .createHash('sha256')
      .update(deviceId)
      .digest('hex');
  }

  /**
   * Bucket timestamp to nearest hour (reduces precision for privacy)
   *
   * @param timestamp - Original timestamp
   * @returns Timestamp rounded to nearest hour
   */
  private bucketTime(timestamp: Date): Date {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0); // Round to hour
    return date;
  }

  /**
   * Log audit event securely
   *
   * @param event - Audit event to log
   * @returns Promise that resolves when event is logged (or fails silently)
   */
  async logEvent(event: AuditEvent): Promise<void> {
    // Use setImmediate to avoid blocking user operations
    setImmediate(async () => {
      try {
        // 1. Encrypt sensitive fields
        const userIdEncrypted = this.encrypt(event.userId);

        const usernameEncrypted = event.username
          ? this.encrypt(event.username)
          : null;

        const metadataEncrypted = event.metadata
          ? this.encrypt(JSON.stringify(event.metadata))
          : null;

        // 2. Hash device ID (one-way)
        const deviceFingerprint = this.hashDevice(event.deviceId);

        // 3. Bucket timestamp
        const timestampBucket = this.bucketTime(new Date());

        // 4. Insert into database
        await db.query(
          `INSERT INTO secure_audit_logs (
            user_id_encrypted, user_id_iv, user_id_tag,
            username_encrypted, username_iv, username_tag,
            action_type, entity_type, entity_id,
            device_fingerprint, platform, timestamp_bucket,
            success, error_message,
            metadata_encrypted, metadata_iv, metadata_tag
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            // User ID (encrypted)
            userIdEncrypted.encrypted,
            userIdEncrypted.iv,
            userIdEncrypted.tag,

            // Username (encrypted, nullable)
            usernameEncrypted?.encrypted || null,
            usernameEncrypted?.iv || null,
            usernameEncrypted?.tag || null,

            // Action details (not encrypted - needed for queries)
            event.actionType,
            event.entityType,
            event.entityId,

            // Privacy-preserving identifiers
            deviceFingerprint,
            event.platform,
            timestampBucket,

            // Result
            event.success,
            event.errorMessage || null,

            // Metadata (encrypted, nullable)
            metadataEncrypted?.encrypted || null,
            metadataEncrypted?.iv || null,
            metadataEncrypted?.tag || null,
          ]
        );
      } catch (error) {
        // CRITICAL: Silent fail - audit logging must NEVER block user operations
        console.error('[AuditService] Failed to log event:', {
          actionType: event.actionType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Don't throw - silent fail
      }
    });
  }

  /**
   * Query audit logs (admin only - requires decryption)
   *
   * @param filters - Query filters
   * @returns Decrypted audit logs
   */
  async queryLogs(filters: AuditQueryFilters): Promise<DecryptedAuditLog[]> {
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.actionType) {
        conditions.push(`action_type = $${paramIndex++}`);
        params.push(filters.actionType);
      }

      if (filters.platform) {
        conditions.push(`platform = $${paramIndex++}`);
        params.push(filters.platform);
      }

      if (filters.startDate) {
        conditions.push(`timestamp_bucket >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`timestamp_bucket <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      if (filters.success !== undefined) {
        conditions.push(`success = $${paramIndex++}`);
        params.push(filters.success);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const limit = filters.limit || 1000;

      // Query database
      const result = await db.query(
        `SELECT *
         FROM secure_audit_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex}`,
        [...params, limit]
      );

      // Decrypt results
      return result.rows.map((row) => {
        // Decrypt metadata with error handling
        let metadata = null;
        if (row.metadata_encrypted) {
          const decryptedMetadata = this.decrypt(
            row.metadata_encrypted,
            row.metadata_iv,
            row.metadata_tag
          );
          if (decryptedMetadata !== '[DECRYPTION_FAILED]') {
            try {
              metadata = JSON.parse(decryptedMetadata);
            } catch (error) {
              console.error('[AuditService] Failed to parse metadata JSON:', error);
              metadata = null;
            }
          }
        }

        return {
          id: row.id,
          userId: this.decrypt(row.user_id_encrypted, row.user_id_iv, row.user_id_tag),
          username: row.username_encrypted
            ? this.decrypt(row.username_encrypted, row.username_iv, row.username_tag)
            : null,
          actionType: row.action_type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          deviceFingerprint: row.device_fingerprint,
          platform: row.platform,
          timestampBucket: row.timestamp_bucket,
          success: row.success,
          errorMessage: row.error_message,
          metadata,
          createdAt: row.created_at,
        };
      });
    } catch (error) {
      console.error('[AuditService] Query failed:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics (aggregated - no decryption needed)
   *
   * @param days - Number of days to include (default: 7)
   * @returns Audit statistics
   */
  async getStats(days: number = 7): Promise<AuditStats[]> {
    try {
      const result = await db.query(
        `SELECT
          action_type,
          platform,
          COUNT(*) as total_count,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failure_count,
          COUNT(DISTINCT device_fingerprint) as unique_devices,
          MIN(timestamp_bucket) as first_seen,
          MAX(timestamp_bucket) as last_seen
         FROM secure_audit_logs
         WHERE timestamp_bucket >= NOW() - INTERVAL '$1 days'
         GROUP BY action_type, platform
         ORDER BY total_count DESC`,
        [days]
      );

      return result.rows.map((row) => ({
        actionType: row.action_type,
        platform: row.platform,
        totalCount: parseInt(row.total_count, 10),
        successCount: parseInt(row.success_count, 10),
        failureCount: parseInt(row.failure_count, 10),
        uniqueDevices: parseInt(row.unique_devices, 10),
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
      }));
    } catch (error) {
      console.error('[AuditService] Stats query failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup old audit logs (30+ days)
   * Should be called daily via cron job
   *
   * @returns Number of logs deleted
   */
  async cleanup(): Promise<number> {
    try {
      const result = await db.query(
        `DELETE FROM secure_audit_logs
         WHERE created_at < NOW() - INTERVAL '30 days'`
      );

      const deletedCount = result.rowCount || 0;

      console.log(`[AuditService] Cleaned up ${deletedCount} old audit logs`);

      return deletedCount;
    } catch (error) {
      console.error('[AuditService] Cleanup failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const auditService = new AuditService();
