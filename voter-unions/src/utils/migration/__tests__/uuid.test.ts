/**
 * UUID Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateUserId,
  isValidUUID,
  getUserId,
  generateBatchUUIDs,
  extractUUID,
} from '../uuid';

describe('UUID Utilities', () => {
  describe('generateUserId', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUserId();
      expect(isValidUUID(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUserId();
      const uuid2 = generateUserId();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should match UUID v4 format', () => {
      const uuid = generateUserId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      const validUUIDs = [
        'a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3',
        '123e4567-e89b-42d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123',
        'a3bb189e-8bf9-5c4e-9c8e-0e25e5f5e5a3', // Wrong version (5 instead of 4)
        'a3bb189e8bf94c4e9c8e0e25e5f5e5a3', // Missing dashes
        'a3bb189e-8bf9-4c4e-9c8e', // Too short
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('getUserId', () => {
    it('should preserve valid existing UUID', () => {
      const existingId = 'a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3';
      const result = getUserId(existingId);
      expect(result).toBe(existingId);
    });

    it('should generate new UUID if existing is invalid', () => {
      const invalidId = 'invalid-uuid';
      const result = getUserId(invalidId);
      expect(result).not.toBe(invalidId);
      expect(isValidUUID(result)).toBe(true);
    });

    it('should generate new UUID if no existing ID provided', () => {
      const result = getUserId();
      expect(isValidUUID(result)).toBe(true);
    });
  });

  describe('generateBatchUUIDs', () => {
    it('should generate specified number of UUIDs', () => {
      const count = 5;
      const uuids = generateBatchUUIDs(count);
      expect(uuids).toHaveLength(count);
    });

    it('should generate all valid UUIDs', () => {
      const uuids = generateBatchUUIDs(10);
      uuids.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should generate unique UUIDs', () => {
      const uuids = generateBatchUUIDs(10);
      const uniqueUUIDs = new Set(uuids);
      expect(uniqueUUIDs.size).toBe(uuids.length);
    });
  });

  describe('extractUUID', () => {
    it('should extract UUID from URL', () => {
      const url = '/api/users/a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3/profile';
      const uuid = extractUUID(url);
      expect(uuid).toBe('a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3');
    });

    it('should extract UUID from text', () => {
      const text = 'User ID: a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3';
      const uuid = extractUUID(text);
      expect(uuid).toBe('a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3');
    });

    it('should return null if no UUID found', () => {
      const text = 'No UUID here';
      const uuid = extractUUID(text);
      expect(uuid).toBeNull();
    });
  });
});
