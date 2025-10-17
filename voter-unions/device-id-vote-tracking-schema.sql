-- Add Device ID Tracking to All Vote Tables
-- Purpose: Prevent duplicate votes from the same device
-- Device IDs are hashed for privacy

-- ============================================================================
-- Step 1: Add device_id columns to all vote tables (nullable initially)
-- ============================================================================

-- 1. Argument Votes (Debate System)
ALTER TABLE argument_votes 
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- 2. Post Reactions
ALTER TABLE post_reactions 
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- 3. Policy Votes (People's Agenda)
ALTER TABLE policy_votes 
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- 4. Demand Votes (People's Terms)
ALTER TABLE demand_votes 
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- 5. Boycott Votes (Consumer Union)
ALTER TABLE boycott_votes 
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- 6. Worker Votes (Workers Union)
ALTER TABLE worker_votes 
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- ============================================================================
-- Step 2: Update existing NULL device_ids to a system placeholder
-- This handles legacy votes before device tracking was implemented
-- ============================================================================

UPDATE argument_votes SET device_id = 'legacy-' || id::text WHERE device_id IS NULL;
UPDATE post_reactions SET device_id = 'legacy-' || id::text WHERE device_id IS NULL;
UPDATE policy_votes SET device_id = 'legacy-' || id::text WHERE device_id IS NULL;
UPDATE demand_votes SET device_id = 'legacy-' || id::text WHERE device_id IS NULL;
UPDATE boycott_votes SET device_id = 'legacy-' || id::text WHERE device_id IS NULL;
UPDATE worker_votes SET device_id = 'legacy-' || id::text WHERE device_id IS NULL;

-- ============================================================================
-- Step 3: Make device_id NOT NULL (enforces server-side requirement)
-- ============================================================================

ALTER TABLE argument_votes 
  ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE post_reactions 
  ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE policy_votes 
  ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE demand_votes 
  ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE boycott_votes 
  ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE worker_votes 
  ALTER COLUMN device_id SET NOT NULL;

-- ============================================================================
-- Step 4: Add unique constraints (now applies to ALL votes, not just non-NULL)
-- ============================================================================

-- Remove old partial indexes
DROP INDEX IF EXISTS idx_argument_votes_device_unique;
DROP INDEX IF EXISTS idx_post_reactions_device_unique;
DROP INDEX IF EXISTS idx_policy_votes_device_unique;
DROP INDEX IF EXISTS idx_demand_votes_device_unique;
DROP INDEX IF EXISTS idx_boycott_votes_device_unique;
DROP INDEX IF EXISTS idx_worker_votes_device_unique;

-- Add full unique constraints (enforces one vote per device per entity)
CREATE UNIQUE INDEX idx_argument_votes_device_unique 
  ON argument_votes(argument_id, device_id);

CREATE UNIQUE INDEX idx_post_reactions_device_unique 
  ON post_reactions(post_id, device_id);

CREATE UNIQUE INDEX idx_policy_votes_device_unique 
  ON policy_votes(policy_id, device_id);

CREATE UNIQUE INDEX idx_demand_votes_device_unique 
  ON demand_votes(demand_id, device_id);

CREATE UNIQUE INDEX idx_boycott_votes_device_unique 
  ON boycott_votes(proposal_id, device_id);

CREATE UNIQUE INDEX idx_worker_votes_device_unique 
  ON worker_votes(proposal_id, device_id);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Add indexes for device_id lookups (for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_argument_votes_device ON argument_votes(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_reactions_device ON post_reactions(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_votes_device ON policy_votes(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demand_votes_device ON demand_votes(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boycott_votes_device ON boycott_votes(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_worker_votes_device ON worker_votes(device_id) WHERE device_id IS NOT NULL;

-- ============================================================================
-- Helper Function: Check for Duplicate Device Vote
-- ============================================================================

-- Function to check if a device has already voted on an entity
CREATE OR REPLACE FUNCTION check_duplicate_device_vote(
  p_table_name TEXT,
  p_entity_column TEXT,
  p_entity_id UUID,
  p_device_id VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_query TEXT;
BEGIN
  -- Build dynamic query
  v_query := format(
    'SELECT COUNT(*) FROM %I WHERE %I = $1 AND device_id = $2',
    p_table_name,
    p_entity_column
  );
  
  -- Execute query
  EXECUTE v_query INTO v_count USING p_entity_id, p_device_id;
  
  -- Return true if duplicate exists
  RETURN v_count > 0;
END;
$$;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN argument_votes.device_id IS 'Hashed device identifier to prevent duplicate votes from same device';
COMMENT ON COLUMN post_reactions.device_id IS 'Hashed device identifier to prevent duplicate reactions from same device';
COMMENT ON COLUMN policy_votes.device_id IS 'Hashed device identifier to prevent duplicate votes from same device';
COMMENT ON COLUMN demand_votes.device_id IS 'Hashed device identifier to prevent duplicate votes from same device';
COMMENT ON COLUMN boycott_votes.device_id IS 'Hashed device identifier to prevent duplicate votes from same device';
COMMENT ON COLUMN worker_votes.device_id IS 'Hashed device identifier to prevent duplicate votes from same device';
