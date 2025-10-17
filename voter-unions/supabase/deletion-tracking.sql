-- ============================================================================
-- GDPR Article 17: User Deletion Request Tracking
-- ============================================================================
-- This migration adds tracking for user deletion requests so that a scheduled
-- Edge Function can complete the deletion of auth.users records (which require
-- service-role permissions that client apps cannot access).
--
-- Flow:
-- 1. User triggers hard_delete_user_account() -> logs to user_deletion_requests
-- 2. Scheduled Edge Function queries this table -> deletes auth.users
-- 3. Edge Function marks request as completed
-- ============================================================================

-- ============================================================================
-- Step 1: Create User Deletion Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  auth_user_deleted_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deletion_requests_pending 
  ON user_deletion_requests(requested_at) 
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id 
  ON user_deletion_requests(user_id);

-- ============================================================================
-- Step 2: Add Comment Documentation
-- ============================================================================

COMMENT ON TABLE user_deletion_requests IS 
  'Tracks user deletion requests for GDPR Article 17 compliance. Records are created when users request account deletion and processed by scheduled Edge Function to delete auth.users records.';

COMMENT ON COLUMN user_deletion_requests.user_id IS 
  'The user ID from auth.users to be deleted';

COMMENT ON COLUMN user_deletion_requests.email IS 
  'User email (stored for audit trail before deletion)';

COMMENT ON COLUMN user_deletion_requests.username IS 
  'Username (stored for audit trail before deletion)';

COMMENT ON COLUMN user_deletion_requests.requested_at IS 
  'When the user requested account deletion';

COMMENT ON COLUMN user_deletion_requests.completed_at IS 
  'When the deletion process fully completed (auth.users deleted)';

COMMENT ON COLUMN user_deletion_requests.auth_user_deleted_at IS 
  'Specific timestamp when auth.users record was deleted';

COMMENT ON COLUMN user_deletion_requests.error_message IS 
  'Any error encountered during deletion process';

COMMENT ON COLUMN user_deletion_requests.retry_count IS 
  'Number of retry attempts if deletion fails';

-- ============================================================================
-- Step 3: Update hard_delete_user_account to Log Deletion Requests
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS hard_delete_user_account();

-- Recreate with deletion tracking
CREATE OR REPLACE FUNCTION hard_delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_deleted_count INT := 0;
  v_result JSONB;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user details before deletion
  SELECT email, raw_user_meta_data->>'username' 
  INTO v_email, v_username
  FROM auth.users 
  WHERE id = v_user_id;

  -- Log the deletion request (will be processed by Edge Function)
  INSERT INTO user_deletion_requests (
    user_id,
    email,
    username,
    requested_at,
    metadata
  ) VALUES (
    v_user_id,
    COALESCE(v_email, 'unknown@deleted.user'),
    COALESCE(v_username, 'deleted_user'),
    NOW(),
    jsonb_build_object(
      'initiated_by', 'user_self_service',
      'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for'
    )
  );

  -- Delete user data from application tables (cascade from profiles)
  -- The profile deletion will cascade to all related tables via foreign keys
  DELETE FROM profiles WHERE id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Anonymize audit logs (remove PII but keep records for compliance)
  UPDATE audit_logs
  SET 
    user_id = NULL,
    username = '[deleted user]',
    metadata = CASE 
      WHEN metadata IS NOT NULL THEN 
        metadata || jsonb_build_object('user_deleted_at', NOW())
      ELSE 
        jsonb_build_object('user_deleted_at', NOW())
    END
  WHERE user_id = v_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'deleted_at', NOW(),
    'profile_deleted', v_deleted_count > 0,
    'audit_logs_anonymized', true,
    'auth_deletion_scheduled', true,
    'auth_deletion_note', 'auth.users record will be deleted by backend systems within 30 days'
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION hard_delete_user_account() TO authenticated;

-- ============================================================================
-- Step 4: RLS Policies for Deletion Requests Table
-- ============================================================================

ALTER TABLE user_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion request status
CREATE POLICY "Users can view own deletion requests"
  ON user_deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can insert/update (function uses SECURITY DEFINER)
-- No direct insert/update policies needed as function handles it

-- ============================================================================
-- Step 5: Helper Function to Check Deletion Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deletion_request_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_request RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_request
  FROM user_deletion_requests
  WHERE user_id = v_user_id
  ORDER BY requested_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_deletion_request', false
    );
  END IF;

  v_result := jsonb_build_object(
    'has_deletion_request', true,
    'requested_at', v_request.requested_at,
    'completed', v_request.completed_at IS NOT NULL,
    'completed_at', v_request.completed_at,
    'auth_user_deleted', v_request.auth_user_deleted_at IS NOT NULL,
    'auth_user_deleted_at', v_request.auth_user_deleted_at,
    'days_since_request', EXTRACT(DAY FROM NOW() - v_request.requested_at),
    'error_message', v_request.error_message
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_deletion_request_status() TO authenticated;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE 'User deletion tracking system created successfully';
  RAISE NOTICE 'Next step: Deploy Edge Function to process deletion requests';
  RAISE NOTICE 'See: voter-unions/supabase/functions/cleanup-deleted-users/';
END $$;
