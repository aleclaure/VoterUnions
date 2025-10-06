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
  issue_tags TEXT[] DEFAULT '{}',
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

-- Channels table (Discord-style channels within unions)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hashtag TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(union_id, hashtag)
);

-- Posts table (social feed posts)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Post-Channels junction table (many-to-many: posts can be in multiple channels)
CREATE TABLE IF NOT EXISTS post_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, channel_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Post reactions table (upvotes/downvotes)
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT CHECK (reaction_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_unions_created_at ON unions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unions_issue_tags ON unions USING GIN(issue_tags);
CREATE INDEX IF NOT EXISTS idx_union_members_union_id ON union_members(union_id);
CREATE INDEX IF NOT EXISTS idx_union_members_user_id ON union_members(user_id);
CREATE INDEX IF NOT EXISTS idx_debates_union_id ON debates(union_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arguments_debate_id ON arguments(debate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_argument_id ON reactions(argument_id);
CREATE INDEX IF NOT EXISTS idx_pledges_union_id ON pledges(union_id);
CREATE INDEX IF NOT EXISTS idx_milestones_union_id ON milestones(union_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_union_id ON channels(union_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_hashtag ON channels(hashtag);
CREATE INDEX IF NOT EXISTS idx_posts_union_id ON posts(union_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_upvote_count ON posts(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_comment_count ON posts(comment_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_channels_post_id ON post_channels(post_id);
CREATE INDEX IF NOT EXISTS idx_post_channels_channel_id ON post_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);

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
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

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

-- Channels policies
CREATE POLICY "Users can view channels in accessible unions" ON channels FOR SELECT USING (union_id IN (SELECT id FROM unions WHERE is_public = true OR id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())));
CREATE POLICY "Union members can create channels" ON channels FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = channels.union_id));
CREATE POLICY "Union admins can update channels" ON channels FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = channels.union_id AND role IN ('owner', 'admin', 'moderator')));
CREATE POLICY "Union admins can delete channels" ON channels FOR DELETE USING (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = channels.union_id AND role IN ('owner', 'admin')));

-- Posts policies
CREATE POLICY "Users can view public posts or posts in their unions" ON posts FOR SELECT USING (is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())));
CREATE POLICY "Union members can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM union_members WHERE union_id = posts.union_id) AND auth.uid() = author_id);
CREATE POLICY "Post authors can update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Post authors can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Post-Channels policies
CREATE POLICY "Users can view post-channel associations" ON post_channels FOR SELECT USING (
  post_id IN (SELECT id FROM posts WHERE is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Post authors can add channels to their posts" ON post_channels FOR INSERT WITH CHECK (
  auth.uid() = (SELECT author_id FROM posts p WHERE p.id = post_channels.post_id)
  AND EXISTS (
    SELECT 1
    FROM posts p
    JOIN channels c ON c.id = post_channels.channel_id
    WHERE p.id = post_channels.post_id
      AND c.union_id = p.union_id
      AND EXISTS (
        SELECT 1 FROM union_members um
        WHERE um.union_id = p.union_id AND um.user_id = auth.uid()
      )
  )
);
CREATE POLICY "Post authors can remove channels from their posts" ON post_channels FOR DELETE USING (
  auth.uid() = (SELECT author_id FROM posts p WHERE p.id = post_channels.post_id)
  AND EXISTS (
    SELECT 1
    FROM posts p
    JOIN channels c ON c.id = post_channels.channel_id
    WHERE p.id = post_channels.post_id
      AND c.union_id = p.union_id
  )
);

-- Comments policies
CREATE POLICY "Users can view comments on accessible posts" ON comments FOR SELECT USING (post_id IN (SELECT id FROM posts WHERE is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid()))));
CREATE POLICY "Authenticated users can create comments on accessible posts" ON comments FOR INSERT WITH CHECK (
  auth.uid() = author_id 
  AND post_id IN (SELECT id FROM posts WHERE is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Comment authors can update own comments" ON comments FOR UPDATE 
USING (auth.uid() = author_id)
WITH CHECK (
  auth.uid() = author_id
  AND post_id IN (SELECT id FROM posts WHERE is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Comment authors can delete own comments" ON comments FOR DELETE USING (auth.uid() = author_id);

-- Post reactions policies
CREATE POLICY "Users can view reactions on accessible posts" ON post_reactions FOR SELECT USING (
  post_id IN (SELECT id FROM posts WHERE is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Authenticated users can react to accessible posts" ON post_reactions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_reactions.post_id
      AND (
        p.is_public = true 
        OR EXISTS (SELECT 1 FROM union_members um WHERE um.union_id = p.union_id AND um.user_id = auth.uid())
      )
  )
);
CREATE POLICY "Users can update own reactions on accessible posts" ON post_reactions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND post_id IN (SELECT id FROM posts WHERE is_public = true OR (auth.uid() IS NOT NULL AND union_id IN (SELECT union_id FROM union_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Users can delete own reactions" ON post_reactions FOR DELETE USING (auth.uid() = user_id);

-- Functions to update counts
CREATE OR REPLACE FUNCTION update_union_member_count()
RETURNS TRIGGER AS $$
DECLARE
  target_union_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_union_id := OLD.union_id;
  ELSE
    target_union_id := NEW.union_id;
  END IF;
  
  UPDATE unions SET member_count = (SELECT COUNT(*) FROM union_members WHERE union_id = target_union_id) WHERE id = target_union_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_union_member_count
AFTER INSERT OR DELETE ON union_members
FOR EACH ROW EXECUTE FUNCTION update_union_member_count();

CREATE OR REPLACE FUNCTION update_debate_argument_count()
RETURNS TRIGGER AS $$
DECLARE
  target_debate_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_debate_id := OLD.debate_id;
  ELSE
    target_debate_id := NEW.debate_id;
  END IF;
  
  UPDATE debates SET argument_count = (SELECT COUNT(*) FROM arguments WHERE debate_id = target_debate_id) WHERE id = target_debate_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_debate_argument_count
AFTER INSERT OR DELETE ON arguments
FOR EACH ROW EXECUTE FUNCTION update_debate_argument_count();

CREATE OR REPLACE FUNCTION update_argument_reaction_count()
RETURNS TRIGGER AS $$
DECLARE
  target_argument_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_argument_id := OLD.argument_id;
  ELSE
    target_argument_id := NEW.argument_id;
  END IF;
  
  UPDATE arguments SET reaction_count = (SELECT COUNT(*) FROM reactions WHERE argument_id = target_argument_id) WHERE id = target_argument_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_argument_reaction_count
AFTER INSERT OR DELETE ON reactions
FOR EACH ROW EXECUTE FUNCTION update_argument_reaction_count();

-- Function to update post reaction counts (upvote/downvote)
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
DECLARE
  target_post_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_post_id := OLD.post_id;
  ELSE
    target_post_id := NEW.post_id;
  END IF;
  
  UPDATE posts SET 
    upvote_count = (SELECT COUNT(*) FROM post_reactions WHERE post_id = target_post_id AND reaction_type = 'upvote'),
    downvote_count = (SELECT COUNT(*) FROM post_reactions WHERE post_id = target_post_id AND reaction_type = 'downvote')
  WHERE id = target_post_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_reaction_count
AFTER INSERT OR UPDATE OR DELETE ON post_reactions
FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id AND deleted_at IS NULL) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id AND deleted_at IS NULL) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id AND deleted_at IS NULL) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
