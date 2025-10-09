-- People's Terms / Negotiations Feature Database Schema
-- Tagline: "We set the terms — not the billionaires."

-- Main demands table (proposals that become ratified terms)
CREATE TABLE IF NOT EXISTS demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100), -- Healthcare, Housing, Labor, Environment, etc.
    status VARCHAR(50) DEFAULT 'draft', -- draft, voting, ratified, activated, rejected
    support_percentage DECIMAL(5,2) DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    vote_deadline TIMESTAMP,
    ratified_at TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    union_id UUID REFERENCES unions(id),
    source_links TEXT[], -- Array of supporting articles/reports
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Individual votes on demands
CREATE TABLE IF NOT EXISTS demand_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) NOT NULL, -- support, oppose, or 1-5 rating
    importance_rating INTEGER, -- Optional 1-5 rating
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(demand_id, user_id)
);

-- Comments and suggestions on demands
CREATE TABLE IF NOT EXISTS demand_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment', -- comment, endorsement, revision, merge_suggestion
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Active negotiations (activated demands)
CREATE TABLE IF NOT EXISTS demand_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
    target_type VARCHAR(50), -- politician, company, institution
    target_name VARCHAR(255) NOT NULL,
    target_description TEXT,
    pledge_count INTEGER DEFAULT 0,
    outcome_status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, bill_introduced, voted_down, under_review, passed, rejected
    union_id UUID REFERENCES unions(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Real-time updates on negotiations
CREATE TABLE IF NOT EXISTS negotiation_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID REFERENCES demand_negotiations(id) ON DELETE CASCADE,
    update_type VARCHAR(50), -- bill_introduced, voted_down, under_review, etc.
    update_text TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Union endorsements of ratified demands
CREATE TABLE IF NOT EXISTS demand_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
    union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(demand_id, union_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demands_category ON demands(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demands_union ON demands(union_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demand_votes_demand ON demand_votes(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_votes_user ON demand_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_demand_comments_demand ON demand_comments(demand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demand_negotiations_demand ON demand_negotiations(demand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demand_negotiations_union ON demand_negotiations(union_id) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_endorsements ENABLE ROW LEVEL SECURITY;

-- Demands policies
CREATE POLICY "Anyone can view non-deleted demands"
    ON demands FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create demands"
    ON demands FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their own demands"
    ON demands FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Creators can soft delete their own demands"
    ON demands FOR UPDATE
    USING (auth.uid() = created_by);

-- Demand votes policies
CREATE POLICY "Anyone can view votes"
    ON demand_votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can vote"
    ON demand_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
    ON demand_votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
    ON demand_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Demand comments policies
CREATE POLICY "Anyone can view non-deleted comments"
    ON demand_comments FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can comment"
    ON demand_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON demand_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own comments"
    ON demand_comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Demand negotiations policies
CREATE POLICY "Anyone can view non-deleted negotiations"
    ON demand_negotiations FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create negotiations"
    ON demand_negotiations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their negotiations"
    ON demand_negotiations FOR UPDATE
    USING (auth.uid() = created_by);

-- Negotiation updates policies
CREATE POLICY "Anyone can view negotiation updates"
    ON negotiation_updates FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create updates"
    ON negotiation_updates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Demand endorsements policies
CREATE POLICY "Anyone can view endorsements"
    ON demand_endorsements FOR SELECT
    USING (true);

CREATE POLICY "Union members can endorse on behalf of their union"
    ON demand_endorsements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM union_members 
            WHERE union_id = demand_endorsements.union_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Triggers to update vote counts (recalculates from aggregates for accuracy)
CREATE OR REPLACE FUNCTION update_demand_vote_count()
RETURNS TRIGGER AS $$
DECLARE
  v_demand_id UUID;
  v_votes_for INTEGER;
  v_votes_against INTEGER;
  v_total_votes INTEGER;
  v_support_percentage DECIMAL(5,2);
BEGIN
  -- Determine which demand_id to update
  IF TG_OP = 'DELETE' THEN
    v_demand_id := OLD.demand_id;
  ELSE
    v_demand_id := NEW.demand_id;
  END IF;

  -- Recalculate vote counts from scratch (prevents drift)
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'support'),
    COUNT(*) FILTER (WHERE vote_type = 'oppose'),
    COUNT(*)
  INTO v_votes_for, v_votes_against, v_total_votes
  FROM demand_votes
  WHERE demand_id = v_demand_id;

  -- Calculate support percentage
  IF (v_votes_for + v_votes_against) > 0 THEN
    v_support_percentage := ROUND((v_votes_for::DECIMAL / (v_votes_for + v_votes_against)) * 100, 2);
  ELSE
    v_support_percentage := 0;
  END IF;

  -- Update demand with fresh counts
  UPDATE demands
  SET votes_for = v_votes_for,
      votes_against = v_votes_against,
      total_votes = v_total_votes,
      support_percentage = v_support_percentage,
      updated_at = NOW()
  WHERE id = v_demand_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER demand_vote_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON demand_votes
FOR EACH ROW EXECUTE FUNCTION update_demand_vote_count();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demands_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER demands_updated_at_trigger
BEFORE UPDATE ON demands
FOR EACH ROW EXECUTE FUNCTION update_demands_timestamp();
