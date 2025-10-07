-- Migration: Add debate enhancement features
-- This adds voting, replies, and sources to the debates system

-- Step 1: Add new columns to arguments table
ALTER TABLE arguments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES arguments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_links TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Step 2: Create argument_votes table
CREATE TABLE IF NOT EXISTS argument_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  argument_id UUID REFERENCES arguments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(argument_id, user_id)
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_arguments_parent_id ON arguments(parent_id);
CREATE INDEX IF NOT EXISTS idx_arguments_votes ON arguments((upvotes - downvotes) DESC);
CREATE INDEX IF NOT EXISTS idx_argument_votes_argument_id ON argument_votes(argument_id);
CREATE INDEX IF NOT EXISTS idx_argument_votes_user_id ON argument_votes(user_id);

-- Step 4: Enable RLS on argument_votes
ALTER TABLE argument_votes ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for argument_votes
CREATE POLICY "Users can view all argument votes" ON argument_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote on arguments" ON argument_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON argument_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON argument_votes FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create trigger function to update vote counts
CREATE OR REPLACE FUNCTION update_argument_vote_count()
RETURNS TRIGGER AS $$
DECLARE
  target_argument_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_argument_id := OLD.argument_id;
  ELSE
    target_argument_id := NEW.argument_id;
  END IF;
  
  UPDATE arguments SET 
    upvotes = (SELECT COUNT(*) FROM argument_votes WHERE argument_id = target_argument_id AND vote_type = 'upvote'),
    downvotes = (SELECT COUNT(*) FROM argument_votes WHERE argument_id = target_argument_id AND vote_type = 'downvote')
  WHERE id = target_argument_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS trigger_update_argument_vote_count ON argument_votes;
CREATE TRIGGER trigger_update_argument_vote_count
AFTER INSERT OR UPDATE OR DELETE ON argument_votes
FOR EACH ROW EXECUTE FUNCTION update_argument_vote_count();
