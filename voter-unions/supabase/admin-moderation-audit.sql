-- Extend Audit Logging for Admin Moderation Actions
-- Purpose: Track all moderation actions for transparency and accountability

-- ============================================================================
-- Step 1: Add Moderation Action Types to audit_logs
-- ============================================================================

-- Drop and recreate the action_type constraint to include moderation actions
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE audit_logs 
  ADD CONSTRAINT audit_logs_action_type_check CHECK (action_type IN (
    -- Authentication events
    'login_success', 'login_failed', 'logout',
    'signup_success', 'signup_failed',
    'password_reset_requested', 'password_reset_success', 'password_changed',
    'session_expired', 'rate_limit_triggered',
    
    -- Voting events
    'vote_cast', 'vote_changed', 'vote_deleted',
    
    -- Union events
    'union_created', 'union_joined', 'union_left', 'union_deleted',
    
    -- Debate events
    'debate_created', 'debate_deleted',
    'argument_created', 'argument_deleted',
    
    -- Action events
    'boycott_proposed', 'boycott_voted', 'boycott_activated',
    'strike_proposed', 'strike_voted', 'strike_activated',
    
    -- Account events
    'profile_updated', 'account_created', 'account_deleted',
    'suspicious_activity',
    
    -- MODERATION ACTIONS (NEW)
    'report_submitted',
    'report_dismissed', 
    'report_reviewed',
    'report_actioned',
    'content_deleted',
    'content_restored',
    'user_warned',
    'user_banned',
    'user_unbanned',
    'role_changed'
  ));

-- Add moderation entity types
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;

ALTER TABLE audit_logs 
  ADD CONSTRAINT audit_logs_entity_type_check CHECK (entity_type IN (
    'user', 'union', 'debate', 'argument', 'vote', 
    'boycott', 'strike', 'proposal', 'profile',
    -- NEW entity types for moderation
    'report', 'post', 'comment', 'role'
  ));

-- ============================================================================
-- Step 2: Create Trigger to Automatically Log Report Status Changes
-- ============================================================================

-- Function to log report status changes
CREATE OR REPLACE FUNCTION log_report_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_username TEXT;
  v_action_type TEXT;
  v_description TEXT;
