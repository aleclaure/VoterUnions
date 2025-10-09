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
  vote_count?: number;
  created_by?: string;
  union_id?: string;
  issue_area?: string;
  created_at: string;
  deleted_at?: string;
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

// Power Tracker Types
export type DonorType = 'individual' | 'pac' | 'corporation' | 'other';
export type BillStatus = 'introduced' | 'passed_house' | 'passed_senate' | 'enacted' | 'failed';
export type GraphicCategory = 'wealth_inequality' | 'tax_avoidance' | 'corporate_power' | 'campaign_finance' | 'other';
export type PledgeTargetType = 'politician' | 'bill' | 'reform';
export type PledgeAction = 'vote_against' | 'support_reform' | 'oppose_reform';
export type BillPoliticianRelationship = 'sponsor' | 'cosponsor' | 'voted_for' | 'voted_against';

export interface PowerPolitician {
  id: string;
  name: string;
  office: string;
  party?: string;
  state?: string;
  bio?: string;
  photo_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PowerDonor {
  id: string;
  politician_id: string;
  donor_name: string;
  donor_type: DonorType;
  amount?: number;
  industry?: string;
  date?: string;
  notes?: string;
  source_link?: string;
  created_by: string;
  created_at: string;
  deleted_at?: string;
}

export interface PowerBill {
  id: string;
  bill_number: string;
  title: string;
  summary: string;
  status: BillStatus;
  analysis?: string;
  source_link?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PowerBeneficiary {
  id: string;
  bill_id: string;
  corporation_name: string;
  industry?: string;
  how_they_profit: string;
  estimated_benefit?: string;
  source_link?: string;
  created_by: string;
  created_at: string;
  deleted_at?: string;
}

export interface PowerGraphic {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  category: GraphicCategory;
  source_link?: string;
  created_by: string;
  created_at: string;
  deleted_at?: string;
}

export interface PowerPledge {
  id: string;
  union_id: string;
  user_id: string;
  target_type: PledgeTargetType;
  politician_id?: string;
  bill_id?: string;
  action: PledgeAction;
  reason?: string;
  created_at: string;
  deleted_at?: string;
}

export interface PowerBillPolitician {
  id: string;
  bill_id: string;
  politician_id: string;
  relationship_type: BillPoliticianRelationship;
  created_by: string;
  created_at: string;
  deleted_at?: string;
}

// People's Agenda Types
// Philosophy: "Different backgrounds, one struggle"
export type PolicyVoteType = 'upvote' | 'downvote';
export type AmendmentVoteType = 'for' | 'against';
export type AmendmentStatus = 'proposed' | 'accepted' | 'rejected';
export type ReformScope = 'local' | 'state' | 'national';
export type ReformStatus = 'proposed' | 'in_progress' | 'passed' | 'implemented';

export interface PolicyVote {
  id: string;
  policy_id: string;
  user_id: string;
  vote_type: PolicyVoteType;
  created_at: string;
}

export interface PlatformSection {
  id: string;
  title: string;
  content: string;
  section_order: number;
  issue_area: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PlatformAmendment {
  id: string;
  section_id: string;
  user_id: string;
  proposed_text: string;
  rationale?: string;
  votes_for: number;
  votes_against: number;
  status: AmendmentStatus;
  created_at: string;
  deleted_at?: string;
}

export interface AmendmentVote {
  id: string;
  amendment_id: string;
  user_id: string;
  vote_type: AmendmentVoteType;
  created_at: string;
}

export interface ReformWin {
  id: string;
  policy_name: string;
  description: string;
  location: string;
  scope: ReformScope;
  status: ReformStatus;
  momentum_score: number;
  source_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// People's Terms / Negotiations Types
export type DemandStatus = 'draft' | 'voting' | 'ratified' | 'activated' | 'rejected';
export type DemandVoteType = 'support' | 'oppose';
export type CommentType = 'comment' | 'endorsement' | 'revision' | 'merge_suggestion';
export type NegotiationOutcome = 'in_progress' | 'bill_introduced' | 'voted_down' | 'under_review' | 'passed' | 'rejected';
export type NegotiationTargetType = 'politician' | 'company' | 'institution';

export interface Demand {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: DemandStatus;
  support_percentage: number;
  total_votes: number;
  votes_for: number;
  votes_against: number;
  vote_deadline?: string;
  ratified_at?: string;
  created_by: string;
  union_id?: string;
  source_links?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DemandVote {
  id: string;
  demand_id: string;
  user_id: string;
  vote_type: DemandVoteType;
  importance_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface DemandComment {
  id: string;
  demand_id: string;
  user_id: string;
  comment_text: string;
  comment_type: CommentType;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DemandNegotiation {
  id: string;
  demand_id: string;
  target_type?: NegotiationTargetType;
  target_name: string;
  target_description?: string;
  pledge_count: number;
  outcome_status: NegotiationOutcome;
  union_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface NegotiationUpdate {
  id: string;
  negotiation_id: string;
  update_type?: string;
  update_text: string;
  created_by: string;
  created_at: string;
}

export interface DemandEndorsement {
  id: string;
  demand_id: string;
  union_id: string;
  created_at: string;
}
