-- Consumer Union Schema: Organize consumer power for economic justice
-- "Our money has power — we spend for justice."

-- Boycott proposals (Tab 1: Consumer Proposals)
CREATE TABLE IF NOT EXISTS boycott_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    target_company VARCHAR(255) NOT NULL,
    target_industry VARCHAR(100),
    demand_summary TEXT NOT NULL,
    evidence TEXT,
    proposed_alternatives TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, in_voting, approved, rejected
    vote_count INTEGER DEFAULT 0,
    votes_activate INTEGER DEFAULT 0,
    votes_delay INTEGER DEFAULT 0,
    votes_reject INTEGER DEFAULT 0,
    activation_percentage DECIMAL(5,2) DEFAULT 0,
    union_id UUID REFERENCES unions(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Votes on boycott proposals (Tab 2: Vote & Launch)
CREATE TABLE IF NOT EXISTS boycott_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES boycott_proposals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    vote_type VARCHAR(20) NOT NULL, -- activate, delay, reject
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(proposal_id, user_id)
);

-- Comments on boycott proposals
CREATE TABLE IF NOT EXISTS boycott_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES boycott_proposals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Active boycott campaigns (Tab 3: Active Boycotts)
CREATE TABLE IF NOT EXISTS boycott_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES boycott_proposals(id),
    title VARCHAR(255) NOT NULL,
    target_company VARCHAR(255) NOT NULL,
    target_industry VARCHAR(100),
    demands TEXT NOT NULL,
    consumer_actions TEXT, -- suggested actions: unsubscribe, cancel, switch
    status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
    progress_percentage INTEGER DEFAULT 0,
    pledge_count INTEGER DEFAULT 0,
    economic_impact_estimate DECIMAL(15,2),
    union_id UUID REFERENCES unions(id),
    launched_by UUID REFERENCES profiles(id),
    launched_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- User pledges to participate in boycotts
CREATE TABLE IF NOT EXISTS campaign_pledges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES boycott_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    pledge_type VARCHAR(50) DEFAULT 'participate', -- participate, share, monitor
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, user_id)
);

-- Campaign updates and company responses (Tab 3 & 4)
CREATE TABLE IF NOT EXISTS campaign_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES boycott_campaigns(id) ON DELETE CASCADE,
    update_type VARCHAR(50), -- company_response, media_coverage, demand_met, progress_update
    content TEXT NOT NULL,
    source_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Completed campaigns and outcomes (Tab 4: Impact & Wins)
