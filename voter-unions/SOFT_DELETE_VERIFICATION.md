# Soft Delete Verification Report - Boycott Comments & Labor Power Tables

**Date:** October 17, 2025  
**Task:** Verify "assumed" soft delete filters for `boycott_comments` and labor power tables  
**Status:** ✅ **VERIFIED** - Schema-level protection confirmed, no client queries yet implemented

---

## Executive Summary

The architect flagged `boycott_comments` and labor power tables as having "assumed" soft delete filters. Verification reveals these tables are **schema-only** (not yet implemented in the UI), but have **RLS policies that enforce soft delete filtering at the database level**.

**Result:** ✅ **NO ACTION REQUIRED** - Database-level protection is sufficient until UI implementation begins.

---

## Table 1: `boycott_comments`

### Schema Implementation ✅

**File:** `consumer-schema.sql`

```sql
-- Line 38-46
CREATE TABLE IF NOT EXISTS boycott_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES boycott_proposals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP  -- ✅ Soft delete column exists
);
```

### Index Implementation ✅

**File:** `consumer-schema.sql` (line 110)

```sql
CREATE INDEX IF NOT EXISTS idx_boycott_comments_proposal 
  ON boycott_comments(proposal_id) 
  WHERE deleted_at IS NULL;  -- ✅ Partial index for performance
```

### RLS Policy Implementation ✅

**File:** `consumer-schema.sql` (lines 160-174)

```sql
-- SELECT policy enforces soft delete filtering
CREATE POLICY "Anyone can view non-deleted comments"
    ON boycott_comments FOR SELECT
    USING (deleted_at IS NULL);  -- ✅ Database enforces filtering

CREATE POLICY "Authenticated users can comment"
    ON boycott_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON boycott_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own comments"
    ON boycott_comments FOR UPDATE
    USING (auth.uid() = user_id);
```

### Client-Side Implementation Status

**Search Results:** ❌ **NOT IMPLEMENTED**

```bash
grep -r "boycott_comments" voter-unions/src
# No matches found
```

**Conclusion:** The table exists in the schema with full RLS protection, but **no UI code queries this table yet**. When implemented, developers MUST add `.is('deleted_at', null)` to queries, but RLS provides defense in depth.

---

## Table 2: Labor Power Tables

### Schema Implementation ✅

**File:** `labor-power-schema.sql`

Four main content tables with soft delete:

#### 1. `corporate_exploitation` (line 20-42)
```sql
CREATE TABLE IF NOT EXISTS corporate_exploitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  deleted_at TIMESTAMPTZ,  -- ✅ Soft delete column
  ...
);
```

#### 2. `organizing_resistance` (line 44-72)
```sql
CREATE TABLE IF NOT EXISTS organizing_resistance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  deleted_at TIMESTAMPTZ,  -- ✅ Soft delete column
  ...
);
```

#### 3. `worker_rights_legislation` (line 74-101)
```sql
CREATE TABLE IF NOT EXISTS worker_rights_legislation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  deleted_at TIMESTAMPTZ,  -- ✅ Soft delete column
  ...
);
```

#### 4. `solidarity_victories` (line 103-131)
```sql
CREATE TABLE IF NOT EXISTS solidarity_victories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  deleted_at TIMESTAMPTZ,  -- ✅ Soft delete column
  ...
);
```

### Index Implementation ✅

**File:** `labor-power-schema.sql` (lines 168-186)

All tables have partial indexes for soft delete:

```sql
CREATE INDEX IF NOT EXISTS idx_exploitation_corporation 
  ON corporate_exploitation(corporation_name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizing_corporation 
  ON organizing_resistance(corporation_name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_legislation_jurisdiction 
  ON worker_rights_legislation(jurisdiction) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_victories_industry 
  ON solidarity_victories(industry) WHERE deleted_at IS NULL;
```

### RLS Policy Implementation ✅

**File:** `labor-power-schema.sql` (lines 214-225)

All tables have RLS policies enforcing soft delete:

```sql
-- Corporate Exploitation
CREATE POLICY "Anyone can view non-deleted exploitation reports" 
  ON corporate_exploitation
  FOR SELECT USING (deleted_at IS NULL);  -- ✅ Database enforces filtering

-- Organizing Resistance
CREATE POLICY "Anyone can view non-deleted organizing campaigns" 
  ON organizing_resistance
  FOR SELECT USING (deleted_at IS NULL);  -- ✅ Database enforces filtering

-- Worker Rights Legislation (continuing in schema...)
CREATE POLICY "Anyone can view non-deleted legislation" 
  ON worker_rights_legislation
  FOR SELECT USING (deleted_at IS NULL);  -- ✅ Database enforces filtering

-- Solidarity Victories (continuing in schema...)
CREATE POLICY "Anyone can view non-deleted victories" 
  ON solidarity_victories
  FOR SELECT USING (deleted_at IS NULL);  -- ✅ Database enforces filtering
```

### Client-Side Implementation Status

**Search Results:** ❌ **NOT IMPLEMENTED**

```bash
grep -r "corporate_exploitation\|organizing_resistance\|worker_rights_legislation\|solidarity_victories" voter-unions/src
# No matches found
```

**Conclusion:** All four labor power tables exist in the schema with full RLS protection, but **no UI code queries these tables yet**. Implementation is pending.

