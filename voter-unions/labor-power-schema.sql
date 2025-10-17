-- Labor Power: Educational content about labor practices and worker empowerment
-- Header Title: "Labor Power"
-- Purpose: Inform and empower workers by exposing corporate labor practices, promoting organization, and celebrating victories

-- ============================================================================
-- Table 1: Corporate Exploitation
-- Focus: Expose wage theft, unsafe conditions, union-busting tactics
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_exploitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  corporation_name VARCHAR(255) NOT NULL,
  exploitation_type VARCHAR(50) NOT NULL CHECK (exploitation_type IN ('wage_theft', 'unsafe_conditions', 'union_busting', 'misclassification', 'forced_overtime', 'retaliation', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  workers_affected INTEGER,
  industry VARCHAR(100),
  location VARCHAR(255), -- city, state, or region
  
  -- Legal/regulatory details
  osha_fines DECIMAL(15, 2), -- OSHA penalty amounts
  legal_case_number VARCHAR(100),
  case_status VARCHAR(50) CHECK (case_status IN ('investigation', 'filed', 'settled', 'verdict', 'appeal', 'closed')),
  settlement_amount DECIMAL(15, 2),
  
  violation_date DATE,
  sources TEXT[], -- evidence URLs, news articles
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

-- ============================================================================
-- Table 2: Organizing and Resistance
-- Focus: Union drives, strikes, grassroots organizing
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizing_resistance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('union_drive', 'strike', 'walkout', 'petition', 'protest', 'slowdown', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Location details
  corporation_name VARCHAR(255) NOT NULL,
  workplace_location VARCHAR(255), -- specific workplace
  city VARCHAR(100),
  state VARCHAR(50),
  industry VARCHAR(100),
  
  -- Campaign details
  workers_involved INTEGER,
  union_affiliation VARCHAR(255), -- union name if applicable
  key_demands TEXT[],
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('organizing', 'active', 'victory', 'partial_victory', 'defeated', 'ongoing')),
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Support info
  how_to_support TEXT, -- ways people can help
  donation_link TEXT,
  contact_info TEXT,
  sources TEXT[], -- campaign updates, news
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  support_pledges INTEGER DEFAULT 0
);

-- ============================================================================
-- Table 3: Worker Rights and Legislation
-- Focus: Current/upcoming laws affecting labor rights
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_rights_legislation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  legislation_type VARCHAR(50) NOT NULL CHECK (legislation_type IN ('federal_bill', 'state_bill', 'local_ordinance', 'regulation', 'court_ruling', 'executive_order', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Legislative details
  bill_number VARCHAR(100), -- e.g., "H.R. 123", "S.B. 456"
  jurisdiction VARCHAR(100), -- federal, state name, city
  status VARCHAR(50) NOT NULL CHECK (status IN ('proposed', 'committee', 'floor_vote', 'passed', 'signed', 'enacted', 'defeated', 'stalled')),
  
  -- Impact analysis
  rights_affected TEXT[], -- what rights this impacts
  workers_affected_count INTEGER, -- estimated number of workers
  industries_affected TEXT[],
  pro_labor BOOLEAN NOT NULL, -- true if pro-worker, false if anti-worker
  
  -- Key provisions
  key_provisions TEXT NOT NULL,
  potential_impact TEXT, -- what this would change
  opposition_arguments TEXT,
  support_arguments TEXT,
  
  -- Dates
  introduced_date DATE,
  vote_date DATE,
  effective_date DATE,
  
  sources TEXT[], -- bill text, analysis, news
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0
);

-- ============================================================================
-- Table 4: Solidarity and Victories
-- Focus: Celebrate worker successes and cross-movement collaboration
-- ============================================================================

CREATE TABLE IF NOT EXISTS solidarity_victories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  victory_type VARCHAR(50) NOT NULL CHECK (victory_type IN ('contract_win', 'union_recognition', 'wage_increase', 'safety_improvement', 'legislation_passed', 'strike_victory', 'coalition_formed', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Victory details
  corporation_name VARCHAR(255),
  union_affiliation VARCHAR(255),
  industry VARCHAR(100),
  location VARCHAR(255),
  workers_affected INTEGER,
  
  -- Specific achievements
  wage_increase_percent DECIMAL(5, 2),
  wage_increase_amount DECIMAL(10, 2), -- dollar amount per hour/year
  new_benefits TEXT[], -- list of new benefits won
  new_policies TEXT[], -- workplace policies changed
  contract_duration_years INTEGER,
  
  -- Cross-movement solidarity
  allied_organizations TEXT[], -- other groups involved
  solidarity_actions TEXT[], -- how others supported
  lessons_learned TEXT, -- strategic insights for other campaigns
  
  victory_date DATE NOT NULL,
  sources TEXT[], -- news coverage, official announcements
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  celebration_count INTEGER DEFAULT 0 -- users who celebrated this win
);

-- ============================================================================
-- User Interaction Tables
-- ============================================================================

-- Support pledges for organizing campaigns
CREATE TABLE IF NOT EXISTS organizing_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES organizing_resistance(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  support_type VARCHAR(50) NOT NULL CHECK (support_type IN ('pledge_support', 'donated', 'shared', 'attended', 'volunteered', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(campaign_id, user_id, support_type)
);

-- Victory celebrations
CREATE TABLE IF NOT EXISTS victory_celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  victory_id UUID NOT NULL REFERENCES solidarity_victories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT, -- optional celebration message
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(victory_id, user_id)
);

-- User bookmarks for all labor power content
CREATE TABLE IF NOT EXISTS labor_power_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('exploitation', 'organizing', 'legislation', 'victory')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(user_id, content_type, content_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX idx_exploitation_corporation ON corporate_exploitation(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_exploitation_type ON corporate_exploitation(exploitation_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_exploitation_industry ON corporate_exploitation(industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_exploitation_created ON corporate_exploitation(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_organizing_corporation ON organizing_resistance(corporation_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizing_status ON organizing_resistance(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizing_industry ON organizing_resistance(industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizing_location ON organizing_resistance(city, state) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizing_created ON organizing_resistance(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_legislation_jurisdiction ON worker_rights_legislation(jurisdiction) WHERE deleted_at IS NULL;
CREATE INDEX idx_legislation_status ON worker_rights_legislation(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_legislation_pro_labor ON worker_rights_legislation(pro_labor) WHERE deleted_at IS NULL;
CREATE INDEX idx_legislation_created ON worker_rights_legislation(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_victories_industry ON solidarity_victories(industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_victories_date ON solidarity_victories(victory_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_victories_created ON solidarity_victories(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_organizing_support_campaign ON organizing_support(campaign_id);
CREATE INDEX idx_organizing_support_user ON organizing_support(user_id);

CREATE INDEX idx_victory_celebrations_victory ON victory_celebrations(victory_id);
CREATE INDEX idx_victory_celebrations_user ON victory_celebrations(user_id);

CREATE INDEX idx_labor_bookmarks_user ON labor_power_bookmarks(user_id);
CREATE INDEX idx_labor_bookmarks_content ON labor_power_bookmarks(content_type, content_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE corporate_exploitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizing_resistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_rights_legislation ENABLE ROW LEVEL SECURITY;
ALTER TABLE solidarity_victories ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizing_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE victory_celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_power_bookmarks ENABLE ROW LEVEL SECURITY;

-- Corporate Exploitation Policies
CREATE POLICY "Anyone can view non-deleted exploitation reports" ON corporate_exploitation
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create exploitation reports" ON corporate_exploitation
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their exploitation reports" ON corporate_exploitation
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Organizing Resistance Policies
CREATE POLICY "Anyone can view non-deleted organizing campaigns" ON organizing_resistance
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create organizing campaigns" ON organizing_resistance
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their organizing campaigns" ON organizing_resistance
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Worker Rights Legislation Policies
CREATE POLICY "Anyone can view non-deleted legislation" ON worker_rights_legislation
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create legislation posts" ON worker_rights_legislation
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their legislation posts" ON worker_rights_legislation
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Solidarity Victories Policies
CREATE POLICY "Anyone can view non-deleted victories" ON solidarity_victories
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create victory posts" ON solidarity_victories
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their victory posts" ON solidarity_victories
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Organizing Support Policies
CREATE POLICY "Users can view non-deleted organizing support" ON organizing_support
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can add their own support" ON organizing_support
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own support" ON organizing_support
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Victory Celebrations Policies
CREATE POLICY "Users can view non-deleted celebrations" ON victory_celebrations
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can add their own celebrations" ON victory_celebrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own celebrations" ON victory_celebrations
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Bookmark Policies
CREATE POLICY "Users can view their non-deleted bookmarks" ON labor_power_bookmarks
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create their own bookmarks" ON labor_power_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own bookmarks" ON labor_power_bookmarks
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- ============================================================================
-- Triggers for Updated At Timestamps
-- ============================================================================

CREATE TRIGGER update_corporate_exploitation_updated_at BEFORE UPDATE ON corporate_exploitation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizing_resistance_updated_at BEFORE UPDATE ON organizing_resistance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_rights_legislation_updated_at BEFORE UPDATE ON worker_rights_legislation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solidarity_victories_updated_at BEFORE UPDATE ON solidarity_victories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
