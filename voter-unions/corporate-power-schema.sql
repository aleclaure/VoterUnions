-- Ensure extensions (no-op if already installed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_influence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  influence_type VARCHAR(50) NOT NULL CHECK (influence_type IN ('lobbying', 'campaign_donations', 'revolving_door', 'regulatory_capture', 'think_tank', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount_spent DECIMAL(15, 2),
  year INTEGER,
  politicians_involved TEXT[],
  agencies_involved TEXT[],
  sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS consumer_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  impact_type VARCHAR(50) NOT NULL CHECK (impact_type IN ('price_fixing', 'monopoly', 'junk_fees', 'deceptive_pricing', 'inflation_profiteering', 'quality_reduction', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price_increase_percent DECIMAL(5, 2),
  affected_products TEXT[],
  geographic_scope VARCHAR(100),
  sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS worker_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  impact_type VARCHAR(50) NOT NULL CHECK (impact_type IN ('wage_theft', 'unsafe_conditions', 'underpayment', 'no_benefits', 'union_busting', 'discrimination', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  workers_affected INTEGER,
  industry VARCHAR(100),
  violation_details TEXT,
  legal_case_number VARCHAR(100),
  fine_amount DECIMAL(15, 2),
  sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS corporate_accountability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('boycott', 'petition', 'shareholder_action', 'legal_action', 'public_pressure', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  goal TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'victory', 'partial_victory', 'ongoing', 'closed')),
  start_date DATE NOT NULL,
  end_date DATE,
  participants_count INTEGER DEFAULT 0,
  petition_signatures INTEGER DEFAULT 0,
  funds_raised DECIMAL(15, 2) DEFAULT 0,
  demands TEXT[],
  concessions_won TEXT[],
  next_steps TEXT,
  sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accountability_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES corporate_accountability(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  participation_type VARCHAR(50) NOT NULL CHECK (participation_type IN ('joined_boycott', 'signed_petition', 'donated', 'shared', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(campaign_id, user_id, participation_type)
);

CREATE TABLE IF NOT EXISTS corporate_power_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('influence', 'consumer_impact', 'worker_impact', 'accountability')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, content_type, content_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_corporate_influence_corporation ON corporate_influence(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corporate_influence_type ON corporate_influence(influence_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corporate_influence_created ON corporate_influence(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consumer_impact_corporation ON consumer_impact(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consumer_impact_type ON consumer_impact(impact_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consumer_impact_created ON consumer_impact(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_worker_impact_corporation ON worker_impact(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_impact_type ON worker_impact(impact_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_impact_industry ON worker_impact(industry) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_impact_created ON worker_impact(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accountability_corporation ON corporate_accountability(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accountability_status ON corporate_accountability(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accountability_created ON corporate_accountability(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accountability_participation_campaign ON accountability_participation(campaign_id);
CREATE INDEX IF NOT EXISTS idx_accountability_participation_user ON accountability_participation(user_id);

CREATE INDEX IF NOT EXISTS idx_corporate_bookmarks_user ON corporate_power_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_bookmarks_content ON corporate_power_bookmarks(content_type, content_id);

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE corporate_influence ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_accountability ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_power_bookmarks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Corporate Influence Policies
CREATE POLICY "Anyone can view non-deleted corporate influence" ON corporate_influence
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create corporate influence" ON corporate_influence
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creators can update their corporate influence" ON corporate_influence
  FOR UPDATE USING ((SELECT auth.uid()) = created_by AND deleted_at IS NULL);

-- Consumer Impact Policies
CREATE POLICY "Anyone can view non-deleted consumer impact" ON consumer_impact
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create consumer impact" ON consumer_impact
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creators can update their consumer impact" ON consumer_impact
  FOR UPDATE USING ((SELECT auth.uid()) = created_by AND deleted_at IS NULL);

-- Worker Impact Policies
CREATE POLICY "Anyone can view non-deleted worker impact" ON worker_impact
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create worker impact" ON worker_impact
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creators can update their worker impact" ON worker_impact
  FOR UPDATE USING ((SELECT auth.uid()) = created_by AND deleted_at IS NULL);

-- Corporate Accountability Policies
CREATE POLICY "Anyone can view non-deleted accountability campaigns" ON corporate_accountability
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create accountability campaigns" ON corporate_accountability
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creators can update their accountability campaigns" ON corporate_accountability
  FOR UPDATE USING ((SELECT auth.uid()) = created_by AND deleted_at IS NULL);

-- Participation Policies
CREATE POLICY "Users can view non-deleted participation" ON accountability_participation
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can add their own participation" ON accountability_participation
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can soft delete their own participation" ON accountability_participation
  FOR UPDATE USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

-- Bookmark Policies
CREATE POLICY "Users can view their non-deleted bookmarks" ON corporate_power_bookmarks
  FOR SELECT USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create their own bookmarks" ON corporate_power_bookmarks
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can soft delete their own bookmarks" ON corporate_power_bookmarks
  FOR UPDATE USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

-- ============================================================================
-- Triggers for updated_at timestamps (created after function exists)
-- ============================================================================

-- Attach trigger to corporate_influence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_update_corporate_influence_updated_at'
      AND c.relname = 'corporate_influence'
  ) THEN
    CREATE TRIGGER trg_update_corporate_influence_updated_at
      BEFORE UPDATE ON corporate_influence
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_update_consumer_impact_updated_at'
      AND c.relname = 'consumer_impact'
  ) THEN
    CREATE TRIGGER trg_update_consumer_impact_updated_at
      BEFORE UPDATE ON consumer_impact
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_update_worker_impact_updated_at'
      AND c.relname = 'worker_impact'
  ) THEN
    CREATE TRIGGER trg_update_worker_impact_updated_at
      BEFORE UPDATE ON worker_impact
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_update_corporate_accountability_updated_at'
      AND c.relname = 'corporate_accountability'
  ) THEN
    CREATE TRIGGER trg_update_corporate_accountability_updated_at
      BEFORE UPDATE ON corporate_accountability
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