---

## Supporting Tables

### `labor_power_bookmarks` (line 154-162)

Also has soft delete protection:

```sql
CREATE TABLE IF NOT EXISTS labor_power_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- ✅ Soft delete column
  UNIQUE(user_id, content_type, content_id)
);
```

**RLS Policy (line 274):**
```sql
CREATE POLICY "Users can view their non-deleted bookmarks" 
  ON labor_power_bookmarks
  FOR SELECT USING (user_id = (SELECT auth.uid()) AND deleted_at IS NULL);
```

---

## Security Analysis

### ✅ Defense in Depth - Two Layers of Protection

1. **Database Layer (RLS Policies)** ← **Primary Protection**
   - Even if client code forgets `.is('deleted_at', null)`, RLS blocks deleted records
   - Enforced at PostgreSQL level, cannot be bypassed by client

2. **Client Layer (Query Filters)** ← **Performance Optimization**
   - When implemented, should add `.is('deleted_at', null)` to avoid RLS overhead
   - Partial indexes optimize queries that include the filter

### ⚠️ Implementation Recommendations

When these tables are eventually implemented in the UI:

#### **DO:**
```typescript
// Correct - client-side filter for performance
const { data } = await supabase
  .from('boycott_comments')
  .select('*')
  .eq('proposal_id', proposalId)
  .is('deleted_at', null)  // ✅ Add this filter
  .order('created_at', { ascending: false });
```

#### **DON'T:**
```typescript
// Wrong - relies only on RLS (works but slower)
const { data } = await supabase
  .from('boycott_comments')
  .select('*')
  .eq('proposal_id', proposalId)
  // ❌ Missing .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

**Why both?**
- RLS provides security (deleted records are blocked)
- Client filter provides performance (uses partial index)
- Together they implement defense in depth

---

## Verification Methods

### Method 1: Schema Inspection ✅

Verified that:
- All tables have `deleted_at TIMESTAMPTZ` columns
- All tables have partial indexes `WHERE deleted_at IS NULL`
- All tables have RLS policies `USING (deleted_at IS NULL)`

### Method 2: Codebase Search ✅

Confirmed that:
- NO client-side queries exist for `boycott_comments`
- NO client-side queries exist for labor power tables
- Tables are schema-only awaiting UI implementation

### Method 3: RLS Policy Review ✅

Verified that:
- SELECT policies enforce `deleted_at IS NULL` check
- Database blocks deleted records even without client filters
- Proper soft delete policies exist for UPDATE operations

---

## Comparison with Audit Report Assumptions

### Original Audit Report Claim:

> **`boycott_comments`** - ✅ Assumed filtered (RLS policy enforces)  
> **`labor_power` tables** - ✅ Assumed filtered (similar pattern)

### Verification Result:

The audit was **CORRECT** to label these as "assumed filtered" because:

1. ✅ RLS policies DO enforce soft delete filtering
2. ✅ No client queries exist to audit (schema-only)
3. ✅ When implemented, client queries should add filters for performance
4. ✅ Defense in depth is properly configured

**The "assumption" was valid** - RLS provides guaranteed protection.

---

## Testing Recommendations

When these tables are implemented, add integration tests to verify:

### Test 1: Soft Delete Filtering
```sql
-- Insert a comment
INSERT INTO boycott_comments (proposal_id, user_id, content)
VALUES ('test-proposal', 'test-user', 'Test comment');

-- Soft delete it
UPDATE boycott_comments 
SET deleted_at = NOW() 
WHERE proposal_id = 'test-proposal';

-- Verify it doesn't appear in SELECT
SELECT * FROM boycott_comments 
WHERE proposal_id = 'test-proposal';
-- Expected: 0 rows (blocked by RLS)
```

### Test 2: Client Filter Performance
```typescript
// Test that query uses partial index
const { data } = await supabase
  .from('boycott_comments')
  .select('*')
  .eq('proposal_id', proposalId)
  .is('deleted_at', null);

// Verify with EXPLAIN ANALYZE that idx_boycott_comments_proposal is used
```

### Test 3: Soft Delete Permissions
```typescript
// Test that only creators can soft-delete their own comments
const { error } = await supabase
  .from('boycott_comments')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', commentId)
  .eq('user_id', user.id);  // RLS enforces this

// Should succeed for creator, fail for others
```

---

## Conclusion

✅ **VERIFICATION COMPLETE - NO ISSUES FOUND**

Both `boycott_comments` and all labor power tables have:
- Proper `deleted_at` columns
- Partial indexes for performance
- RLS policies enforcing soft delete filtering
- No client-side code yet (schema-only)

**Recommendation:** ✅ **APPROVED FOR PRODUCTION**

When these tables are eventually used in the UI, developers should:
1. Add `.is('deleted_at', null)` to queries for performance
2. Follow existing patterns from other soft-deletable tables
3. Trust RLS as the ultimate security layer

**No immediate action required** - the current schema implementation is secure and production-ready.

---

## Sign-Off

**Verification Method:** Schema review + RLS policy analysis + codebase search  
**Files Audited:** `consumer-schema.sql`, `labor-power-schema.sql`, `voter-unions/src/**/*`  
**Confidence Level:** ✅ Very High  
**Recommendation:** ✅ VERIFIED - Schema-level protection is sufficient
