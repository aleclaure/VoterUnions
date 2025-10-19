/**
 * UUID Utilities
 * 
 * Uses UUID v4 instead of ULID to maintain compatibility with Supabase.
 * This eliminates the need for user ID migration during the transition
 * from Supabase to the new backend.
 * 
 * Why UUID instead of ULID?
 * - Supabase auth.users.id uses UUID v4 format
 * - Keeping UUID means existing user IDs can be preserved
 * - No migration needed for 60+ database tables with user_id foreign keys
 * - Compatible with both Supabase and PostgreSQL
 */

import { randomUUID } from 'expo-crypto';

/**
 * Generate a UUID v4
 * 
 * Uses expo-crypto for secure random generation.
 * Compatible with Supabase auth.users.id format.
 * 
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 * 
 * @returns UUID v4 string
 * 
 * @example
 * const userId = generateUserId();
 * // => "a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3"
 */
export const generateUserId = (): string => {
  return randomUUID();
};

/**
 * Validate UUID format
 * 
 * Checks if a string is a valid UUID v4.
 * 
 * @param id - String to validate
 * @returns True if valid UUID v4
 * 
 * @example
 * isValidUUID("a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3"); // => true
 * isValidUUID("invalid-uuid"); // => false
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Preserve existing Supabase user ID or generate new one
 * 
 * During migration, this allows keeping existing user IDs.
 * If an existing ID is provided and valid, it's returned as-is.
 * Otherwise, a new UUID is generated.
 * 
 * This is crucial for:
 * - Preserving user data across 60+ tables
 * - Avoiding complex foreign key migrations
 * - Maintaining referential integrity
 * 
 * @param existingId - Existing user ID from Supabase (optional)
 * @returns Valid UUID (existing or new)
 * 
 * @example
 * // Preserve existing ID
 * getUserId("a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3");
 * // => "a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3"
 * 
 * // Generate new ID
 * getUserId();
 * // => "b4cc290f-9cg0-5d5f-0d9f-1f36f6g6f6b4"
 */
export const getUserId = (existingId?: string): string => {
  if (existingId && isValidUUID(existingId)) {
    return existingId; // Preserve existing ID
  }
  return generateUserId(); // Generate new ID
};

/**
 * Generate multiple UUIDs
 * 
 * Useful for batch operations or testing.
 * 
 * @param count - Number of UUIDs to generate
 * @returns Array of UUID strings
 * 
 * @example
 * generateBatchUUIDs(3);
 * // => ["uuid1", "uuid2", "uuid3"]
 */
export const generateBatchUUIDs = (count: number): string[] => {
  return Array.from({ length: count }, () => generateUserId());
};

/**
 * Extract UUID from a string
 * 
 * Searches for a UUID pattern in a string and extracts it.
 * Useful for parsing URLs, file names, etc.
 * 
 * @param text - Text to search
 * @returns UUID if found, null otherwise
 * 
 * @example
 * extractUUID("/api/users/a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3/profile");
 * // => "a3bb189e-8bf9-4c4e-9c8e-0e25e5f5e5a3"
 */
export const extractUUID = (text: string): string | null => {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const match = text.match(uuidRegex);
  return match ? match[0] : null;
};
