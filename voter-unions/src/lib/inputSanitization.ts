/**
 * Input Sanitization Service
 * 
 * Comprehensive XSS and injection prevention for all user inputs.
 * Apply this layer before inserting/updating any user-generated content in the database.
 */

import { z } from 'zod';

// ============================================================================
// XSS Prevention
// ============================================================================

/**
 * Sanitize text input by removing dangerous HTML/JS patterns
 * Prevents XSS attacks while preserving regular text formatting
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed)[^>]*>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    // Remove event handlers (onclick, onload, etc.)
    .replace(/on\w+\s*=/gi, '')
    // Remove style tags (can contain expression() XSS)
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove link tags (can load external resources)
    .replace(/<link\b[^<]*>/gi, '')
    // Remove meta tags
    .replace(/<meta\b[^<]*>/gi, '');
}

/**
 * Aggressive HTML stripping - removes ALL HTML tags
 * Use for fields where HTML is never expected (names, titles, etc.)
 */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

// ============================================================================
// URL Validation & Sanitization
// ============================================================================

/**
 * Validate and sanitize URL
 * Returns null if URL is invalid or uses dangerous protocol
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  
  try {
    const parsed = new URL(url.trim());
    
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    
    // Reject suspicious patterns
    // eslint-disable-next-line no-script-url
    if (parsed.href.includes('javascript:') || parsed.href.includes('data:')) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Validate URL schema (for Zod validation)
 */
export const urlSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return true; // Optional URLs can be empty
    const sanitized = sanitizeUrl(val);
    return sanitized !== null;
  },
  { message: 'Must be a valid http:// or https:// URL' }
);

/**
 * Sanitize array of URLs
 */
export function sanitizeUrlArray(urls: string[] | null | undefined): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  
  return urls
    .map(sanitizeUrl)
    .filter((url): url is string => url !== null);
}

// ============================================================================
// SQL Injection Prevention
// ============================================================================

/**
 * Escape special characters for SQL LIKE queries
 * Note: Supabase uses parameterized queries by default, but this adds extra safety
 */
export function escapeSqlLike(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .replace(/\\/g, '\\\\')  // Escape backslash
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');    // Escape underscore
}

/**
 * Sanitize search query input
 * Use for full-text search or LIKE queries
 */
export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return '';
  
  // Remove special SQL characters
  return query
    .trim()
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '')       // Remove SQL comment syntax
    .replace(/\/\*/g, '')     // Remove multi-line comment start
    .replace(/\*\//g, '')     // Remove multi-line comment end
    .substring(0, 200);       // Limit length to prevent DOS
}

// ============================================================================
// Object Sanitization (for bulk operations)
// ============================================================================

/**
 * Sanitize all string fields in an object
 * Automatically applies sanitization to common field patterns
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    textFields?: string[];    // Fields to sanitize as text
    htmlFields?: string[];    // Fields to strip HTML completely
    urlFields?: string[];     // Fields to validate as URLs
  } = {}
): T {
  const result: any = { ...obj };
  
  // Auto-detect field types based on naming conventions
  const textFields = options.textFields || [];
  const htmlFields = options.htmlFields || ['title', 'name', 'display_name', 'username'];
  const urlFields = options.urlFields || ['url', 'link', 'source_link', 'image_url'];
  
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      // Apply sanitization based on field name pattern
      if (urlFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = sanitizeUrl(value) || '';
      } else if (htmlFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = stripHtml(value);
      } else if (textFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = sanitizeText(value);
      } else {
        // Default: sanitize text for any string field
        result[key] = sanitizeText(value);
      }
    } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
      // Sanitize string arrays
      if (urlFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = sanitizeUrlArray(value);
      } else {
        result[key] = value.map(v => sanitizeText(v));
      }
    }
  }
  
  return result as T;
}

// ============================================================================
// Content-Type Specific Sanitizers
// ============================================================================

/**
 * Sanitize user profile data
 */
export function sanitizeProfile(profile: {
  display_name?: string;
  username?: string;
  bio?: string;
  [key: string]: any;
}) {
  return {
    ...profile,
    display_name: profile.display_name ? stripHtml(profile.display_name) : undefined,
    username: profile.username ? stripHtml(profile.username).toLowerCase() : undefined,
    bio: profile.bio ? sanitizeText(profile.bio) : undefined,
  };
}

/**
 * Sanitize union creation data
 */
export function sanitizeUnion(union: {
  name?: string;
  description?: string;
  [key: string]: any;
}) {
  return {
    ...union,
    name: union.name ? stripHtml(union.name) : undefined,
    description: union.description ? sanitizeText(union.description) : undefined,
  };
}

/**
 * Sanitize debate/proposal data
 */
export function sanitizeProposal(proposal: {
  title?: string;
  description?: string;
  demands?: string;
  background?: string;
  evidence?: string;
  source_links?: string[];
  [key: string]: any;
}) {
  return {
    ...proposal,
    title: proposal.title ? stripHtml(proposal.title) : undefined,
    description: proposal.description ? sanitizeText(proposal.description) : undefined,
    demands: proposal.demands ? sanitizeText(proposal.demands) : undefined,
    background: proposal.background ? sanitizeText(proposal.background) : undefined,
    evidence: proposal.evidence ? sanitizeText(proposal.evidence) : undefined,
    source_links: proposal.source_links ? sanitizeUrlArray(proposal.source_links) : undefined,
  };
}

/**
 * Sanitize post/comment content
 */
export function sanitizeContent(content: string | null | undefined): string {
  return sanitizeText(content);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if string contains potential XSS patterns
 * Returns true if suspicious content is detected
 */
export function containsXss(input: string | null | undefined): boolean {
  if (!input) return false;
  
  const xssPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if string contains potential SQL injection patterns
 * Returns true if suspicious content is detected
 */
export function containsSqlInjection(input: string | null | undefined): boolean {
  if (!input) return false;
  
  const sqlPatterns = [
    /'\s*OR\s*'1'\s*=\s*'1/i,
    /'\s*OR\s*1\s*=\s*1/i,
    /--/,
    /;.*DROP/i,
    /;.*DELETE/i,
    /UNION\s+SELECT/i,
    /EXEC\s*\(/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Comprehensive input validation
 * Returns validation errors if dangerous content is detected
 */
export function validateInput(input: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (containsXss(input)) {
    errors.push('Input contains potentially dangerous HTML/JavaScript');
  }
  
  if (containsSqlInjection(input)) {
    errors.push('Input contains potentially dangerous SQL patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Export convenience functions
// ============================================================================

export default {
  sanitizeText,
  stripHtml,
  sanitizeUrl,
  sanitizeUrlArray,
  sanitizeObject,
  sanitizeProfile,
  sanitizeUnion,
  sanitizeProposal,
  sanitizeContent,
  sanitizeSearchQuery,
  escapeSqlLike,
  containsXss,
  containsSqlInjection,
  validateInput,
};
