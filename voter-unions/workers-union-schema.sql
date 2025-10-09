-- Workers Union Schema
-- Empowering workers to organize, propose strikes, and coordinate collective action
-- Tagline: "We make the economy run — and we can stop it too."

-- 1. Worker Proposals (Tab 1: Worker Proposals)
-- Workers submit workplace demands and strike proposals
CREATE TABLE IF NOT EXISTS worker_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Employer/Workplace Info
  employer_name TEXT NOT NULL,
  industry TEXT NOT NULL, -- e.g., "Retail", "Tech", "Healthcare"
  location TEXT NOT NULL, -- City, state, or region
  workplace_size TEXT, -- e.g., "50-100 workers", "500+ workers"
  
  -- Proposal Details
  title TEXT NOT NULL,
  demands TEXT NOT NULL, -- Main demands (fair pay, safety, union recognition)
  background TEXT, -- Context and current situation
  worker_testimonies TEXT[], -- Optional anonymous testimonies
  
  -- Vote Counts (protected by triggers - cannot be manually set)
  vote_count INTEGER NOT NULL DEFAULT 0,
  votes_strike_planning INTEGER NOT NULL DEFAULT 0,
  votes_file_petition INTEGER NOT NULL DEFAULT 0,
  votes_negotiate_first INTEGER NOT NULL DEFAULT 0,
  activation_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage voting for strike planning
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'voting', 'activated', 'resolved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. Worker Votes (Tab 2: Organize & Vote)
-- Democratic voting for labor actions
CREATE TABLE IF NOT EXISTS worker_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES worker_proposals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vote Options
  vote_type TEXT NOT NULL CHECK (vote_type IN ('strike_planning', 'file_petition', 'negotiate_first')),
  
  -- Worker Verification (optional - for authenticity)
  verified_workplace_email TEXT, -- Domain verification for workplace
  union_affiliation TEXT, -- Optional union membership
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One vote per user per proposal
  UNIQUE(proposal_id, voter_id)
);

-- 3. Active Strikes (Tab 3: Active Strikes)
-- Activated strikes that meet the threshold
CREATE TABLE IF NOT EXISTS active_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES worker_proposals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Strike Details
  strike_location TEXT NOT NULL,
  company_name TEXT NOT NULL,
  current_demands TEXT NOT NULL,
  negotiation_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    negotiation_status IN ('not_started', 'in_progress', 'stalled', 'resolved', 'victory', 'ended')
  ),
  
  -- Strike Coordination
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  coordinator_contact TEXT, -- Optional public contact
  
  -- Engagement Metrics
  pledge_count INTEGER NOT NULL DEFAULT 0,
  update_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Strike Pledges (Tab 3: Active Strikes)
-- Workers pledging to participate in strikes
CREATE TABLE IF NOT EXISTS strike_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strike_id UUID NOT NULL REFERENCES active_strikes(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pledge Details
  pledge_type TEXT NOT NULL CHECK (pledge_type IN ('participate', 'support', 'donate', 'spread_word')),
  anonymous BOOLEAN NOT NULL DEFAULT false,
  message TEXT, -- Optional solidarity message
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One pledge per user per strike
  UNIQUE(strike_id, worker_id)
);

