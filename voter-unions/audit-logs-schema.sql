-- Audit Logging System for Security and Compliance
-- Tracks all sensitive operations: votes, union actions, account changes

-- Ensure extensions (no-op if already installed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who performed the action
  user_id UUID REFERENCES auth.users(id),
  username VARCHAR(50), -- Denormalized for historical record even if user deleted
  
  -- What action was performed
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'vote_cast', 'vote_changed', 'vote_deleted',
    'union_created', 'union_joined', 'union_left', 'union_deleted',
    'debate_created', 'debate_deleted',
    'argument_created', 'argument_deleted',
    'boycott_proposed', 'boycott_voted', 'boycott_activated',
    'strike_proposed', 'strike_voted', 'strike_activated',
    'profile_updated', 'password_changed',
    'account_created', 'account_deleted',
    'suspicious_activity'
  )),
  
  -- Details of the action
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'user', 'union', 'debate', 'argument', 'vote', 
    'boycott', 'strike', 'proposal', 'profile'
  )),
  entity_id UUID NOT NULL, -- ID of the affected entity
  
  -- Context and metadata
  description TEXT, -- Human-readable description
  metadata JSONB, -- Flexible storage for action-specific data
  
  -- Security tracking
  device_id VARCHAR(255), -- Hashed device identifier
  ip_address INET, -- User's IP address (if available)
  user_agent TEXT, -- Browser/app info
  
  -- Result tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT, -- If action failed
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Soft delete (for compliance - never hard delete audit logs)
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_device_id ON audit_logs(device_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE deleted_at IS NULL;

-- Composite index for suspicious activity detection
CREATE INDEX IF NOT EXISTS idx_audit_logs_suspicious ON audit_logs(device_id, action_type, created_at DESC) 
  WHERE deleted_at IS NULL AND success = true;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only system/admins can view audit logs (users cannot see their own audit trail)
-- Note: In a real app, you'd have an admin role. For now, we restrict all access.
CREATE POLICY "Audit logs are system-only" ON audit_logs
  FOR SELECT USING (false); -- No users can read audit logs directly

-- System can always insert audit logs (via service role key)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Prevent any updates or deletes (audit logs are immutable)
CREATE POLICY "Audit logs are immutable" ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON audit_logs
  FOR DELETE USING (false);

-- ============================================================================
-- Helper Function: Log Audit Event
-- ============================================================================

-- Function to easily log audit events from triggers or application code
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_username VARCHAR,
  p_action_type VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_device_id VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    username,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata,
    device_id,
    ip_address,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_username,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata,
    p_device_id,
    p_ip_address,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- Suspicious Activity Detection View
-- ============================================================================

-- View to help identify potential security issues
CREATE OR REPLACE VIEW suspicious_activity AS
SELECT 
  device_id,
  ip_address,
  COUNT(*) as action_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT entity_id) as unique_entities,
  array_agg(DISTINCT action_type) as action_types,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM audit_logs
WHERE 
  deleted_at IS NULL 
  AND created_at > NOW() - INTERVAL '1 hour'
  AND device_id IS NOT NULL
GROUP BY device_id, ip_address
HAVING 
  COUNT(*) > 50 -- More than 50 actions in an hour
  OR COUNT(DISTINCT user_id) > 3 -- Same device used by multiple users
ORDER BY action_count DESC;
