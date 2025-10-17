import { z } from 'zod';

// ============================================================================
// Authentication & Security Validation
// ============================================================================

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (!@#$%^&*...)');

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .trim();

// ============================================================================
// User & Profile Validation
// ============================================================================

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(100, 'Display name cannot exceed 100 characters')
  .trim();

export const bioSchema = z
  .string()
  .max(500, 'Bio cannot exceed 500 characters')
  .optional();

export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  display_name: displayNameSchema.optional(),
  bio: bioSchema,
});

// ============================================================================
// Union Validation
// ============================================================================

export const unionNameSchema = z
  .string()
  .min(3, 'Union name must be at least 3 characters')
  .max(100, 'Union name cannot exceed 100 characters')
  .trim();

export const unionDescriptionSchema = z
  .string()
  .min(10, 'Description must be at least 10 characters')
  .max(1000, 'Description cannot exceed 1000 characters')
  .trim();

export const unionSchema = z.object({
  name: unionNameSchema,
  description: unionDescriptionSchema,
});

// ============================================================================
// Debate Validation
// ============================================================================

export const debateTitleSchema = z
  .string()
  .min(5, 'Debate title must be at least 5 characters')
  .max(200, 'Debate title cannot exceed 200 characters')
  .trim();

export const debateDescriptionSchema = z
  .string()
  .min(10, 'Description must be at least 10 characters')
  .max(2000, 'Description cannot exceed 2000 characters')
  .trim();

export const debateSchema = z.object({
  title: debateTitleSchema,
  description: debateDescriptionSchema,
  union_id: z.string().uuid('Invalid union ID').optional(),
});

// ============================================================================
// Argument Validation
// ============================================================================

export const argumentContentSchema = z
  .string()
  .min(10, 'Argument must be at least 10 characters')
  .max(5000, 'Argument cannot exceed 5000 characters')
  .trim();

export const argumentStanceSchema = z.enum(['PRO', 'CON', 'NEUTRAL'], {
  errorMap: () => ({ message: 'Stance must be PRO, CON, or NEUTRAL' }),
});

export const argumentSourcesSchema = z
  .array(
    z.string().url('Each source must be a valid URL')
  )
  .max(10, 'Cannot attach more than 10 sources')
  .optional();

export const argumentSchema = z.object({
  content: argumentContentSchema,
  stance: argumentStanceSchema,
  sources: argumentSourcesSchema,
});

// ============================================================================
// Policy Validation (People's Agenda)
// ============================================================================

export const policyTitleSchema = z
  .string()
  .min(5, 'Policy title must be at least 5 characters')
  .max(200, 'Policy title cannot exceed 200 characters')
  .trim();

export const policyDescriptionSchema = z
  .string()
  .min(10, 'Description must be at least 10 characters')
  .max(1000, 'Description cannot exceed 1000 characters')
  .trim();

export const policyIssueAreaSchema = z
  .string()
  .min(3, 'Issue area is required')
  .max(100, 'Issue area cannot exceed 100 characters')
  .trim();

export const policySchema = z.object({
  title: policyTitleSchema,
  description: policyDescriptionSchema,
  issue_area: policyIssueAreaSchema,
});

// ============================================================================
// Demand Validation (People's Terms)
// ============================================================================

export const demandTitleSchema = z
  .string()
  .min(5, 'Demand title must be at least 5 characters')
  .max(200, 'Demand title cannot exceed 200 characters')
  .trim();

export const demandContentSchema = z
  .string()
  .min(20, 'Demand content must be at least 20 characters')
  .max(3000, 'Demand content cannot exceed 3000 characters')
  .trim();

export const demandCategorySchema = z
  .string()
  .min(3, 'Category is required')
  .max(100, 'Category cannot exceed 100 characters')
  .trim();

export const demandSchema = z.object({
  title: demandTitleSchema,
  content: demandContentSchema,
  category: demandCategorySchema,
  proposed_by_union: z.string().uuid('Invalid union ID').optional(),
});

// ============================================================================
// Boycott Proposal Validation (Consumer Union)
// ============================================================================

export const boycottTitleSchema = z
  .string()
  .min(5, 'Title must be at least 5 characters')
  .max(200, 'Title cannot exceed 200 characters')
  .trim();

export const companyNameSchema = z
  .string()
  .min(2, 'Company name is required')
  .max(100, 'Company name cannot exceed 100 characters')
  .trim();

export const boycottReasonSchema = z
  .string()
  .min(20, 'Reason must be at least 20 characters')
  .max(2000, 'Reason cannot exceed 2000 characters')
  .trim();

export const boycottProposalSchema = z.object({
  title: boycottTitleSchema,
  target_company: companyNameSchema,
  target_industry: z.string().max(100, 'Industry cannot exceed 100 characters').optional(),
  reason_description: boycottReasonSchema,
  demand_summary: z.string().min(10).max(1000).trim(),
  evidence_links: z.array(z.string().url()).max(10).optional(),
  proposed_alternatives: z.array(z.string()).max(10).optional(),
});

// ============================================================================
// Worker Proposal Validation (Workers Union)
// ============================================================================

export const workerProposalTitleSchema = z
  .string()
  .min(5, 'Title must be at least 5 characters')
  .max(200, 'Title cannot exceed 200 characters')
  .trim();

export const workerProposalSchema = z.object({
  title: workerProposalTitleSchema,
  employer_name: companyNameSchema,
  location: z.string().min(2).max(200).trim(),
  industry: z.string().max(100).optional(),
  demands: z.array(z.string()).min(1, 'At least one demand is required').max(10),
  current_conditions: z.string().min(20).max(2000).trim(),
  estimated_workers: z.number().int().min(1).max(1000000).optional(),
});

// ============================================================================
// Post Validation (Social Feed)
// ============================================================================

export const postContentSchema = z
  .string()
  .min(1, 'Post content is required')
  .max(2000, 'Post content cannot exceed 2000 characters')
  .trim();

export const postSchema = z.object({
  content: postContentSchema,
  union_id: z.string().uuid('Invalid union ID').optional(),
  channel_id: z.string().uuid('Invalid channel ID').optional(),
});

// ============================================================================
// Vote Validation
// ============================================================================

export const voteTypeSchema = z.enum(['upvote', 'downvote', 'support', 'oppose', 'strike_planning', 'file_petition', 'negotiate_first'], {
  errorMap: () => ({ message: 'Invalid vote type' }),
});

export const voteSchema = z.object({
  vote_type: voteTypeSchema,
  entity_id: z.string().uuid('Invalid entity ID'),
  device_id: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate data against a schema and return either success or error
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: firstError.message,
    };
  }
}

/**
 * Sanitize user input by trimming and removing dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
