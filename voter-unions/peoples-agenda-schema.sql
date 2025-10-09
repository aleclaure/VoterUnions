-- People's Agenda Database Schema
-- Philosophy: "Different backgrounds, one struggle"
-- Purpose: Unite working class around shared demands through policy voting, 
--          platform drafting, wins tracking, and outreach campaigns

-- ====================
-- TABLE MODIFICATIONS
-- ====================

-- Extend policies table with voting and attribution
ALTER TABLE policies 
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS issue_area TEXT;

-- ====================
-- NEW TABLES
-- ====================

-- Policy votes table (Tab 1: Priorities)
-- Tracks upvote/downvote on policy priorities
CREATE TABLE IF NOT EXISTS policy_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id, user_id)
);

-- Platform sections table (Tab 2: Platform)
-- Collaborative drafting of "The People's Platform"
CREATE TABLE IF NOT EXISTS platform_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  issue_area TEXT NOT NULL, -- Healthcare, Housing, Labor, Education, etc.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Platform amendments table (Tab 2: Platform)
-- Users propose changes to platform sections, community votes
CREATE TABLE IF NOT EXISTS platform_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES platform_sections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proposed_text TEXT NOT NULL,
  rationale TEXT,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('proposed', 'accepted', 'rejected')) DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Amendment votes table (for tracking individual votes on amendments)
CREATE TABLE IF NOT EXISTS amendment_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amendment_id UUID REFERENCES platform_amendments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('for', 'against')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(amendment_id, user_id)
);

-- Reform wins table (Tab 3: Wins)
-- Track reforms gaining momentum locally/nationally
CREATE TABLE IF NOT EXISTS reform_wins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL, -- City, State, or "National"
  scope TEXT CHECK (scope IN ('local', 'state', 'national')) NOT NULL,
  status TEXT CHECK (status IN ('proposed', 'in_progress', 'passed', 'implemented')) NOT NULL,
  momentum_score INTEGER DEFAULT 0 CHECK (momentum_score >= 0 AND momentum_score <= 100),
  source_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ====================
-- INDEXES
-- ====================

