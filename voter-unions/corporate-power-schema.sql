-- Corporate Power: Educational content about corporate influence and impact
-- Header Title: "Corporate Power"
-- Purpose: Educate users about how large corporations affect consumers, workers, and the economy

-- ============================================================================
-- Table 1: Corporate Influence
-- Focus: How corporations influence politics through lobbying, donations, connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_influence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  influence_type VARCHAR(50) NOT NULL CHECK (influence_type IN ('lobbying', 'campaign_donations', 'revolving_door', 'regulatory_capture', 'think_tank', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount_spent DECIMAL(15, 2), -- lobbying/donation amount in dollars
  year INTEGER,
  politicians_involved TEXT[], -- array of politician names
  agencies_involved TEXT[], -- regulatory agencies
  sources TEXT[], -- URLs to evidence/documentation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

-- ============================================================================
-- Table 2: Consumer Impact
-- Focus: How corporate practices affect consumers (prices, quality of life)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consumer_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  impact_type VARCHAR(50) NOT NULL CHECK (impact_type IN ('price_fixing', 'monopoly', 'junk_fees', 'deceptive_pricing', 'inflation_profiteering', 'quality_reduction', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price_increase_percent DECIMAL(5, 2), -- percentage increase
  affected_products TEXT[], -- list of products/services
  geographic_scope VARCHAR(100), -- national, regional, state, etc.
  sources TEXT[], -- evidence URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

-- ============================================================================
-- Table 3: Worker Impact
-- Focus: Connection between consumer spending and worker conditions
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  impact_type VARCHAR(50) NOT NULL CHECK (impact_type IN ('wage_theft', 'unsafe_conditions', 'underpayment', 'no_benefits', 'union_busting', 'discrimination', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  workers_affected INTEGER, -- number of workers
  industry VARCHAR(100),
  violation_details TEXT,
  legal_case_number VARCHAR(100), -- if applicable
  fine_amount DECIMAL(15, 2), -- OSHA or legal fines
  sources TEXT[], -- evidence URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

-- ============================================================================
-- Table 4: Corporate Accountability
-- Focus: Campaigns and actions to hold corporations accountable
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_accountability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('boycott', 'petition', 'shareholder_action', 'legal_action', 'public_pressure', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  goal TEXT NOT NULL, -- what the campaign aims to achieve
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'victory', 'partial_victory', 'ongoing', 'closed')),
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Campaign metrics
  participants_count INTEGER DEFAULT 0,
  petition_signatures INTEGER DEFAULT 0,
  funds_raised DECIMAL(15, 2) DEFAULT 0,
  
  -- Progress tracking
  demands TEXT[], -- list of demands
  concessions_won TEXT[], -- what has been achieved
  next_steps TEXT,
  sources TEXT[], -- campaign links, news coverage
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

-- ============================================================================
-- User Participation Tables
-- ============================================================================

-- Track user participation in accountability campaigns
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

-- User bookmarks for all corporate power content
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

CREATE INDEX idx_corporate_influence_corporation ON corporate_influence(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_corporate_influence_type ON corporate_influence(influence_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_corporate_influence_created ON corporate_influence(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_consumer_impact_corporation ON consumer_impact(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_consumer_impact_type ON consumer_impact(impact_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_consumer_impact_created ON consumer_impact(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_worker_impact_corporation ON worker_impact(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_impact_type ON worker_impact(impact_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_impact_industry ON worker_impact(industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_impact_created ON worker_impact(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_accountability_corporation ON corporate_accountability(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_accountability_status ON corporate_accountability(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_accountability_created ON corporate_accountability(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_accountability_participation_campaign ON accountability_participation(campaign_id);
CREATE INDEX idx_accountability_participation_user ON accountability_participation(user_id);

CREATE INDEX idx_corporate_bookmarks_user ON corporate_power_bookmarks(user_id);
CREATE INDEX idx_corporate_bookmarks_content ON corporate_power_bookmarks(content_type, content_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE corporate_influence ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_accountability ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_power_bookmarks ENABLE ROW LEVEL SECURITY;

-- Corporate Influence Policies
CREATE POLICY "Anyone can view non-deleted corporate influence" ON corporate_influence
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create corporate influence" ON corporate_influence
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their corporate influence" ON corporate_influence
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

CREATE POLICY "Creators can soft delete their corporate influence" ON corporate_influence
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Consumer Impact Policies
CREATE POLICY "Anyone can view non-deleted consumer impact" ON consumer_impact
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create consumer impact" ON consumer_impact
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their consumer impact" ON consumer_impact
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Worker Impact Policies
CREATE POLICY "Anyone can view non-deleted worker impact" ON worker_impact
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create worker impact" ON worker_impact
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their worker impact" ON worker_impact
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Corporate Accountability Policies
CREATE POLICY "Anyone can view non-deleted accountability campaigns" ON corporate_accountability
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create accountability campaigns" ON corporate_accountability
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their accountability campaigns" ON corporate_accountability
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Participation Policies
CREATE POLICY "Users can view non-deleted participation" ON accountability_participation
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can add their own participation" ON accountability_participation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own participation" ON accountability_participation
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Bookmark Policies
CREATE POLICY "Users can view their non-deleted bookmarks" ON corporate_power_bookmarks
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create their own bookmarks" ON corporate_power_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own bookmarks" ON corporate_power_bookmarks
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- ============================================================================
-- Triggers for Updated At Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corporate_influence_updated_at BEFORE UPDATE ON corporate_influence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consumer_impact_updated_at BEFORE UPDATE ON consumer_impact
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_impact_updated_at BEFORE UPDATE ON worker_impact
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporate_accountability_updated_at BEFORE UPDATE ON corporate_accountability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