-- 5. Strike Updates (Tab 3: Active Strikes)
-- Real-time updates on ongoing strikes
CREATE TABLE IF NOT EXISTS strike_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strike_id UUID NOT NULL REFERENCES active_strikes(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Update Content
  update_type TEXT NOT NULL CHECK (update_type IN ('news', 'photo', 'solidarity', 'negotiation', 'victory', 'setback')),
  content TEXT NOT NULL,
  media_urls TEXT[], -- Photos, videos from picket lines
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. Strike Outcomes (Tab 4: Outcomes & Solidarity)
-- Document victories and build cross-industry alliances
CREATE TABLE IF NOT EXISTS strike_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strike_id UUID NOT NULL REFERENCES active_strikes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Outcome Details
  result_type TEXT NOT NULL CHECK (result_type IN ('victory', 'partial_victory', 'ongoing', 'ended', 'defeated')),
  achievements TEXT NOT NULL, -- What was won (raises, policies, recognition)
  settlement_details TEXT, -- Specific terms
  
  -- Impact Metrics
  workers_affected INTEGER,
  pay_increase_percentage DECIMAL(5,2),
  new_policies TEXT[],
  
  -- Solidarity Building
  cross_industry_alliances TEXT[], -- Allied industries/unions
  lessons_learned TEXT,
  strategy_notes TEXT, -- What worked, what didn't
  
  -- Metadata
  outcome_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_proposals_industry ON worker_proposals(industry) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_proposals_status ON worker_proposals(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_proposals_created_by ON worker_proposals(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_votes_proposal ON worker_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_worker_votes_voter ON worker_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_active_strikes_proposal ON active_strikes(proposal_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_active_strikes_status ON active_strikes(negotiation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_strike_pledges_strike ON strike_pledges(strike_id);
CREATE INDEX IF NOT EXISTS idx_strike_updates_strike ON strike_updates(strike_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_strike_outcomes_strike ON strike_outcomes(strike_id) WHERE deleted_at IS NULL;

-- Row Level Security (RLS) Policies

-- Worker Proposals
ALTER TABLE worker_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view worker proposals"
    ON worker_proposals FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create worker proposals"
    ON worker_proposals FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their proposals"
    ON worker_proposals FOR UPDATE
    USING (auth.uid() = created_by AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = created_by AND deleted_at IS NULL);

CREATE POLICY "Creators can soft delete their proposals"
    ON worker_proposals FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Worker Votes
ALTER TABLE worker_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view worker votes"
    ON worker_votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can cast votes"
    ON worker_votes FOR INSERT
    WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can update their own votes"
    ON worker_votes FOR UPDATE
    USING (auth.uid() = voter_id)
    WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can delete their own votes"
    ON worker_votes FOR DELETE
    USING (auth.uid() = voter_id);

-- Active Strikes
ALTER TABLE active_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active strikes"
    ON active_strikes FOR SELECT
    USING (deleted_at IS NULL);

-- Only allow strike creation if proposal meets threshold AND user is proposal creator
CREATE POLICY "Proposal creators can create strikes with threshold"
    ON active_strikes FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND proposal_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM worker_proposals
            WHERE id = proposal_id
            AND created_by = auth.uid()
            AND activation_percentage >= 60
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Creators can update strikes"
    ON active_strikes FOR UPDATE
    USING (auth.uid() = created_by AND deleted_at IS NULL)
    WITH CHECK (
        auth.uid() = created_by
        AND deleted_at IS NULL
        AND proposal_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM worker_proposals
            WHERE id = proposal_id
            AND created_by = auth.uid()
            AND activation_percentage >= 60
            AND deleted_at IS NULL
        )
    );

-- Strike Pledges
ALTER TABLE strike_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-anonymous pledges"
    ON strike_pledges FOR SELECT
    USING (anonymous = false OR auth.uid() = worker_id);

CREATE POLICY "Authenticated users can pledge"
    ON strike_pledges FOR INSERT
    WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Users can update their pledges"
    ON strike_pledges FOR UPDATE
    USING (auth.uid() = worker_id)
    WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Users can delete their pledges"
    ON strike_pledges FOR DELETE
    USING (auth.uid() = worker_id);

-- Strike Updates
ALTER TABLE strike_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view strike updates"
    ON strike_updates FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can post updates"
    ON strike_updates FOR INSERT
    WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Posters can update their updates"
    ON strike_updates FOR UPDATE
    USING (auth.uid() = posted_by AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = posted_by AND deleted_at IS NULL);

-- Strike Outcomes
ALTER TABLE strike_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view strike outcomes"
    ON strike_outcomes FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Strike creators can record outcomes"
    ON strike_outcomes FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM active_strikes
            WHERE id = strike_id
            AND created_by = auth.uid()
            AND deleted_at IS NULL
        )
    );

-- SECURITY TRIGGERS: Protect computed fields from manual manipulation

-- Force engagement counts to defaults on active_strikes INSERT
CREATE OR REPLACE FUNCTION force_strike_engagement_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Always reset engagement counts to defaults on INSERT
  NEW.pledge_count := 0;
  NEW.update_count := 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER force_engagement_defaults_trigger
BEFORE INSERT ON active_strikes
FOR EACH ROW EXECUTE FUNCTION force_strike_engagement_defaults();

-- Protect engagement counts from manual manipulation on UPDATE
CREATE OR REPLACE FUNCTION protect_strike_engagement_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Block manual updates to engagement counts (NULL-safe)
  IF (NEW.pledge_count IS DISTINCT FROM OLD.pledge_count 
      OR NEW.update_count IS DISTINCT FROM OLD.update_count) THEN
    
    -- Allow only if triggered from engagement count triggers
    IF pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION 'Engagement counts can only be updated by the system';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_engagement_fields_trigger
BEFORE UPDATE ON active_strikes
FOR EACH ROW EXECUTE FUNCTION protect_strike_engagement_fields();

-- SECURITY TRIGGERS: Protect vote fields from manual manipulation

-- Force vote fields to defaults on INSERT (prevent forged initial values)
CREATE OR REPLACE FUNCTION force_worker_proposal_vote_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Always reset vote fields to defaults on INSERT regardless of user input
  NEW.vote_count := 0;
  NEW.votes_strike_planning := 0;
  NEW.votes_file_petition := 0;
  NEW.votes_negotiate_first := 0;
  NEW.activation_percentage := 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER force_vote_defaults_trigger
BEFORE INSERT ON worker_proposals
FOR EACH ROW EXECUTE FUNCTION force_worker_proposal_vote_defaults();

-- Protect vote fields from manual manipulation on UPDATE
CREATE OR REPLACE FUNCTION protect_worker_proposal_vote_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Block any attempt to modify vote fields directly (NULL-safe comparison)
  -- These can only be changed by the vote count trigger
  IF (NEW.vote_count IS DISTINCT FROM OLD.vote_count 
      OR NEW.votes_strike_planning IS DISTINCT FROM OLD.votes_strike_planning 
      OR NEW.votes_file_petition IS DISTINCT FROM OLD.votes_file_petition 
      OR NEW.votes_negotiate_first IS DISTINCT FROM OLD.votes_negotiate_first 
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
BEFORE UPDATE ON worker_proposals
FOR EACH ROW EXECUTE FUNCTION protect_worker_proposal_vote_fields();

-- Vote Count Triggers (recalculate from aggregates for accuracy)
CREATE OR REPLACE FUNCTION update_worker_vote_count()
RETURNS TRIGGER AS $$
DECLARE
  v_proposal_id UUID;
  v_vote_count INTEGER;
  v_votes_strike_planning INTEGER;
  v_votes_file_petition INTEGER;
  v_votes_negotiate_first INTEGER;
  v_activation_percentage DECIMAL(5,2);
BEGIN
  -- Determine which proposal was affected
  IF TG_OP = 'DELETE' THEN
    v_proposal_id := OLD.proposal_id;
  ELSE
    v_proposal_id := NEW.proposal_id;
  END IF;
  
  -- Recalculate vote counts from aggregates
  SELECT 
    COUNT(*) AS total_votes,
    COUNT(*) FILTER (WHERE vote_type = 'strike_planning') AS strike_planning,
    COUNT(*) FILTER (WHERE vote_type = 'file_petition') AS file_petition,
    COUNT(*) FILTER (WHERE vote_type = 'negotiate_first') AS negotiate_first
  INTO 
    v_vote_count,
    v_votes_strike_planning,
    v_votes_file_petition,
    v_votes_negotiate_first
  FROM worker_votes
  WHERE proposal_id = v_proposal_id;
  
  -- Calculate activation percentage (strike planning votes / total votes * 100)
  IF v_vote_count > 0 THEN
    v_activation_percentage := ROUND((v_votes_strike_planning::DECIMAL / v_vote_count::DECIMAL) * 100, 2);
  ELSE
    v_activation_percentage := 0;
  END IF;
  
  -- Update proposal with fresh counts (trigger depth will be > 1, bypassing protection)
  UPDATE worker_proposals
  SET votes_strike_planning = v_votes_strike_planning,
      votes_file_petition = v_votes_file_petition,
      votes_negotiate_first = v_votes_negotiate_first,
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

CREATE TRIGGER update_worker_vote_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON worker_votes
FOR EACH ROW EXECUTE FUNCTION update_worker_vote_count();

-- Triggers to update engagement counts on active strikes
CREATE OR REPLACE FUNCTION update_strike_pledge_count()
RETURNS TRIGGER AS $$
DECLARE
  v_strike_id UUID;
  v_pledge_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_strike_id := OLD.strike_id;
  ELSE
    v_strike_id := NEW.strike_id;
  END IF;
  
  SELECT COUNT(*) INTO v_pledge_count
  FROM strike_pledges
  WHERE strike_id = v_strike_id;
  
  UPDATE active_strikes
  SET pledge_count = v_pledge_count,
      updated_at = NOW()
  WHERE id = v_strike_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strike_pledge_count_trigger
AFTER INSERT OR DELETE ON strike_pledges
FOR EACH ROW EXECUTE FUNCTION update_strike_pledge_count();

CREATE OR REPLACE FUNCTION update_strike_update_count()
RETURNS TRIGGER AS $$
DECLARE
  v_strike_id UUID;
  v_update_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_strike_id := OLD.strike_id;
  ELSE
    v_strike_id := NEW.strike_id;
  END IF;
  
  SELECT COUNT(*) INTO v_update_count
  FROM strike_updates
  WHERE strike_id = v_strike_id AND deleted_at IS NULL;
  
  UPDATE active_strikes
  SET update_count = v_update_count,
      updated_at = NOW()
  WHERE id = v_strike_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strike_update_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON strike_updates
FOR EACH ROW EXECUTE FUNCTION update_strike_update_count();