-- Policy votes indexes
CREATE INDEX IF NOT EXISTS idx_policy_votes_policy_id ON policy_votes(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_votes_user_id ON policy_votes(user_id);

-- Platform sections indexes
CREATE INDEX IF NOT EXISTS idx_platform_sections_issue_area ON platform_sections(issue_area);
CREATE INDEX IF NOT EXISTS idx_platform_sections_order ON platform_sections(section_order);

-- Platform amendments indexes
CREATE INDEX IF NOT EXISTS idx_platform_amendments_section_id ON platform_amendments(section_id);
CREATE INDEX IF NOT EXISTS idx_platform_amendments_status ON platform_amendments(status);

-- Amendment votes indexes
CREATE INDEX IF NOT EXISTS idx_amendment_votes_amendment_id ON amendment_votes(amendment_id);
CREATE INDEX IF NOT EXISTS idx_amendment_votes_user_id ON amendment_votes(user_id);

-- Reform wins indexes
CREATE INDEX IF NOT EXISTS idx_reform_wins_scope ON reform_wins(scope);
CREATE INDEX IF NOT EXISTS idx_reform_wins_status ON reform_wins(status);
CREATE INDEX IF NOT EXISTS idx_reform_wins_location ON reform_wins(location);

-- Policies table indexes (for extended columns)
CREATE INDEX IF NOT EXISTS idx_policies_union_id ON policies(union_id);
CREATE INDEX IF NOT EXISTS idx_policies_vote_count ON policies(vote_count DESC);

-- ====================
-- TRIGGERS
-- ====================

-- Update policy vote_count when votes are added/removed
CREATE OR REPLACE FUNCTION update_policy_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE policies 
    SET vote_count = vote_count + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE -1 END
    WHERE id = NEW.policy_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE policies 
    SET vote_count = vote_count - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE -1 END
    WHERE id = OLD.policy_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    UPDATE policies 
    SET vote_count = vote_count + CASE WHEN NEW.vote_type = 'upvote' THEN 2 ELSE -2 END
    WHERE id = NEW.policy_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policy_vote_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON policy_votes
FOR EACH ROW EXECUTE FUNCTION update_policy_vote_count();

-- Update amendment vote counts when votes are added/removed
CREATE OR REPLACE FUNCTION update_amendment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE platform_amendments 
    SET votes_for = votes_for + CASE WHEN NEW.vote_type = 'for' THEN 1 ELSE 0 END,
        votes_against = votes_against + CASE WHEN NEW.vote_type = 'against' THEN 1 ELSE 0 END
    WHERE id = NEW.amendment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE platform_amendments 
    SET votes_for = votes_for - CASE WHEN OLD.vote_type = 'for' THEN 1 ELSE 0 END,
        votes_against = votes_against - CASE WHEN OLD.vote_type = 'against' THEN 1 ELSE 0 END
    WHERE id = OLD.amendment_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    UPDATE platform_amendments 
    SET votes_for = votes_for + CASE WHEN NEW.vote_type = 'for' THEN 1 WHEN OLD.vote_type = 'for' THEN -1 ELSE 0 END,
        votes_against = votes_against + CASE WHEN NEW.vote_type = 'against' THEN 1 WHEN OLD.vote_type = 'against' THEN -1 ELSE 0 END
    WHERE id = NEW.amendment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER amendment_vote_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON amendment_votes
FOR EACH ROW EXECUTE FUNCTION update_amendment_vote_count();

-- Update platform_sections updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_section_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_section_timestamp_trigger
BEFORE UPDATE ON platform_sections
FOR EACH ROW EXECUTE FUNCTION update_platform_section_timestamp();

-- Update reform_wins updated_at timestamp
CREATE OR REPLACE FUNCTION update_reform_win_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reform_win_timestamp_trigger
BEFORE UPDATE ON reform_wins
FOR EACH ROW EXECUTE FUNCTION update_reform_win_timestamp();

-- ====================
-- ROW LEVEL SECURITY
-- ====================

-- Enable RLS
ALTER TABLE policy_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE amendment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reform_wins ENABLE ROW LEVEL SECURITY;

-- Policy votes policies
DROP POLICY IF EXISTS "Users can view all policy votes" ON policy_votes;
CREATE POLICY "Users can view all policy votes" ON policy_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own votes" ON policy_votes;
CREATE POLICY "Users can insert their own votes" ON policy_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON policy_votes;
CREATE POLICY "Users can update their own votes" ON policy_votes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON policy_votes;
CREATE POLICY "Users can delete their own votes" ON policy_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Platform sections policies
DROP POLICY IF EXISTS "Users can view all platform sections" ON platform_sections;
CREATE POLICY "Users can view all platform sections" ON platform_sections
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can create sections" ON platform_sections;
CREATE POLICY "Authenticated users can create sections" ON platform_sections
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own sections" ON platform_sections;
CREATE POLICY "Users can update their own sections" ON platform_sections
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can soft delete their own sections" ON platform_sections;
CREATE POLICY "Users can soft delete their own sections" ON platform_sections
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (deleted_at IS NOT NULL);

-- Platform amendments policies
DROP POLICY IF EXISTS "Users can view all amendments" ON platform_amendments;
CREATE POLICY "Users can view all amendments" ON platform_amendments
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can propose amendments" ON platform_amendments;
CREATE POLICY "Authenticated users can propose amendments" ON platform_amendments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own amendments" ON platform_amendments;
CREATE POLICY "Users can update their own amendments" ON platform_amendments
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can soft delete their own amendments" ON platform_amendments;
CREATE POLICY "Users can soft delete their own amendments" ON platform_amendments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (deleted_at IS NOT NULL);

-- Amendment votes policies
DROP POLICY IF EXISTS "Users can view all amendment votes" ON amendment_votes;
CREATE POLICY "Users can view all amendment votes" ON amendment_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own amendment votes" ON amendment_votes;
CREATE POLICY "Users can insert their own amendment votes" ON amendment_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own amendment votes" ON amendment_votes;
CREATE POLICY "Users can update their own amendment votes" ON amendment_votes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own amendment votes" ON amendment_votes;
CREATE POLICY "Users can delete their own amendment votes" ON amendment_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Reform wins policies
DROP POLICY IF EXISTS "Users can view all reform wins" ON reform_wins;
CREATE POLICY "Users can view all reform wins" ON reform_wins
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can add wins" ON reform_wins;
CREATE POLICY "Authenticated users can add wins" ON reform_wins
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own wins" ON reform_wins;
CREATE POLICY "Users can update their own wins" ON reform_wins
  FOR UPDATE USING (auth.uid() = created_by AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can soft delete their own wins" ON reform_wins;
CREATE POLICY "Users can soft delete their own wins" ON reform_wins
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (deleted_at IS NOT NULL);
