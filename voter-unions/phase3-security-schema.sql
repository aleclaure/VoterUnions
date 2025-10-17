-- Phase 3 Security: Advanced Session Management & User Protection
-- Features: Multi-device sessions, suspicious activity alerts, 2FA, email verification

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Active Sessions Table - Track user sessions across devices
-- ============================================================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and session info
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE, -- Supabase session token
  refresh_token VARCHAR(255), -- For session refresh
  
  -- Device and location tracking
  device_id VARCHAR(255) NOT NULL, -- From expo-application
  device_name VARCHAR(255), -- User-friendly device name (e.g., "iPhone 14 Pro")
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  os_name VARCHAR(50), -- 'iOS', 'Android', 'Web'
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  
  -- Network information
  ip_address INET,
  user_agent TEXT,
  
  -- Session state
  is_active BOOLEAN DEFAULT true,
  is_trusted BOOLEAN DEFAULT false, -- "Remember this device"
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Security flags
  requires_reverification BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMPTZ, -- When session was manually ended
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- User Security Settings - Preferences and 2FA
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Email verification
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  verification_reminder_sent_at TIMESTAMPTZ,
  
  -- Two-Factor Authentication (2FA)
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_method VARCHAR(50) DEFAULT 'email', -- 'email', 'sms', 'authenticator'
  two_factor_backup_codes TEXT[], -- Encrypted backup codes
  two_factor_enabled_at TIMESTAMPTZ,
  
  -- Trusted devices
  trusted_device_duration_days INTEGER DEFAULT 30,
  
  -- Security preferences
  require_2fa_for_sensitive_actions BOOLEAN DEFAULT false,
  notify_on_new_login BOOLEAN DEFAULT true,
  notify_on_suspicious_activity BOOLEAN DEFAULT true,
  
  -- Account recovery
  backup_email VARCHAR(255),
  backup_email_verified BOOLEAN DEFAULT false,
  
  -- Security score (calculated)
  security_score INTEGER DEFAULT 0, -- 0-100 based on security practices
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Suspicious Activity Alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and alert info
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'multiple_failed_logins',
    'new_device_login',
    'unusual_location',
    'rapid_actions',
    'account_takeover_attempt',
    'suspicious_voting_pattern',
    'rate_limit_exceeded'
  )),
  
  -- Alert details
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  
  -- Related entities
  related_session_id UUID REFERENCES active_sessions(id),
  related_audit_log_ids UUID[], -- Array of related audit log IDs
  
  -- Alert state
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- User acknowledgment
  acknowledged_by_user BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- Trusted Devices
-- ============================================================================

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  
  -- Trust settings
  trusted_at TIMESTAMPTZ DEFAULT NOW(),
  trust_expires_at TIMESTAMPTZ, -- Calculated based on user settings
  
  -- Device fingerprint for additional verification
  device_fingerprint TEXT, -- Hash of device characteristics
  
  -- Last used
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Revocation
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, device_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Active Sessions
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_active_sessions_device_id ON active_sessions(device_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at) WHERE is_active = true;

-- Security Settings
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON user_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_email_verified ON user_security_settings(email_verified);
CREATE INDEX IF NOT EXISTS idx_security_settings_2fa_enabled ON user_security_settings(two_factor_enabled);

-- Security Alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON security_alerts(user_id, is_resolved) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, created_at DESC) WHERE deleted_at IS NULL;

-- Trusted Devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_active ON trusted_devices(user_id, is_revoked) WHERE is_revoked = false;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Active Sessions
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON active_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions" ON active_sessions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System/service role can manage all sessions (for automation)
-- Note: This policy only applies when using service_role key, not regular authenticated users
CREATE POLICY "Service role can manage sessions" ON active_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- User Security Settings
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security settings" ON user_security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON user_security_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings" ON user_security_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can manage all settings (for system operations)
CREATE POLICY "Service role can manage security settings" ON user_security_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Security Alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security alerts" ON security_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge their own alerts" ON security_alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (OLD.acknowledged_by_user = false OR OLD.acknowledged_by_user IS NULL)
  );

