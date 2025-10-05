-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unions table
CREATE TABLE IF NOT EXISTS unions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Union members table
CREATE TABLE IF NOT EXISTS union_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'moderator', 'member', 'guest')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(union_id, user_id)
);

-- Debates table
CREATE TABLE IF NOT EXISTS debates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  issue_area TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  argument_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

-- Arguments table
CREATE TABLE IF NOT EXISTS arguments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stance TEXT CHECK (stance IN ('pro', 'con', 'neutral')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reaction_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  argument_id UUID REFERENCES arguments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('agree', 'disagree', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(argument_id, user_id)
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Pledges table
CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  pledge_type TEXT CHECK (pledge_type IN ('support', 'oppose')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(union_id, user_id, candidate_id, policy_id)
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_date TIMESTAMPTZ,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_unions_created_at ON unions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_union_members_union_id ON union_members(union_id);
CREATE INDEX IF NOT EXISTS idx_union_members_user_id ON union_members(user_id);
CREATE INDEX IF NOT EXISTS idx_debates_union_id ON debates(union_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arguments_debate_id ON arguments(debate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_argument_id ON reactions(argument_id);
CREATE INDEX IF NOT EXISTS idx_pledges_union_id ON pledges(union_id);
CREATE INDEX IF NOT EXISTS idx_milestones_union_id ON milestones(union_id, created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE union_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Unions policies
CREATE POLICY "Public unions are viewable by everyone" ON unions FOR SELECT USING (is_public = true OR auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = unions.id));
CREATE POLICY "Authenticated users can create unions" ON unions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Union owners and admins can update" ON unions FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = unions.id AND role IN ('owner', 'admin')));

-- Union members policies
CREATE POLICY "Members can view union memberships" ON union_members FOR SELECT USING (auth.uid() = user_id OR union_id IN (SELECT id FROM unions WHERE is_public = true));
CREATE POLICY "Users can join public unions" ON union_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Debates policies
CREATE POLICY "Users can view debates in accessible unions" ON debates FOR SELECT USING (union_id IN (SELECT id FROM unions WHERE is_public = true OR id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())));
CREATE POLICY "Union members can create debates" ON debates FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = debates.union_id));

-- Arguments policies
CREATE POLICY "Users can view arguments in accessible debates" ON arguments FOR SELECT USING (debate_id IN (SELECT id FROM debates WHERE union_id IN (SELECT id FROM unions WHERE is_public = true OR id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid()))));
CREATE POLICY "Authenticated users can create arguments" ON arguments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reactions policies
CREATE POLICY "Users can view all reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reactions" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON reactions FOR DELETE USING (auth.uid() = user_id);

-- Candidates policies
CREATE POLICY "Everyone can view candidates" ON candidates FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create candidates" ON candidates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies policies
CREATE POLICY "Everyone can view policies" ON policies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create policies" ON policies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Pledges policies
CREATE POLICY "Users can view pledges in their unions" ON pledges FOR SELECT USING (union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can create pledges in their unions" ON pledges FOR INSERT WITH CHECK (auth.uid() = user_id AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own pledges" ON pledges FOR UPDATE USING (auth.uid() = user_id);

-- Milestones policies
CREATE POLICY "Users can view milestones in accessible unions" ON milestones FOR SELECT USING (union_id IN (SELECT id FROM unions WHERE is_public = true OR id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())));
CREATE POLICY "Union members can create milestones" ON milestones FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = milestones.union_id));

-- Functions to update counts
CREATE OR REPLACE FUNCTION update_union_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE unions SET member_count = (SELECT COUNT(*) FROM union_members WHERE union_id = NEW.union_id) WHERE id = NEW.union_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_union_member_count
AFTER INSERT OR DELETE ON union_members
FOR EACH ROW EXECUTE FUNCTION update_union_member_count();

CREATE OR REPLACE FUNCTION update_debate_argument_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE debates SET argument_count = (SELECT COUNT(*) FROM arguments WHERE debate_id = NEW.debate_id) WHERE id = NEW.debate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_debate_argument_count
AFTER INSERT OR DELETE ON arguments
FOR EACH ROW EXECUTE FUNCTION update_debate_argument_count();

CREATE OR REPLACE FUNCTION update_argument_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE arguments SET reaction_count = (SELECT COUNT(*) FROM reactions WHERE argument_id = NEW.argument_id) WHERE id = NEW.argument_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_argument_reaction_count
AFTER INSERT OR DELETE ON reactions
FOR EACH ROW EXECUTE FUNCTION update_argument_reaction_count();
