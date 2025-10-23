-- ============================================================================
-- Secure Audit Logs Table
-- ============================================================================
-- This table stores audit events with encrypted sensitive data
-- Used by AuditService for backend-only audit logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS secure_audit_logs (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Encrypted user ID (AES-256-GCM)
  user_id_encrypted BYTEA NOT NULL,
  user_id_iv BYTEA NOT NULL,
  user_id_tag BYTEA NOT NULL,

  -- Encrypted username (AES-256-GCM, nullable)
  username_encrypted BYTEA,
  username_iv BYTEA,
  username_tag BYTEA,

  -- Action details (not encrypted - needed for queries and indexes)
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT,

  -- Privacy-preserving identifiers
  device_fingerprint VARCHAR(64) NOT NULL,  -- SHA-256 hash of device ID
  platform VARCHAR(20) NOT NULL,            -- 'web', 'ios', 'android', 'unknown'
  timestamp_bucket TIMESTAMP NOT NULL,      -- Rounded to nearest hour for privacy

  -- Result tracking
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  -- Encrypted metadata (AES-256-GCM, nullable)
  metadata_encrypted BYTEA,
  metadata_iv BYTEA,
  metadata_tag BYTEA,

  -- System timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for querying by action type and time
CREATE INDEX IF NOT EXISTS idx_audit_action_time
  ON secure_audit_logs(action_type, timestamp_bucket DESC)
  WHERE timestamp_bucket >= NOW() - INTERVAL '90 days';

-- Index for querying by device fingerprint
CREATE INDEX IF NOT EXISTS idx_audit_device
  ON secure_audit_logs(device_fingerprint, timestamp_bucket DESC)
  WHERE timestamp_bucket >= NOW() - INTERVAL '90 days';

-- Index for querying by platform
CREATE INDEX IF NOT EXISTS idx_audit_platform
  ON secure_audit_logs(platform, timestamp_bucket DESC)
  WHERE timestamp_bucket >= NOW() - INTERVAL '90 days';

-- Index for cleanup queries (deletion by age)
CREATE INDEX IF NOT EXISTS idx_audit_created
  ON secure_audit_logs(created_at DESC);

-- Composite index for stats queries
CREATE INDEX IF NOT EXISTS idx_audit_stats
  ON secure_audit_logs(action_type, platform, success, timestamp_bucket DESC)
  WHERE timestamp_bucket >= NOW() - INTERVAL '90 days';

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE secure_audit_logs IS 'Audit logs with AES-256-GCM encrypted sensitive data';
COMMENT ON COLUMN secure_audit_logs.user_id_encrypted IS 'Encrypted user ID (decrypt with AUDIT_ENCRYPTION_KEY)';
COMMENT ON COLUMN secure_audit_logs.username_encrypted IS 'Encrypted username (decrypt with AUDIT_ENCRYPTION_KEY)';
COMMENT ON COLUMN secure_audit_logs.device_fingerprint IS 'SHA-256 hash of device ID (not reversible)';
COMMENT ON COLUMN secure_audit_logs.timestamp_bucket IS 'Timestamp rounded to nearest hour for privacy';
COMMENT ON COLUMN secure_audit_logs.metadata_encrypted IS 'Encrypted JSON metadata (decrypt with AUDIT_ENCRYPTION_KEY)';

-- ============================================================================
-- Cleanup Function (30-day retention)
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS cleanup_old_audit_logs();

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete audit logs older than 30 days
  DELETE FROM secure_audit_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Get count of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log cleanup event
  RAISE NOTICE 'Cleaned up % old audit logs', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Delete audit logs older than 30 days (GDPR compliance)';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'secure_audit_logs'
  ) THEN
    RAISE NOTICE '✅ secure_audit_logs table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create secure_audit_logs table';
  END IF;
END $$;
