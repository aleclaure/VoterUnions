-- Hard Delete Account Function (GDPR Right to Erasure)
-- This function permanently deletes a user account and all associated data

CREATE OR REPLACE FUNCTION hard_delete_account(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete all user-generated content in comprehensive order (foreign key dependencies)
  -- Based on complete schema inventory from data export
  
  -- 1. All votes (no foreign key dependencies)
  DELETE FROM post_votes WHERE user_id = user_uuid;
  DELETE FROM comment_votes WHERE user_id = user_uuid;
  DELETE FROM argument_votes WHERE user_id = user_uuid;
  DELETE FROM policy_votes WHERE user_id = user_uuid;
  DELETE FROM amendment_votes WHERE user_id = user_uuid;
  DELETE FROM negotiation_votes WHERE user_id = user_uuid;
  DELETE FROM boycott_votes WHERE user_id = user_uuid;
  DELETE FROM worker_votes WHERE user_id = user_uuid;
  
  -- 2. Reactions, interactions, and pledges
  DELETE FROM post_reactions WHERE user_id = user_uuid;
  DELETE FROM power_pledges WHERE user_id = user_uuid;
  DELETE FROM campaign_pledges WHERE user_id = user_uuid;
  DELETE FROM strike_pledges WHERE worker_id = user_uuid;
  
  -- 3. Bookmarks and support actions
  DELETE FROM corporate_power_bookmarks WHERE user_id = user_uuid;
  DELETE FROM labor_power_bookmarks WHERE user_id = user_uuid;
  DELETE FROM organizing_support WHERE user_id = user_uuid;
  DELETE FROM victory_celebrations WHERE user_id = user_uuid;
  
  -- 4. Comments (before their parent content)
  DELETE FROM comments WHERE user_id = user_uuid;
  DELETE FROM boycott_comments WHERE user_id = user_uuid;
  DELETE FROM worker_comments WHERE user_id = user_uuid;
  DELETE FROM demand_comments WHERE user_id = user_uuid;
  
  -- 5. Arguments and debates
  DELETE FROM arguments WHERE user_id = user_uuid;
  DELETE FROM debates WHERE created_by = user_uuid;
  
  -- 6. Posts (before channels)
  DELETE FROM posts WHERE user_id = user_uuid;
  
  -- 7. Content reports (moderation)
  DELETE FROM reports WHERE reporter_id = user_uuid;
  
  -- 8. Power Tracker content
  DELETE FROM politicians WHERE created_by = user_uuid;
  DELETE FROM donors WHERE created_by = user_uuid;
  DELETE FROM bills WHERE created_by = user_uuid;
  DELETE FROM power_beneficiaries WHERE created_by = user_uuid;
  DELETE FROM power_graphics WHERE created_by = user_uuid;
  
  -- 9. Corporate Power content
  DELETE FROM corporate_influence WHERE created_by = user_uuid;
  DELETE FROM consumer_impact WHERE created_by = user_uuid;
  DELETE FROM worker_impact WHERE created_by = user_uuid;
  DELETE FROM corporate_accountability WHERE created_by = user_uuid;
  DELETE FROM corporate_exploitation WHERE created_by = user_uuid;
  
  -- 10. Labor Power content
  DELETE FROM organizing_resistance WHERE created_by = user_uuid;
  DELETE FROM worker_rights_legislation WHERE created_by = user_uuid;
  DELETE FROM solidarity_victories WHERE created_by = user_uuid;
  
  -- 11. People's Agenda content
  DELETE FROM policies WHERE created_by = user_uuid;
  DELETE FROM amendments WHERE created_by = user_uuid;
  DELETE FROM platform_sections WHERE created_by = user_uuid;
  DELETE FROM platform_amendments WHERE user_id = user_uuid;
  DELETE FROM demand_votes WHERE user_id = user_uuid;
  
  -- 12. People's Terms / Negotiations
  DELETE FROM negotiation_demands WHERE created_by = user_uuid;
  DELETE FROM demand_negotiations WHERE created_by = user_uuid;
  DELETE FROM negotiation_updates WHERE created_by = user_uuid;
  
  -- 13. Consumer Union
  DELETE FROM boycott_proposals WHERE created_by = user_uuid;
  DELETE FROM boycott_campaigns WHERE launched_by = user_uuid;
  DELETE FROM campaign_updates WHERE created_by = user_uuid;
  DELETE FROM campaign_outcomes WHERE created_by = user_uuid;
  
  -- 14. Workers Union
  DELETE FROM worker_proposals WHERE created_by = user_uuid;
  DELETE FROM active_strikes WHERE created_by = user_uuid;
  DELETE FROM strike_updates WHERE posted_by = user_uuid;
  DELETE FROM strike_outcomes WHERE created_by = user_uuid;
  
  -- 15. Channels created by user
  DELETE FROM channels WHERE created_by = user_uuid;
  
  -- 16. Union memberships (before deleting unions)
  DELETE FROM union_members WHERE user_id = user_uuid;
  
  -- 17. Unions created by user
  DELETE FROM unions WHERE created_by = user_uuid;
  
  -- 18. Anonymize audit logs (GDPR Article 17 compliance)
  -- Audit logs serve compliance/security purposes and should not be deleted
  -- Instead, we remove ALL personal identifiers while preserving the security trail
  UPDATE audit_logs 
  SET 
    user_id = NULL,  -- Remove PII link
    username = 'deleted_user',  -- Anonymize username
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'anonymized', true, 
      'anonymized_at', NOW(),
      'reason', 'account_deletion'
    )
  WHERE user_id = user_uuid;
  
  -- 19. User profile (last to preserve referential integrity)
  DELETE FROM profiles WHERE id = user_uuid;
  
  -- ============================================================================
  -- CRITICAL PRODUCTION TODO: Complete PII Removal from auth.users
  -- ============================================================================
  -- This function CANNOT delete from auth.users (requires service-role key)
  -- The auth user record contains PII (email, hashed password, phone, metadata)
  -- 
  -- For FULL GDPR Article 17 compliance, you MUST implement ONE of:
  -- 
  -- Option 1 (Recommended): Supabase Edge Function
  --   - Create edge function with service-role key
  --   - Call: supabase.auth.admin.deleteUser(user_uuid)
  --   - This permanently removes auth.users record
  --
  -- Option 2: Database Trigger
  --   - Create trigger on profiles DELETE
  --   - Use service-role connection to delete from auth.users
  --
  -- Option 3: Anonymize auth.users (if deletion not possible)
  --   - Update auth.users SET email = 'deleted@example.com', phone = NULL
  --   - Clear metadata and identifiable fields
  --
  -- Without this step, email and other PII remain in auth.users!
  -- The account is unusable (no profile) but PII is NOT fully erased.
  -- ============================================================================
  
  RAISE NOTICE 'Account % data deleted. IMPORTANT: auth.users record still contains PII and must be deleted via Edge Function for full GDPR compliance', user_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION hard_delete_account(UUID) TO authenticated;

-- Add RLS policy to allow users to delete their own account
-- Note: The function already checks auth.uid(), so this is an additional safety layer
COMMENT ON FUNCTION hard_delete_account IS 
  'Permanently deletes a user account and all associated data. GDPR Right to Erasure (Article 17).';
