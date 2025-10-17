# Input Sanitization Implementation Plan

**Date:** October 17, 2025  
**Status:** 🟡 **IN PROGRESS** - Sanitization layer created, needs application across codebase

## Executive Summary

Created comprehensive input sanitization service (`src/lib/inputSanitization.ts`) to prevent XSS and SQL injection attacks. The service is ready for deployment but needs to be integrated into all database mutation operations.

---

## Current State Analysis

### ✅ What's Already Protected

1. **Passwords** - Strong validation (12+ chars, complexity requirements)
2. **Email addresses** - Zod email validation
3. **Supabase queries** - Use parameterized queries (prevents most SQL injection)

### ❌ What's NOT Protected

**All user-generated content fields currently lack sanitization:**

1. **Profile Data:**
   - `display_name` (username)
   - `bio` (user biography)

2. **Union/Organization:**
   - `name` (union name)
   - `description` (union description)

3. **Debates & Arguments:**
   - `title` (debate title)
   - `description` (debate description)
   - `content` (argument content)
   - `source_links` (URL array) - Basic URL validation exists but not consistently applied

4. **Social Features:**
   - `content` (post content)
   - `content` (comment content)
   - `name` (channel name)
   - `hashtag` (channel hashtag)
   - `description` (channel description)

5. **Civic Engagement Platforms:**
   - **People's Agenda:**
     - `title`, `description`, `issue_area` (policy)
     - `title`, `content` (platform sections)
     - `proposed_text`, `rationale` (amendments)
     - `policy_name`, `description`, `source_url` (reform wins)
   
   - **People's Terms:**
     - `title`, `content`, `category` (demands)
     - `target_name`, `target_description` (negotiations)
     - `update_text` (negotiation updates)
     - `content`, `comment_type` (demand comments)
   
   - **Consumer Union:**
     - `title`, `target_company`, `target_industry`, `demand_summary`, `evidence`, `proposed_alternatives` (boycott proposals)
     - `content`, `update_type` (campaign updates)
     - `outcome_description`, `company_statements`, `monitoring_plan` (campaign outcomes)
   
   - **Workers Union:**
     - `title`, `employer_name`, `industry`, `location`, `workplace_size`, `demands`, `background`, `worker_testimonies` (worker proposals)
     - `content` (strike updates)
     - `achievements`, `settlement_details`, `lessons_learned`, `strategy_notes` (strike outcomes)
   
   - **Power Tracker:**
     - `name`, `office`, `party`, `state`, `bio` (politicians)
     - `bill_number`, `title`, `summary`, `analysis`, `source_link` (bills)
     - `title`, `description`, `image_url`, `source_link` (power graphics)
   
   - **Corporate Power & Labor Power:**
     - `title`, `description`, `category`, `company_name`, `evidence`, `source_link` (corporate influence)
     - `title`, `description`, `category`, `company_name`, `evidence`, `source_link` (labor power)

---

## Sanitization Service Overview

**File:** `src/lib/inputSanitization.ts`

### Functions Available:

#### Core Sanitization
- `sanitizeText(input)` - Removes XSS patterns, preserves text
- `stripHtml(input)` - Aggressive HTML removal for names/titles
- `sanitizeUrl(url)` - Validates and sanitizes URLs (http/https only)
- `sanitizeUrlArray(urls)` - Sanitizes array of URLs
- `sanitizeSearchQuery(query)` - Safe full-text search input
- `escapeSqlLike(input)` - Escape LIKE query wildcards

#### Content-Specific Sanitizers
- `sanitizeProfile(profile)` - Profile data (display_name, bio, username)
- `sanitizeUnion(union)` - Union data (name, description)
- `sanitizeProposal(proposal)` - Proposals (title, description, demands, etc.)
- `sanitizeContent(content)` - Post/comment content

#### Validation
- `containsXss(input)` - Detect XSS patterns
- `containsSqlInjection(input)` - Detect SQL injection patterns
- `validateInput(input)` - Comprehensive validation

---

## Implementation Strategy

### Phase 1: High-Risk Inputs (Priority)

**Fields displayed as HTML or in navigation:**
1. Display names (shown in UI everywhere)
2. Post/comment content (can contain malicious links)
3. Channel names/hashtags (shown in navigation)
4. Union names (shown in headers)

