-- Verification Script: Check Phase 3 RLS Policies
-- Run this to verify security policies are correctly enforced

-- ============================================================================
-- 1. Check Active Sessions Policies
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('active_sessions', 'user_security_settings', 'security_alerts', 'trusted_devices')
ORDER BY tablename, policyname;

-- ============================================================================
-- 2. Verify Expected Security Policies Exist
-- ============================================================================

-- Expected for active_sessions:
-- 1. "Users can view their own sessions" - SELECT with auth.uid() = user_id
-- 2. "Users can revoke their own sessions" - UPDATE with auth.uid() = user_id  
-- 3. "Service role can manage sessions" - ALL with auth.role() = 'service_role'

-- Expected for user_security_settings:
-- 1. "Users can view their own security settings" - SELECT with auth.uid() = user_id
-- 2. "Users can update their own security settings" - UPDATE with auth.uid() = user_id
-- 3. "Users can insert their own security settings" - INSERT with auth.uid() = user_id
-- 4. "Service role can manage security settings" - ALL with auth.role() = 'service_role'

-- Expected for security_alerts:
-- 1. "Users can view their own security alerts" - SELECT with auth.uid() = user_id
-- 2. "Users can acknowledge their own alerts" - UPDATE with restrictions
-- 3. "Service role can manage security alerts" - ALL with auth.role() = 'service_role'

-- Expected for trusted_devices:
-- 1. "Users can view their trusted devices" - SELECT with auth.uid() = user_id
-- 2. "Users can revoke their trusted devices" - UPDATE with auth.uid() = user_id
-- 3. "Users can insert their own trusted devices" - INSERT with auth.uid() = user_id
-- 4. "Service role can manage trusted devices" - ALL with auth.role() = 'service_role'

-- ============================================================================
-- 3. Test User Isolation (should return empty)
-- ============================================================================

-- This should return 0 if policies are correct
SELECT COUNT(*) as cross_user_access_test
FROM active_sessions
WHERE user_id != auth.uid()
  AND auth.role() != 'service_role';

-- ============================================================================
-- 4. Verify SECURITY DEFINER Functions Exist
-- ============================================================================

SELECT 
  routine_name,
  security_type,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('upsert_active_session', 'revoke_session', 'calculate_security_score');

-- ============================================================================
-- 5. Check for Dangerous Policies (should return empty)
-- ============================================================================

-- Look for policies that allow unrestricted access (security hole)
SELECT 
  tablename,
  policyname,
  qual as using_expression
FROM pg_policies 
WHERE tablename IN ('active_sessions', 'user_security_settings', 'security_alerts', 'trusted_devices')
  AND (
    qual LIKE '%true%'  -- Catches USING (true)
    OR qual = '(true)'
    OR qual = 'true'
  )
  AND policyname NOT LIKE '%Service role%'  -- Service role policies are OK
ORDER BY tablename;
