-- Migration: Add username and password support for hybrid authentication
-- Phase 1: Backend Preparation
-- Date: 2025-10-21
--
-- This migration adds username/password columns to support hybrid authentication
-- (device token + username/password two-factor authentication)
--
-- BACKWARD COMPATIBLE: Both columns are nullable to support:
-- - Existing users: device-only authentication (no username/password)
-- - New users: hybrid authentication (device + username/password)

-- Add username column (unique, nullable)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add password_hash column (nullable)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Verification query
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