CREATE TABLE IF NOT EXISTS campaign_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES boycott_campaigns(id) ON DELETE CASCADE,
    outcome_type VARCHAR(50), -- victory, partial_victory, cancelled, ongoing_monitoring
    outcome_description TEXT NOT NULL,
    total_participants INTEGER,
    economic_impact DECIMAL(15,2),
    company_statements TEXT,
    monitoring_plan TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_boycott_proposals_status ON boycott_proposals(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boycott_proposals_union ON boycott_proposals(union_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boycott_votes_proposal ON boycott_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_boycott_votes_user ON boycott_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_boycott_comments_proposal ON boycott_comments(proposal_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boycott_campaigns_status ON boycott_campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boycott_campaigns_union ON boycott_campaigns(union_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_pledges_campaign ON campaign_pledges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign ON campaign_updates(campaign_id);

-- RLS Policies
ALTER TABLE boycott_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE boycott_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE boycott_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE boycott_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_outcomes ENABLE ROW LEVEL SECURITY;

-- Boycott proposals policies
CREATE POLICY "Anyone can view non-deleted proposals"
    ON boycott_proposals FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create proposals"
    ON boycott_proposals FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their own proposals"
    ON boycott_proposals FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Creators can soft delete their own proposals"
    ON boycott_proposals FOR UPDATE
    USING (auth.uid() = created_by);

-- Boycott votes policies
CREATE POLICY "Anyone can view votes"
    ON boycott_votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can vote"
    ON boycott_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
    ON boycott_votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
    ON boycott_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Boycott comments policies
CREATE POLICY "Anyone can view non-deleted comments"
    ON boycott_comments FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can comment"
    ON boycott_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON boycott_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own comments"
    ON boycott_comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Boycott campaigns policies
CREATE POLICY "Anyone can view non-deleted campaigns"
    ON boycott_campaigns FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can launch campaigns with 60% activation"
    ON boycott_campaigns FOR INSERT
    WITH CHECK (
        auth.uid() = launched_by 
        AND proposal_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM boycott_proposals 
            WHERE id = boycott_campaigns.proposal_id 
            AND activation_percentage >= 60
        )
    );

CREATE POLICY "Launchers can update their campaigns"
    ON boycott_campaigns FOR UPDATE
    USING (auth.uid() = launched_by)
    WITH CHECK (
        proposal_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM boycott_proposals 
            WHERE id = boycott_campaigns.proposal_id 
            AND activation_percentage >= 60
        )
    );

-- Campaign pledges policies
CREATE POLICY "Anyone can view pledges"
    ON campaign_pledges FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can pledge"
    ON campaign_pledges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pledges"
    ON campaign_pledges FOR DELETE
    USING (auth.uid() = user_id);

-- Campaign updates policies
CREATE POLICY "Anyone can view campaign updates"
    ON campaign_updates FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create updates"
    ON campaign_updates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Campaign outcomes policies
CREATE POLICY "Anyone can view outcomes"
    ON campaign_outcomes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can record outcomes"
    ON campaign_outcomes FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Protect vote fields from manual manipulation
-- Block any direct user updates to vote-related fields
CREATE OR REPLACE FUNCTION protect_boycott_proposal_vote_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Block any attempt to modify vote fields directly (NULL-safe comparison)
  -- These can only be changed by the vote count trigger
  IF (NEW.vote_count IS DISTINCT FROM OLD.vote_count 
      OR NEW.votes_activate IS DISTINCT FROM OLD.votes_activate 
      OR NEW.votes_delay IS DISTINCT FROM OLD.votes_delay 
      OR NEW.votes_reject IS DISTINCT FROM OLD.votes_reject 
      OR NEW.activation_percentage IS DISTINCT FROM OLD.activation_percentage) THEN
    
    -- Allow only if triggered from our vote count trigger (marked by trigger depth)
    IF pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION 'Vote counts and activation percentage can only be updated by the system';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_vote_fields_trigger
BEFORE UPDATE ON boycott_proposals
FOR EACH ROW EXECUTE FUNCTION protect_boycott_proposal_vote_fields();

-- Force vote fields to defaults on INSERT (prevent forged initial values)
CREATE OR REPLACE FUNCTION force_boycott_proposal_vote_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Always reset vote fields to defaults on INSERT regardless of user input
  NEW.vote_count := 0;
  NEW.votes_activate := 0;
  NEW.votes_delay := 0;
  NEW.votes_reject := 0;
  NEW.activation_percentage := 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER force_vote_defaults_trigger
BEFORE INSERT ON boycott_proposals
FOR EACH ROW EXECUTE FUNCTION force_boycott_proposal_vote_defaults();

-- Triggers to update vote counts (recalculates from aggregates for accuracy)
CREATE OR REPLACE FUNCTION update_boycott_vote_count()
RETURNS TRIGGER AS $$
DECLARE
  v_proposal_id UUID;
  v_votes_activate INTEGER;
  v_votes_delay INTEGER;
  v_votes_reject INTEGER;
  v_vote_count INTEGER;
  v_activation_percentage DECIMAL(5,2);
BEGIN
  -- Determine which proposal_id to update
  IF TG_OP = 'DELETE' THEN
    v_proposal_id := OLD.proposal_id;
  ELSE
    v_proposal_id := NEW.proposal_id;
  END IF;

  -- Recalculate vote counts from scratch (prevents drift)
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'activate'),
    COUNT(*) FILTER (WHERE vote_type = 'delay'),
    COUNT(*) FILTER (WHERE vote_type = 'reject'),
    COUNT(*)
  INTO v_votes_activate, v_votes_delay, v_votes_reject, v_vote_count
  FROM boycott_votes
  WHERE proposal_id = v_proposal_id;

  -- Calculate activation percentage (activate votes / total votes)
  IF v_vote_count > 0 THEN
    v_activation_percentage := ROUND((v_votes_activate::DECIMAL / v_vote_count) * 100, 2);
  ELSE
    v_activation_percentage := 0;
  END IF;

  -- Update proposal with fresh counts (trigger depth will be > 1, bypassing protection)
  UPDATE boycott_proposals
  SET votes_activate = v_votes_activate,
      votes_delay = v_votes_delay,
      votes_reject = v_votes_reject,
      vote_count = v_vote_count,
      activation_percentage = v_activation_percentage,
      updated_at = NOW()
  WHERE id = v_proposal_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boycott_vote_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON boycott_votes
FOR EACH ROW EXECUTE FUNCTION update_boycott_vote_count();

-- Trigger to update campaign pledge count
CREATE OR REPLACE FUNCTION update_campaign_pledge_count()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_pledge_count INTEGER;
BEGIN
  -- Determine which campaign_id to update
  IF TG_OP = 'DELETE' THEN
    v_campaign_id := OLD.campaign_id;
  ELSE
    v_campaign_id := NEW.campaign_id;
  END IF;

  -- Recalculate pledge count from scratch
  SELECT COUNT(*)
  INTO v_pledge_count
  FROM campaign_pledges
  WHERE campaign_id = v_campaign_id;

  -- Update campaign with fresh count
  UPDATE boycott_campaigns
  SET pledge_count = v_pledge_count,
      updated_at = NOW()
  WHERE id = v_campaign_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_pledge_count_trigger
AFTER INSERT OR DELETE ON campaign_pledges
FOR EACH ROW EXECUTE FUNCTION update_campaign_pledge_count();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_boycott_proposals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boycott_proposals_updated_at_trigger
BEFORE UPDATE ON boycott_proposals
FOR EACH ROW EXECUTE FUNCTION update_boycott_proposals_timestamp();

CREATE OR REPLACE FUNCTION update_boycott_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boycott_campaigns_updated_at_trigger
BEFORE UPDATE ON boycott_campaigns
FOR EACH ROW EXECUTE FUNCTION update_boycott_campaigns_timestamp();
