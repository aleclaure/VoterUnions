-- Fix: Add SECURITY DEFINER to calculate_security_score functions
-- This ensures the security score calculation has proper privileges

-- Function to calculate security score
CREATE OR REPLACE FUNCTION calculate_security_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger function to update security score
CREATE OR REPLACE FUNCTION trigger_update_security_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM calculate_security_score(NEW.user_id);
  RETURN NEW;
END;
$$;
