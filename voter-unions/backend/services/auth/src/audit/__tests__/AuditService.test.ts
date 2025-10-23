/**
 * AuditService Tests
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { auditService, AuditService } from '../AuditService';
import { db } from '../../db';
import type { AuditEvent } from '../types';

describe('AuditService', () => {
  // Test user data
  const testUserId = 'test-user-123';
  const testDeviceId = 'test-device-abc';
  const testUsername = 'testuser';

  beforeAll(async () => {
    // Ensure database is initialized
    // Note: In real tests, use a test database
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query(`DELETE FROM secure_audit_logs WHERE device_fingerprint = $1`, [
      // SHA-256 hash of testDeviceId
      require('crypto').createHash('sha256').update(testDeviceId).digest('hex'),
    ]);
  });

  describe('Encryption', () => {
    it('should require AUDIT_ENCRYPTION_KEY environment variable', () => {
      const originalKey = process.env.AUDIT_ENCRYPTION_KEY;
      delete process.env.AUDIT_ENCRYPTION_KEY;

      expect(() => {
        new AuditService();
      }).toThrow('AUDIT_ENCRYPTION_KEY environment variable is required');

      process.env.AUDIT_ENCRYPTION_KEY = originalKey;
    });

    it('should require 64 hex characters for encryption key', () => {
      const originalKey = process.env.AUDIT_ENCRYPTION_KEY;
      process.env.AUDIT_ENCRYPTION_KEY = 'too-short';

      expect(() => {
        new AuditService();
      }).toThrow('must be 64 hex characters');

      process.env.AUDIT_ENCRYPTION_KEY = originalKey;
    });

    it('should validate hex format', () => {
      const originalKey = process.env.AUDIT_ENCRYPTION_KEY;
      process.env.AUDIT_ENCRYPTION_KEY = 'Z'.repeat(64); // Invalid hex

      expect(() => {
        new AuditService();
      }).toThrow('must contain only hex characters');

      process.env.AUDIT_ENCRYPTION_KEY = originalKey;
    });
  });

  describe('logEvent', () => {
    it('should log successful login event', async () => {
      const event: AuditEvent = {
        userId: testUserId,
        username: testUsername,
        actionType: 'login_success',
        entityType: 'user',
        entityId: testUserId,
        deviceId: testDeviceId,
        platform: 'web',
        success: true,
      };

      // Should not throw
      await expect(auditService.logEvent(event)).resolves.not.toThrow();

      // Wait a bit for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify log was created (check by device fingerprint)
      const deviceHash = require('crypto')
        .createHash('sha256')
        .update(testDeviceId)
        .digest('hex');

      const result = await db.query(
        `SELECT * FROM secure_audit_logs
         WHERE device_fingerprint = $1
         AND action_type = 'login_success'
         ORDER BY created_at DESC
         LIMIT 1`,
        [deviceHash]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].success).toBe(true);
      expect(result.rows[0].platform).toBe('web');
    });

    it('should log failed login event with error message', async () => {
      const event: AuditEvent = {
        userId: testUserId,
        username: testUsername,
        actionType: 'login_failed',
        entityType: 'user',
        entityId: testUserId,
        deviceId: testDeviceId,
        platform: 'web',
        success: false,
        errorMessage: 'Invalid password',
      };

      await expect(auditService.logEvent(event)).resolves.not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const deviceHash = require('crypto')
        .createHash('sha256')
        .update(testDeviceId)
        .digest('hex');

      const result = await db.query(
        `SELECT * FROM secure_audit_logs
         WHERE device_fingerprint = $1
         AND action_type = 'login_failed'
         ORDER BY created_at DESC
         LIMIT 1`,
        [deviceHash]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].success).toBe(false);
      expect(result.rows[0].error_message).toBe('Invalid password');
    });

    it('should encrypt user ID in database', async () => {
      const event: AuditEvent = {
        userId: testUserId,
        actionType: 'password_changed',
        entityType: 'user',
        entityId: testUserId,
        deviceId: testDeviceId,
        platform: 'web',
        success: true,
      };

      await auditService.logEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const deviceHash = require('crypto')
        .createHash('sha256')
        .update(testDeviceId)
        .digest('hex');

      const result = await db.query(
        `SELECT user_id_encrypted FROM secure_audit_logs
         WHERE device_fingerprint = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [deviceHash]
      );

      // User ID should be encrypted (not plaintext)
      const encrypted = result.rows[0].user_id_encrypted.toString();
      expect(encrypted).not.toContain(testUserId);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should hash device ID (not reversible)', async () => {
      const event: AuditEvent = {
        userId: testUserId,
        actionType: 'signup_success',
        entityType: 'user',
        entityId: testUserId,
        deviceId: testDeviceId,
        platform: 'ios',
        success: true,
      };

      await auditService.logEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const expectedHash = require('crypto')
        .createHash('sha256')
        .update(testDeviceId)
        .digest('hex');

      const result = await db.query(
        `SELECT device_fingerprint FROM secure_audit_logs
         WHERE device_fingerprint = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [expectedHash]
      );

      expect(result.rows[0].device_fingerprint).toBe(expectedHash);
      expect(result.rows[0].device_fingerprint).not.toContain(testDeviceId);
    });

    it('should bucket timestamp to nearest hour', async () => {
      const event: AuditEvent = {
        userId: testUserId,
        actionType: 'logout',
        entityType: 'user',
        entityId: testUserId,
        deviceId: testDeviceId,
        platform: 'android',
        success: true,
      };

      await auditService.logEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const deviceHash = require('crypto')
        .createHash('sha256')
        .update(testDeviceId)
        .digest('hex');

      const result = await db.query(
        `SELECT timestamp_bucket FROM secure_audit_logs
         WHERE device_fingerprint = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [deviceHash]
      );

      const timestamp = new Date(result.rows[0].timestamp_bucket);

      // Minutes and seconds should be 0 (rounded to hour)
      expect(timestamp.getMinutes()).toBe(0);
      expect(timestamp.getSeconds()).toBe(0);
      expect(timestamp.getMilliseconds()).toBe(0);
    });
  });

  describe('queryLogs', () => {
    it('should decrypt logs when queried', async () => {
      // First, create a log
      const event: AuditEvent = {
        userId: testUserId,
        username: testUsername,
        actionType: 'token_refreshed',
        entityType: 'session',
        entityId: 'session-123',
        deviceId: testDeviceId,
        platform: 'web',
        success: true,
        metadata: { refreshCount: 1 },
      };

      await auditService.logEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query logs
      const logs = await auditService.queryLogs({
        actionType: 'token_refreshed',
        limit: 1,
      });

      expect(logs.length).toBeGreaterThan(0);

      const log = logs[0];
      expect(log.userId).toBe(testUserId); // Decrypted
      expect(log.username).toBe(testUsername); // Decrypted
      expect(log.metadata).toEqual({ refreshCount: 1 }); // Decrypted
    });

    it('should filter by action type', async () => {
      const logs = await auditService.queryLogs({
        actionType: 'login_success',
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every((log) => log.actionType === 'login_success')).toBe(true);
    });

    it('should filter by platform', async () => {
      const logs = await auditService.queryLogs({
        platform: 'web',
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every((log) => log.platform === 'web')).toBe(true);
    });

    it('should filter by success', async () => {
      const logs = await auditService.queryLogs({
        success: false,
      });

      // Should only return failed events
      expect(logs.every((log) => log.success === false)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      const stats = await auditService.getStats(7);

      expect(Array.isArray(stats)).toBe(true);

      if (stats.length > 0) {
        const stat = stats[0];
        expect(stat).toHaveProperty('actionType');
        expect(stat).toHaveProperty('platform');
        expect(stat).toHaveProperty('totalCount');
        expect(stat).toHaveProperty('successCount');
        expect(stat).toHaveProperty('failureCount');
        expect(stat).toHaveProperty('uniqueDevices');
      }
    });

    it('should count events correctly', async () => {
      const stats = await auditService.getStats(7);

      // Total should equal success + failure
      stats.forEach((stat) => {
        expect(stat.totalCount).toBe(stat.successCount + stat.failureCount);
      });
    });
  });

  describe('cleanup', () => {
    it('should delete old audit logs', async () => {
      // This test would require inserting old logs
      // For now, just verify the function doesn't throw
      const deletedCount = await auditService.cleanup();

      expect(typeof deletedCount).toBe('number');
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
