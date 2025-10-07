export type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

export type Stance = 'pro' | 'con' | 'neutral';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  username_normalized: string;
  bio: string | null;
  avatar_url: string | null;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

// Legacy type alias for backward compatibility
export type User = Profile;

export interface Union {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  member_count: number;
  issue_tags: string[];
  created_at: string;
  created_by: string;
}

export interface UnionMember {
  id: string;
  union_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
}

export interface Debate {
  id: string;
  union_id: string;
  title: string;
  description: string;
  issue_area: string;
  created_by: string;
  created_at: string;
  argument_count: number;
}

export interface Argument {
  id: string;
  debate_id: string;
  user_id: string;
  parent_id: string | null;
  stance: Stance;
  content: string;
  source_links: string[];
  upvotes: number;
  downvotes: number;
  created_at: string;
  reaction_count: number;
  replies?: Argument[];
}

export interface ArgumentVote {
  id: string;
  argument_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface Reaction {
  id: string;
  argument_id: string;
  user_id: string;
  type: 'agree' | 'disagree' | 'neutral';
  created_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  position: string;
  description: string;
  created_at: string;
}

export interface Policy {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface Pledge {
  id: string;
  union_id: string;
  user_id: string;
  candidate_id?: string;
  policy_id?: string;
  pledge_type: 'support' | 'oppose';
  created_at: string;
}

export interface Milestone {
  id: string;
  union_id: string;
  title: string;
  description: string;
  target_date?: string;
  completion_percentage: number;
  created_by: string;
  created_at: string;
}

export interface Channel {
  id: string;
  union_id: string;
  name: string;
  hashtag: string;
  description?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface Post {
  id: string;
  union_id: string;
  author_id: string;
  content: string;
  is_public: boolean;
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostChannel {
  id: string;
  post_id: string;
  channel_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type PostReactionType = 'upvote' | 'downvote';

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: PostReactionType;
  created_at: string;
}
