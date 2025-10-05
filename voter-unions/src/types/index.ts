export type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

export type Stance = 'pro' | 'con' | 'neutral';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Union {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  member_count: number;
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
  stance: Stance;
  content: string;
  created_at: string;
  reaction_count: number;
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