**Action:** Apply `stripHtml()` or `sanitizeText()` before INSERT/UPDATE

### Phase 2: Medium-Risk Inputs

**Fields that accept longer text:**
1. Descriptions (unions, debates, proposals)
2. Demand summaries
3. Evidence text
4. Bios

**Action:** Apply `sanitizeText()` before INSERT/UPDATE

### Phase 3: URL Inputs

**All URL fields:**
1. source_link (power tracker)
2. image_url (power graphics)
3. source_links (arguments)
4. evidence URLs

**Action:** Apply `sanitizeUrl()` or `sanitizeUrlArray()` before INSERT/UPDATE

---

## How to Apply Sanitization

### Example 1: Profile Update

**Before:**
```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    display_name: displayName,
    bio: bio.trim() || null,
  })
  .eq('id', user.id);
```

**After:**
```typescript
import { sanitizeProfile } from '../lib/inputSanitization';

const sanitizedProfile = sanitizeProfile({
  display_name: displayName,
  bio: bio.trim() || null,
});

const { error } = await supabase
  .from('profiles')
  .update(sanitizedProfile)
  .eq('id', user.id);
```

### Example 2: Union Creation

**Before:**
```typescript
const { data, error } = await supabase
  .from('unions')
  .insert({
    name,
    description,
    is_public: isPublic,
    created_by: user?.id,
  })
  .select()
  .single();
```

**After:**
```typescript
import { sanitizeUnion } from '../lib/inputSanitization';

const sanitizedUnion = sanitizeUnion({ name, description });

const { data, error } = await supabase
  .from('unions')
  .insert({
    ...sanitizedUnion,
    is_public: isPublic,
    created_by: user?.id,
  })
  .select()
  .single();
```

### Example 3: Post Creation

**Before:**
```typescript
const { data, error } = await supabase
  .from('posts')
  .insert({
    content,
    author_id: userId,
    union_id: unionId,
  })
  .select()
  .single();
```

**After:**
```typescript
import { sanitizeContent } from '../lib/inputSanitization';

const { data, error } = await supabase
  .from('posts')
  .insert({
    content: sanitizeContent(content),
    author_id: userId,
    union_id: unionId,
  })
  .select()
  .single();
```

### Example 4: Boycott Proposal with URLs

**Before:**
```typescript
const { data, error } = await supabase
  .from('boycott_proposals')
  .insert([{
    title,
    target_company,
    demand_summary,
    evidence,
    created_by: user?.id,
  }])
  .select()
  .single();
```

**After:**
```typescript
import { sanitizeProposal } from '../lib/inputSanitization';

const sanitizedProposal = sanitizeProposal({
  title,
  target_company,
  demand_summary,
  evidence,
});

const { data, error } = await supabase
  .from('boycott_proposals')
  .insert([{
    ...sanitizedProposal,
    created_by: user?.id,
  }])
  .select()
  .single();
```

---

## Files That Need Updates

### High Priority (25 files)

1. `src/screens/OnboardingScreen.tsx` - Profile creation
2. `src/screens/EditProfileScreen.tsx` - Profile updates
3. `src/screens/CreateUnionScreen.tsx` - Union creation
4. `src/screens/CreateDebateScreen.tsx` - Debate creation
5. `src/screens/DebateDetailScreen.tsx` - Argument creation
6. `src/components/CreatePostModal.tsx` - Post creation
7. `src/components/CreateChannelModal.tsx` - Channel creation
8. `src/screens/PostDetailScreen.tsx` - Comment creation
9. `src/screens/consumer/ProposalsTab.tsx` - Boycott proposals
10. `src/screens/consumer/ActiveBoycottsTab.tsx` - Campaign updates
11. `src/screens/workers/WorkerProposalsTab.tsx` - Worker proposals
12. `src/screens/workers/ActiveStrikesTab.tsx` - Strike updates
13. `src/screens/workers/OutcomesSolidarityTab.tsx` - Strike outcomes
14. `src/screens/peoplesagenda/PrioritiesTab.tsx` - Policy creation
15. `src/screens/peoplesagenda/PlatformTab.tsx` - Platform sections
16. `src/screens/peoplesagenda/WinsTab.tsx` - Reform wins
17. `src/screens/negotiations/ProposalsTab.tsx` - Demand proposals
18. `src/screens/negotiations/ActivatedDemandsTab.tsx` - Negotiations
19. `src/screens/powertracker/PoliticiansTab.tsx` - Politicians
20. `src/screens/powertracker/BillsTab.tsx` - Bills
21. `src/screens/powertracker/DataTab.tsx` - Power graphics (includes URLs)
22. `src/screens/powertracker/ActionTab.tsx` - Power pledges
23. `src/screens/corporate/CorporateInfluenceTab.tsx` - Corporate data
24. `src/screens/labor/LaborPowerTab.tsx` - Labor power data
25. `src/hooks/usePosts.tsx` - Post mutations

