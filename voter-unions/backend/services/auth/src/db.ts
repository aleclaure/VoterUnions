/**
 * Database connection and initialization
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 40, // ✅ Increased from 20 to 40 for audit logging
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase() {
  try {
    // Test connection
    await db.query('SELECT NOW()');

    // Create users table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        device_id TEXT UNIQUE,
        public_key TEXT NOT NULL,
        platform TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
    `);

    // Phase 1: Add username and password_hash columns for hybrid auth
    // These are nullable for backward compatibility with device-only auth
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    // Create sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS device_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create challenges table (for authentication flow)
    await db.query(`
      CREATE TABLE IF NOT EXISTS auth_challenges (
        challenge TEXT PRIMARY KEY,
        device_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    // Cleanup old challenges (older than 5 minutes)
    await db.query(`
      DELETE FROM auth_challenges WHERE expires_at < NOW();
    `);

    // ============================================================================
    // ✅ NEW: Initialize Secure Audit Logs Table
    // ============================================================================
    try {
      const auditSchemaPath = path.join(__dirname, 'audit', 'schema.sql');
      const auditSchema = fs.readFileSync(auditSchemaPath, 'utf8');
      await db.query(auditSchema);
      console.log('✅ Secure audit logs table initialized');
    } catch (auditError) {
      console.error('⚠️  Warning: Audit logs table initialization failed:', auditError);
      console.error('Schema path attempted:', path.join(__dirname, 'audit', 'schema.sql'));
      console.error('__dirname:', __dirname);
      // Don't throw - allow app to start even if audit init fails
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await db.end();
});