BEGIN
  -- Only log if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get admin username from profiles
    SELECT display_name INTO v_admin_username
    FROM profiles
    WHERE id = auth.uid();
    
    -- Determine action type based on new status
    v_action_type := CASE NEW.status
      WHEN 'dismissed' THEN 'report_dismissed'
      WHEN 'reviewed' THEN 'report_reviewed'
      WHEN 'actioned' THEN 'report_actioned'
      ELSE 'report_reviewed'  -- fallback
    END;
    
    -- Build description
    v_description := format(
      'Report #%s on %s (ID: %s) marked as %s',
      NEW.id,
      NEW.content_type,
      NEW.content_id,
      NEW.status
    );
    
    -- Log the moderation action
    INSERT INTO audit_logs (
      user_id,
      username,
      action_type,
      entity_type,
      entity_id,
      description,
      metadata,
      success
    ) VALUES (
      auth.uid(),
      COALESCE(v_admin_username, 'unknown'),
      v_action_type,
      'report',
      NEW.id,
      v_description,
      jsonb_build_object(
        'report_id', NEW.id,
        'content_type', NEW.content_type,
        'content_id', NEW.content_id,
        'reason', NEW.reason,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'admin_notes', NEW.admin_notes,
        'reporter_id', NEW.reporter_id
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on reports table
DROP TRIGGER IF EXISTS trigger_log_report_status_change ON reports;

CREATE TRIGGER trigger_log_report_status_change
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION log_report_status_change();

-- ============================================================================
-- Step 3: Create Trigger to Log Content Deletion
-- ============================================================================

-- Function to log post deletion
CREATE OR REPLACE FUNCTION log_post_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_username TEXT;
BEGIN
  -- Only log if soft deleted (deleted_at set)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Get admin username
    SELECT display_name INTO v_admin_username
    FROM profiles
    WHERE id = auth.uid();
    
    INSERT INTO audit_logs (
      user_id,
      username,
      action_type,
      entity_type,
      entity_id,
      description,
      metadata,
      success
    ) VALUES (
      auth.uid(),
      COALESCE(v_admin_username, 'system'),
      'content_deleted',
      'post',
      NEW.id,
      format('Post "%s" (ID: %s) was deleted', LEFT(NEW.content, 50), NEW.id),
      jsonb_build_object(
        'post_id', NEW.id,
        'author_id', NEW.user_id,
        'union_id', NEW.union_id,
        'content_preview', LEFT(NEW.content, 100)
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_log_post_deletion ON posts;

CREATE TRIGGER trigger_log_post_deletion
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION log_post_deletion();

-- Function to log comment deletion
CREATE OR REPLACE FUNCTION log_comment_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_username TEXT;
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT display_name INTO v_admin_username
    FROM profiles
    WHERE id = auth.uid();
    
    INSERT INTO audit_logs (
      user_id,
      username,
      action_type,
      entity_type,
      entity_id,
      description,
      metadata,
      success
    ) VALUES (
      auth.uid(),
      COALESCE(v_admin_username, 'system'),
      'content_deleted',
      'comment',
      NEW.id,
      format('Comment on post %s was deleted', NEW.post_id),
      jsonb_build_object(
        'comment_id', NEW.id,
        'author_id', NEW.user_id,
        'post_id', NEW.post_id,
        'content_preview', LEFT(NEW.content, 100)
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on comments table  
DROP TRIGGER IF EXISTS trigger_log_comment_deletion ON comments;

CREATE TRIGGER trigger_log_comment_deletion
  AFTER UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_deletion();

-- ============================================================================
-- Step 4: RLS Policies for Union Members to View Moderation Logs
-- ============================================================================

-- Create view for union-specific moderation logs
CREATE OR REPLACE VIEW union_moderation_logs AS
SELECT 
  al.*,
  r.union_id,
  r.content_type,
  r.content_id
FROM audit_logs al
LEFT JOIN reports r ON al.entity_id = r.id AND al.entity_type = 'report'
WHERE 
  al.action_type IN (
    'report_dismissed', 
    'report_reviewed', 
    'report_actioned',
    'content_deleted',
    'content_restored'
  )
  AND al.deleted_at IS NULL
ORDER BY al.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON union_moderation_logs TO authenticated;

-- RLS policy: Users can see moderation logs for unions they're members of
CREATE POLICY "Union members can view moderation logs" 
  ON audit_logs
  FOR SELECT
  USING (
    -- Allow viewing moderation-related logs if user is a member of the related union
    audit_logs.action_type IN (
      'report_dismissed', 
      'report_reviewed', 
      'report_actioned',
      'content_deleted',
      'content_restored'
    )
    AND (
      -- Report actions: check via reports table
      (audit_logs.entity_type = 'report' AND EXISTS (
        SELECT 1 FROM reports r
        INNER JOIN union_members um ON um.union_id = r.union_id
        WHERE r.id = audit_logs.entity_id
          AND um.user_id = auth.uid()
      ))
      OR
      -- Post deletion actions: check via posts table
      (audit_logs.entity_type = 'post' AND EXISTS (
        SELECT 1 FROM posts p
        INNER JOIN union_members um ON um.union_id = p.union_id
        WHERE p.id = audit_logs.entity_id
          AND um.user_id = auth.uid()
      ))
      OR
      -- Comment deletion actions: check via comments -> posts
      (audit_logs.entity_type = 'comment' AND EXISTS (
        SELECT 1 FROM comments c
        INNER JOIN posts p ON c.post_id = p.id
        INNER JOIN union_members um ON um.union_id = p.union_id
        WHERE c.id = audit_logs.entity_id
          AND um.user_id = auth.uid()
      ))
    )
  );

-- ============================================================================
-- Step 5: Helper Function to Get Moderation Logs for a Union
-- ============================================================================

CREATE OR REPLACE FUNCTION get_union_moderation_logs(p_union_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  admin_username TEXT,
  action_type TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user is a member of the union
  IF NOT EXISTS (
    SELECT 1 FROM union_members
    WHERE union_id = p_union_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You must be a member of this union';
  END IF;
  
  -- Return all moderation actions for this union:
  -- 1. Report actions (from reports table)
  -- 2. Content deletions (from posts/comments that belong to the union)
  RETURN QUERY
  SELECT 
    al.id,
    al.username AS admin_username,
    al.action_type,
    al.description,
    al.metadata,
    al.created_at
  FROM audit_logs al
  WHERE 
    al.deleted_at IS NULL
    AND al.action_type IN (
      'report_dismissed', 
      'report_reviewed', 
      'report_actioned',
      'content_deleted',
      'content_restored'
    )
    AND (
      -- Report-related actions: check report's union_id
      (al.entity_type = 'report' AND EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id = al.entity_id AND r.union_id = p_union_id
      ))
      OR
      -- Post deletion actions: check post's union_id
      (al.entity_type = 'post' AND EXISTS (
        SELECT 1 FROM posts p
        WHERE p.id = al.entity_id AND p.union_id = p_union_id
      ))
      OR
      -- Comment deletion actions: check comment's post's union_id
      (al.entity_type = 'comment' AND EXISTS (
        SELECT 1 FROM comments c
        INNER JOIN posts p ON c.post_id = p.id
        WHERE c.id = al.entity_id AND p.union_id = p_union_id
      ))
    )
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_union_moderation_logs(UUID, INT) TO authenticated;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION log_report_status_change IS 
  'Automatically logs admin moderation actions when report status changes';

COMMENT ON FUNCTION log_post_deletion IS 
  'Automatically logs when posts are soft-deleted (moderation action)';

COMMENT ON FUNCTION log_comment_deletion IS 
  'Automatically logs when comments are soft-deleted (moderation action)';

COMMENT ON FUNCTION get_union_moderation_logs IS 
  'Returns moderation audit logs for a specific union (visible to members)';

COMMENT ON VIEW union_moderation_logs IS 
  'View of all moderation actions, joinable with union context for RLS';