---

## SQL Injection Status

### ✅ Already Protected

Supabase uses **parameterized queries** by default, which prevents SQL injection in standard CRUD operations:

```typescript
// This is SAFE - Supabase uses parameterized queries
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput); // User input is parameterized
```

### ⚠️ Potential Risks

If using raw SQL queries or full-text search:

```typescript
// UNSAFE - if using raw SQL
await supabase.rpc('raw_sql_function', { query: userInput });

// SAFE - apply sanitization first
import { sanitizeSearchQuery } from '../lib/inputSanitization';
await supabase.rpc('search', { query: sanitizeSearchQuery(userInput) });
```

**Recommendation:** Audit all `.rpc()` calls and LIKE queries for user input sanitization.

---

## Testing Plan

### Manual Testing

1. **XSS Attack Vectors:**
   - Try inserting `<script>alert('XSS')</script>` in all text fields
   - Verify it gets stripped/sanitized
   - Check that output displays safely

2. **URL Injection:**
   - Try `javascript:alert('XSS')` in URL fields
   - Try `data:text/html,<script>alert('XSS')</script>` in URL fields
   - Verify both are rejected

3. **HTML Injection:**
   - Try `<iframe src="evil.com"></iframe>` in descriptions
   - Try `<img src=x onerror=alert('XSS')>` in content
   - Verify both are stripped

### Automated Testing

Create unit tests for sanitization functions:

```typescript
// tests/inputSanitization.test.ts
import { sanitizeText, sanitizeUrl, containsXss } from '../lib/inputSanitization';

describe('Input Sanitization', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script>Hello';
    expect(sanitizeText(input)).toBe('Hello');
  });
  
  it('should reject javascript: URLs', () => {
    const input = 'javascript:alert("XSS")';
    expect(sanitizeUrl(input)).toBeNull();
  });
  
  it('should detect XSS patterns', () => {
    expect(containsXss('<script>')).toBe(true);
    expect(containsXss('Hello world')).toBe(false);
  });
});
```

---

## Success Criteria

✅ **Complete when:**
1. All 25 high-priority files updated with sanitization
2. All URL fields validated with `sanitizeUrl()`
3. All text inputs sanitized with `sanitizeText()` or `stripHtml()`
4. Manual XSS testing passes on all forms
5. Zero LSP errors related to sanitization
6. Documentation updated with sanitization requirements

---

## Estimated Effort

- **High Priority Files:** 25 files × 10 minutes = ~4 hours
- **Testing:** 1 hour
- **Documentation:** 30 minutes
- **Total:** ~5.5 hours

---

## Next Steps

1. ✅ Create sanitization service (DONE)
2. 🟡 Apply sanitization to high-priority files (IN PROGRESS)
3. ⏳ Apply sanitization to medium-priority files
4. ⏳ Apply URL validation to all URL fields
5. ⏳ Create unit tests
6. ⏳ Manual XSS testing
7. ⏳ Architect review

---

## Maintenance

**Future Development:**
- Add sanitization to the `useEmailVerificationGuard` hook to enforce it automatically
- Create a React hook wrapper for sanitized mutations
- Add linter rules to detect unsanitized database operations

**Code Review Checklist:**
- [ ] All new TextInput fields have sanitization applied
- [ ] All new database mutations use sanitization functions
- [ ] All URL fields use `sanitizeUrl()` validation
- [ ] No raw user input goes directly to database

---

## References

- Input sanitization service: `src/lib/inputSanitization.ts`
- OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP SQL Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
