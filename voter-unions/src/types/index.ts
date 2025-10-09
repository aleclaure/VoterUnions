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

// ==================== Consumer Union Types ====================

export type BoycottVoteType = 'activate' | 'delay' | 'reject';
export type BoycottStatus = 'draft' | 'in_voting' | 'approved' | 'rejected';
export type CampaignStatus = 'active' | 'completed' | 'cancelled';
export type CampaignUpdateType = 'company_response' | 'media_coverage' | 'demand_met' | 'progress_update';
export type CampaignOutcomeType = 'victory' | 'partial_victory' | 'cancelled' | 'ongoing_monitoring';
export type PledgeType = 'participate' | 'share' | 'monitor';

export interface BoycottProposal {
  id: string;
  title: string;
  target_company: string;
  target_industry?: string;
  demand_summary: string;
  evidence?: string;
  proposed_alternatives?: string;
  status: BoycottStatus;
  vote_count: number;
  votes_activate: number;
  votes_delay: number;
  votes_reject: number;
  activation_percentage: number;
  union_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface BoycottVote {
  id: string;
  proposal_id: string;
  user_id: string;
  vote_type: BoycottVoteType;
  created_at: string;
  updated_at: string;
}

export interface BoycottComment {
  id: string;
  proposal_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface BoycottCampaign {
  id: string;
  proposal_id?: string;
  title: string;
  target_company: string;
  target_industry?: string;
  demands: string;
  consumer_actions?: string;
  status: CampaignStatus;
  progress_percentage: number;
  pledge_count: number;
  economic_impact_estimate?: number;
  union_id?: string;
  launched_by: string;
  launched_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CampaignPledge {
  id: string;
  campaign_id: string;
  user_id: string;
  pledge_type: PledgeType;
  created_at: string;
}

export interface CampaignUpdate {
  id: string;
  campaign_id: string;
  update_type?: CampaignUpdateType;
  content: string;
  source_url?: string;
  created_by: string;
  created_at: string;
}

export interface CampaignOutcome {
  id: string;
  campaign_id: string;
  outcome_type?: CampaignOutcomeType;
  outcome_description: string;
  total_participants?: number;
  economic_impact?: number;
  company_statements?: string;
  monitoring_plan?: string;
  created_by: string;
  created_at: string;
}

// ==================== Workers Union Types ====================

export type WorkerVoteType = 'strike_planning' | 'file_petition' | 'negotiate_first';
export type WorkerProposalStatus = 'open' | 'voting' | 'activated' | 'resolved' | 'archived';
export type NegotiationStatus = 'not_started' | 'in_progress' | 'stalled' | 'resolved' | 'victory' | 'ended';
export type StrikePledgeType = 'participate' | 'support' | 'donate' | 'spread_word';
export type StrikeUpdateType = 'news' | 'photo' | 'solidarity' | 'negotiation' | 'victory' | 'setback';
export type StrikeResultType = 'victory' | 'partial_victory' | 'ongoing' | 'ended' | 'defeated';

export interface WorkerProposal {
  id: string;
  created_by: string;
  employer_name: string;
  industry: string;
  location: string;
  workplace_size?: string;
  title: string;
  demands: string;
  background?: string;
  worker_testimonies?: string[];
  vote_count: number;
  votes_strike_planning: number;
  votes_file_petition: number;
  votes_negotiate_first: number;
  activation_percentage: number;
  status: WorkerProposalStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface WorkerVote {
  id: string;
  proposal_id: string;
  voter_id: string;
  vote_type: WorkerVoteType;
  verified_workplace_email?: string;
  union_affiliation?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveStrike {
  id: string;
  proposal_id: string;
  created_by: string;
  strike_location: string;
  company_name: string;
  current_demands: string;
  negotiation_status: NegotiationStatus;
  start_date: string;
  end_date?: string;
  coordinator_contact?: string;
  pledge_count: number;
  update_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface StrikePledge {
  id: string;
  strike_id: string;
  worker_id: string;
  pledge_type: StrikePledgeType;
  anonymous: boolean;
  message?: string;
  created_at: string;
}

export interface StrikeUpdate {
  id: string;
  strike_id: string;
  posted_by: string;
  update_type: StrikeUpdateType;
  content: string;
  media_urls?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface StrikeOutcome {
  id: string;
  strike_id: string;
  created_by: string;
  result_type: StrikeResultType;
  achievements: string;
  settlement_details?: string;
  workers_affected?: number;
  pay_increase_percentage?: number;
  new_policies?: string[];
  cross_industry_alliances?: string[];
  lessons_learned?: string;
  strategy_notes?: string;
  outcome_date: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