-- Service role can create and manage alerts (system-generated)
CREATE POLICY "Service role can manage security alerts" ON security_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Trusted Devices
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their trusted devices" ON trusted_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their trusted devices" ON trusted_devices
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trusted devices" ON trusted_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can manage all trusted devices (for system operations)
CREATE POLICY "Service role can manage trusted devices" ON trusted_devices
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to create or update session
CREATE OR REPLACE FUNCTION upsert_active_session(
  p_user_id UUID,
  p_session_token VARCHAR,
  p_device_id VARCHAR,
  p_device_name VARCHAR DEFAULT NULL,
  p_device_type VARCHAR DEFAULT NULL,
  p_os_name VARCHAR DEFAULT NULL,
  p_os_version VARCHAR DEFAULT NULL,
  p_app_version VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Deactivate old sessions for this device
  UPDATE active_sessions 
  SET is_active = false, 
      revoked_at = NOW()
  WHERE user_id = p_user_id 
    AND device_id = p_device_id 
    AND is_active = true;
  
  -- Create new session with all device metadata
  INSERT INTO active_sessions (
    user_id,
    session_token,
    device_id,
    device_name,
    device_type,
    os_name,
    os_version,
    app_version,
    ip_address,
    expires_at
  ) VALUES (
    p_user_id,
    p_session_token,
    p_device_id,
    p_device_name,
    p_device_type,
    p_os_name,
    p_os_version,
    p_app_version,
    p_ip_address,
    p_expires_at
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Function to revoke session
CREATE OR REPLACE FUNCTION revoke_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE active_sessions
  SET is_active = false,
      revoked_at = NOW()
  WHERE id = p_session_id;
  
  RETURN FOUND;
END;
$$;

-- Function to calculate security score
CREATE OR REPLACE FUNCTION calculate_security_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := 0;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings
  FROM user_security_settings
  WHERE user_id = p_user_id;
  
  IF v_settings IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Base score
  v_score := 20;
  
  -- Email verified (+30 points)
  IF v_settings.email_verified THEN
    v_score := v_score + 30;
  END IF;
  
  -- 2FA enabled (+40 points)
  IF v_settings.two_factor_enabled THEN
    v_score := v_score + 40;
  END IF;
  
  -- Backup email (+10 points)
  IF v_settings.backup_email IS NOT NULL AND v_settings.backup_email_verified THEN
    v_score := v_score + 10;
  END IF;
  
  -- Cap at 100
  v_score := LEAST(v_score, 100);
  
  -- Update the score
  UPDATE user_security_settings
  SET security_score = v_score,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN v_score;
END;
$$;

-- Trigger to update security score on settings change
CREATE OR REPLACE FUNCTION trigger_update_security_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM calculate_security_score(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_security_score_trigger
AFTER INSERT OR UPDATE ON user_security_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_update_security_score();

-- ============================================================================
-- Views for Security Monitoring
-- ============================================================================

-- View: User Security Dashboard
CREATE OR REPLACE VIEW user_security_dashboard AS
SELECT 
  u.id as user_id,
  u.email,
  uss.email_verified,
  uss.two_factor_enabled,
  uss.security_score,
  COUNT(DISTINCT ast.id) FILTER (WHERE ast.is_active = true) as active_sessions_count,
  COUNT(DISTINCT sa.id) FILTER (WHERE sa.is_resolved = false) as unresolved_alerts_count,
  MAX(ast.last_activity_at) as last_activity,
  COUNT(DISTINCT td.id) FILTER (WHERE td.is_revoked = false) as trusted_devices_count
FROM auth.users u
LEFT JOIN user_security_settings uss ON u.id = uss.user_id
LEFT JOIN active_sessions ast ON u.id = ast.user_id AND ast.deleted_at IS NULL
LEFT JOIN security_alerts sa ON u.id = sa.user_id AND sa.deleted_at IS NULL
LEFT JOIN trusted_devices td ON u.id = td.user_id
GROUP BY u.id, u.email, uss.email_verified, uss.two_factor_enabled, uss.security_score;

-- View: High-Risk Users (for admin monitoring)
CREATE OR REPLACE VIEW high_risk_users AS
SELECT 
  user_id,
  email,
  COUNT(*) as alert_count,
  array_agg(DISTINCT alert_type) as alert_types,
  MAX(severity) as max_severity,
  MAX(created_at) as last_alert_at
FROM security_alerts sa
JOIN auth.users u ON sa.user_id = u.id
WHERE sa.is_resolved = false
  AND sa.deleted_at IS NULL
  AND sa.severity IN ('high', 'critical')
GROUP BY user_id, email
HAVING COUNT(*) >= 2
ORDER BY alert_count DESC, last_alert_at DESC;
