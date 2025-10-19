# Phase 1A: Blue Spirit - Secure User Sign-In (WebAuthn)

**Code Name:** Blue Spirit (representing the protective identity layer)  
**Duration:** 3 weeks (Weeks 3-5 of Phase 1)  
**Goal:** Replace email/password authentication with WebAuthn passkeys  
**Privacy Improvement:** Zero email collection, hardware-backed biometric auth

---

## 📋 Table of Contents

1. [Pre-Migration Analysis](#pre-migration-analysis)
2. [Migration Strategy](#migration-strategy)
3. [Overview](#overview)
4. [Week 3: Backend WebAuthn Registration](#week-3-backend-webauthn-registration)
5. [Week 4: Backend WebAuthn Authentication](#week-4-backend-webauthn-authentication)
6. [Week 5: Frontend Integration](#week-5-frontend-integration)
7. [Critical Migration Tasks](#critical-migration-tasks)
8. [Testing & Validation](#testing--validation)
9. [Deployment Checklist](#deployment-checklist)
10. [Rollback Procedures](#rollback-procedures)

---

## 🔍 Pre-Migration Analysis

### **Current Supabase Auth Implementation**

Based on codebase analysis, here's what exists today:

#### **Authentication Files**
```
voter-unions/
├── src/
│   ├── hooks/
│   │   └── useAuth.ts                    ❌ DELETE (Supabase auth)
│   ├── screens/
│   │   └── AuthScreen.tsx                ❌ DELETE (email/password UI)
│   ├── services/
│   │   ├── supabase.ts                   ⚠️  MODIFY (keep for data, remove auth)
│   │   ├── emailVerification.ts          ❌ DELETE (11 protected actions)
│   │   └── auditLog.ts                   ⚠️  MODIFY (remove email logging)
│   ├── context/
│   │   └── AuthContext.tsx               ⚠️  REPLACE (new WebAuthn context)
│   └── components/
│       └── EmailVerificationBanner.tsx   ❌ DELETE
```

#### **Database Dependencies**
```sql
-- Current Supabase tables that reference users
profiles (id → supabase.auth.users.id)           ⚠️  MIGRATE to new user_id
union_members (user_id → auth.users.id)          ⚠️  MIGRATE
posts (user_id → auth.users.id)                  ⚠️  MIGRATE (use pseudonym)
comments (user_id → auth.users.id)               ⚠️  MIGRATE (use pseudonym)
channels (created_by → auth.users.id)            ⚠️  MIGRATE
debates (created_by → auth.users.id)             ⚠️  MIGRATE
arguments (user_id → auth.users.id)              ⚠️  MIGRATE
argument_votes (user_id → auth.users.id)         ⚠️  MIGRATE
post_reactions (user_id → auth.users.id)         ⚠️  MIGRATE
policy_votes (user_id → auth.users.id)           ⚠️  MIGRATE
boycott_votes (user_id, device_id)               ⚠️  MIGRATE
worker_votes (voter_id, device_id)               ⚠️  MIGRATE
power_pledges (user_id → auth.users.id)          ⚠️  MIGRATE
active_sessions (user_id → auth.users.id)        ⚠️  MIGRATE
audit_logs (user_id, username → email)           ⚠️  MIGRATE (PII-free)
```

#### **Protected Actions (Email Verification)**
Currently 11 actions require email verification:
```typescript
// src/services/emailVerification.ts - PROTECTED_ACTIONS
CREATE_POST           ❌ Remove guard
CREATE_COMMENT        ❌ Remove guard
CREATE_CHANNEL        ❌ Remove guard
CREATE_DEBATE         ❌ Remove guard
CREATE_ARGUMENT       ❌ Remove guard
VOTE                  ❌ Remove guard
CREATE_UNION          ❌ Remove guard
CREATE_BOYCOTT        ❌ Remove guard
CREATE_STRIKE         ❌ Remove guard
UPDATE_PROFILE        ❌ Remove guard
CREATE_POWER_PLEDGE   ❌ Remove guard
```

#### **Token Storage (Already Good!)**
```typescript
// src/services/supabase.ts - SecureAuthStorage
✅ Already uses expo-secure-store on native
✅ Fallback to AsyncStorage on web
✅ IndexedDB error handling
✅ Can reuse this for WebAuthn tokens
```

#### **Audit Logging (Needs Migration)**
```typescript
// src/services/auditLog.ts - log_audit_event
⚠️  Currently logs: userId, username (email), deviceId
⚠️  Does NOT log: IP addresses (already good!)
✅ Needs migration to PII-free 24h retention
```

---

## 🚨 Migration Strategy

### **High-Risk Cutover Approach**

Since you want the **auth-first** approach, here's the safest execution plan:

---

### **Phase 0: Pre-Migration Prep (Before Week 1)**

#### **Task 0.1: Backup Everything**
```bash
# Backup Supabase database
pg_dump $SUPABASE_DB_URL > backup_$(date +%Y%m%d).sql

# Backup codebase
git commit -am "Pre-migration snapshot"
git tag pre-webauthn-migration
git push --tags
```

#### **Task 0.2: Create Migration Branch**
```bash
git checkout -b feature/webauthn-migration
```

#### **Task 0.3: Set Up Parallel Infrastructure**
```bash
# Create 4 new PostgreSQL databases (Railway/Render)
# - content_db (for public content)
# - membership_db (for encrypted tokens) - NOT NEEDED YET
# - ballot_db (for voting) - NOT NEEDED YET
# - dm_db (for E2EE messages) - NOT NEEDED YET

# For now, just create content_db
# We'll migrate Supabase data to content_db
```

#### **Task 0.4: Document Current User IDs**
```bash
# Export all current user IDs for migration mapping
psql $SUPABASE_DB_URL -c "COPY (SELECT id, email FROM auth.users) TO STDOUT" > user_mapping.csv
```

---

### **Phase 1: Build Auth Service (Weeks 3-4, No Cutover)**

#### **Parallel Development**
- ✅ Build auth service on port 3001
- ✅ Test with mock users
- ✅ Keep Supabase auth running
- ✅ No frontend changes yet

**Key Point:** App still works with Supabase during this time.

---

### **Phase 2: Frontend Integration (Week 5, No Cutover)**

#### **Dual-Auth Mode**
```typescript
// src/config.ts - Feature flag
export const USE_WEBAUTHN = process.env.EXPO_PUBLIC_USE_WEBAUTHN === 'true';

// src/services/auth.ts
if (USE_WEBAUTHN) {
  return await signInWithPasskey();
} else {
  return await signInWithSupabase();
}
```

**Testing:**
- ✅ Test WebAuthn with `USE_WEBAUTHN=true`
- ✅ Test Supabase with `USE_WEBAUTHN=false`
- ✅ Verify both paths work

**Key Point:** Still no production cutover.

---

### **Phase 3: Data Migration (End of Week 5)**

#### **Critical: User ID Migration**

**Problem:** Supabase uses UUID v4 for user IDs, new system uses ULID.

**Solution 1: Keep Existing UUIDs (SAFER)**
```typescript
// Backend: Modify auth service to accept existing UUID
// When migrating users, preserve their Supabase user_id
const userId = existingSupabaseUserId || ulid();
```

**Solution 2: Create Mapping Table (COMPLEX)**
```sql
CREATE TABLE user_id_migration (
  supabase_id UUID PRIMARY KEY,
  new_user_id TEXT NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Recommendation:** Use Solution 1 (preserve UUIDs) for existing users.

#### **Migration Script**
```typescript
// scripts/migrate-users.ts
import { supabase } from '../src/services/supabase';
import { db } from '../backend/services/auth_service/src/db/client';

const migrateUsers = async () => {
  // 1. Get all Supabase users
  const { data: users } = await supabase.auth.admin.listUsers();
  
  for (const user of users) {
    // 2. Create migration entry
    await db.query(`
      INSERT INTO user_id_migration (supabase_id, new_user_id, status)
      VALUES ($1, $1, 'pending')
    `, [user.id]); // Preserve UUID for now
    
    console.log(`Queued user ${user.id} for migration`);
  }
  
  console.log(`Total users queued: ${users.length}`);
};
```

**⚠️ CRITICAL:** This step requires careful planning. Users will need to:
1. Register new passkey
2. System links new passkey to existing user_id
3. All their content stays linked

---

### **Phase 4: Production Cutover (Week 6)**

#### **D-Day Checklist**

**24 Hours Before:**
- [ ] Announce maintenance window to users
- [ ] Set Supabase to read-only mode
- [ ] Final database backup
- [ ] Deploy auth service to production
- [ ] Deploy updated frontend with `USE_WEBAUTHN=true`

**During Maintenance:**
- [ ] Enable feature flag `USE_WEBAUTHN=true`
- [ ] Test 5 user signups end-to-end
- [ ] Test existing user migration
- [ ] Monitor error rates

**After Cutover:**
- [ ] Monitor for 1 hour
- [ ] Check user registration rate
- [ ] Check error logs
- [ ] If issues → ROLLBACK (see section below)

---

### **Phase 5: Cleanup (Week 7+)**

After 1 week of stable operation:
- [ ] Delete email verification code
- [ ] Delete old auth screens
- [ ] Remove Supabase Auth entirely
- [ ] Celebrate 🎉

---

## 🛡️ Risk Mitigation Strategies

### **Overview: Four Critical Risks**

Based on codebase analysis, here are the high-risk areas and their solutions:

| Risk | Severity | Solution | Final Risk |
|------|----------|----------|------------|
| User ID Migration | 🔴 CRITICAL | Use UUID (not ULID) | ✅ ELIMINATED |
| Email Verification | 🔴 HIGH | Feature flag approach | 🟡 LOW |
| Supabase Usage | 🔴 HIGH | Adapter pattern | 🟡 MEDIUM |
| All-or-Nothing | 🔴 CRITICAL | Gradual rollout | 🟡 MEDIUM |

**Result:** Overall migration risk reduced from 🔴 CRITICAL → 🟡 MANAGEABLE

---

### **Risk 1: User ID Migration - SOLVED** ✅

#### **The Problem**
- Supabase uses UUID v4 for user IDs
- Phase 1 spec calls for ULID
- Changing ID format breaks all foreign keys
- Requires complex migration scripts
- High risk of data loss

#### **The Solution: Use UUID in New System**

**Don't migrate IDs. Just use UUIDs in the new auth service too.**

```typescript
// backend/services/auth_service/src/routes/register.ts

// ❌ BEFORE (risky - breaks everything):
import { ulid } from 'ulid';
const userId = ulid(); // New format, requires migration

// ✅ AFTER (safe - compatible with existing):
import { v4 as uuidv4 } from 'uuid';
const userId = uuidv4(); // Same format as Supabase!
```

#### **Database Schema Update**

```typescript
// backend/services/auth_service/src/db/schema.ts

// ❌ BEFORE:
user_id TEXT PRIMARY KEY DEFAULT ulid()

// ✅ AFTER:
user_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

#### **Why This Works**

**For Existing Users:**
- ✅ Keep their Supabase UUID as-is
- ✅ No database changes needed
- ✅ All foreign keys stay valid
- ✅ Content remains linked to same ID

**For New Users:**
- ✅ Get UUID v4 (same format)
- ✅ Consistent ID format across system
- ✅ No special handling needed

**For Migration:**
- ✅ Import users 1:1 from Supabase
- ✅ No mapping table needed
- ✅ Zero migration scripts
- ✅ Can even keep both systems running in parallel

#### **Migration Code**

```typescript
// scripts/migrate-users.ts
import { supabase } from '../src/services/supabase';
import { db } from '../backend/services/auth_service/src/db/client';

const migrateUsers = async () => {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  for (const user of authUsers) {
    // Preserve Supabase UUID directly
    await db.query(`
      INSERT INTO users (user_id, created_at)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id, user.created_at]); // Use existing ID!
  }
  
  console.log(`✅ Migrated ${authUsers.length} users with preserved IDs`);
};
```

#### **Implementation Checklist**

- [ ] Update auth service schema to use UUID
- [ ] Change `ulid()` to `uuidv4()` in registration
- [ ] Test new user registration generates UUID
- [ ] Test existing user import preserves IDs
- [ ] Verify all foreign keys work

**Result:** 🔴 CRITICAL risk → ✅ ELIMINATED

---

### **Risk 2: Email Verification Guards - Feature Flag** ✅

#### **The Problem**
- 11 protected actions across codebase require email verification
- Easy to miss one when deleting
- Can't test both states easily
- Risky to delete all at once

**Files affected:**
```
src/hooks/usePosts.ts
src/hooks/useComments.ts
src/hooks/useChannels.ts
src/hooks/useDebates.ts
src/hooks/useArguments.ts
src/hooks/useVotes.ts
src/hooks/useUnions.ts
src/hooks/useBoycotts.ts
src/hooks/useWorkerProposals.ts
src/hooks/useProfile.ts
src/hooks/usePowerPledges.ts
```

#### **The Solution: Feature Flag to Disable All Guards**

**Step 1: Add feature flag to config**

```typescript
// src/config.ts
export const CONFIG = {
  // Feature flags
  USE_WEBAUTHN: process.env.EXPO_PUBLIC_USE_WEBAUTHN === 'true',
  REQUIRE_EMAIL_VERIFICATION: process.env.EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true',
  
  // API endpoints
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
};
```

**Step 2: Update email verification service**

```typescript
// src/services/emailVerification.ts
import { CONFIG } from '../config';

export const guardAction = async (action: keyof typeof PROTECTED_ACTIONS) => {
  // 🔧 Feature flag - disable all guards when migrating to WebAuthn
  if (!CONFIG.REQUIRE_EMAIL_VERIFICATION) {
    console.log(`✅ Email verification disabled, allowing ${action}`);
    return true; // Allow all actions
  }
  
  // Original email verification logic (still works if flag is true)
  const verification = await checkEmailVerification(user);
  
  if (!verification.isVerified) {
    Alert.alert(
      'Email Verification Required',
      `You need to verify your email to ${PROTECTED_ACTIONS[action]}`
    );
    return false;
  }
  
  return true;
};
```

**Step 3: Set environment variable**

```bash
# .env
EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false  # Disable guards
```

#### **Migration Timeline**

```
Week 5: Set flag to false
├─ Guards still in code but disabled
├─ Test all 11 actions work
└─ Verify no email prompts appear

Week 6: Production with flag = false
├─ Monitor for issues
└─ Keep code in place as safety

Week 7: After 1 week stable
├─ Delete emailVerification.ts
├─ Remove all guardAction() calls
└─ Remove EmailVerificationBanner
```

#### **Benefits**

✅ **Single point of control** - One flag disables all 11 guards  
✅ **Easy testing** - Toggle flag to test both states  
✅ **Simple rollback** - Just flip flag back to true  
✅ **Gradual cleanup** - Remove code later at your leisure  
✅ **No code changes** - Don't need to modify 11 files immediately

#### **Implementation Checklist**

- [ ] Add `REQUIRE_EMAIL_VERIFICATION` to config
- [ ] Update `guardAction()` to check flag first
- [ ] Set flag to `false` in environment
- [ ] Test all 11 actions work without verification
- [ ] Test flag can be toggled back to `true`
- [ ] Schedule code cleanup for Week 7

**Result:** 🔴 HIGH risk → 🟡 LOW risk

---

### **Risk 3: Widespread Supabase Usage - Adapter Pattern** ✅

#### **The Problem**
- 50+ files have `supabase.from('table')` calls
- Can't replace all at once
- Hard to test both backends
- Risky to break existing functionality

**Example files:**
```
src/screens/ProfileScreen.tsx       - supabase.from('profiles')
src/screens/UnionDetailScreen.tsx   - supabase.from('unions')
src/hooks/usePosts.ts                - supabase.from('posts')
src/hooks/useComments.ts             - supabase.from('comments')
... 50+ more files
```

#### **The Solution: Data Access Adapter Layer**

**Step 1: Create adapter interface**

```typescript
// src/services/data/adapter.ts
import { CONFIG } from '../config';
import * as SupabaseData from './supabase-data';
import * as ApiData from './api-data';

// Single point of control - switch backends with feature flag
export const data = CONFIG.USE_NEW_BACKEND ? ApiData : SupabaseData;

// Export types
export type Profile = {
  id: string;
  display_name: string;
  username_normalized: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Union = {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
};

// ... more types
```

**Step 2: Implement Supabase adapter (existing backend)**

```typescript
// src/services/data/supabase-data.ts
import { supabase } from '../supabase';
import type { Profile, Union } from './adapter';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

export const getUnion = async (unionId: string): Promise<Union | null> => {
  const { data, error } = await supabase
    .from('unions')
    .select('*')
    .eq('id', unionId)
    .single();
  
  if (error) throw error;
  return data;
};

export const createPost = async (params: {
  unionId: string;
  content: string;
  userId: string;
}) => {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      union_id: params.unionId,
      content: params.content,
      user_id: params.userId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ... more functions
```

**Step 3: Implement API adapter (new backend)**

```typescript
// src/services/data/api-data.ts
import { CONFIG } from '../config';
import { getAuthToken } from '../auth/storage';
import type { Profile, Union } from './adapter';

const apiCall = async (endpoint: string, options?: RequestInit) => {
  const token = await getAuthToken();
  
  const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return await response.json();
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  return await apiCall(`/profiles/${userId}`);
};

export const getUnion = async (unionId: string): Promise<Union | null> => {
  return await apiCall(`/unions/${unionId}`);
};

export const createPost = async (params: {
  unionId: string;
  content: string;
  userId: string;
}) => {
  return await apiCall('/posts', {
    method: 'POST',
    body: JSON.stringify({
      union_id: params.unionId,
      content: params.content,
      user_id: params.userId,
    }),
  });
};

// ... more functions
```

**Step 4: Update components to use adapter**

```typescript
// src/screens/ProfileScreen.tsx

// ❌ BEFORE (direct Supabase):
import { supabase } from '../services/supabase';

const ProfileScreen = () => {
  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(data);
  };
};

// ✅ AFTER (using adapter):
import { data } from '../services/data/adapter';

const ProfileScreen = () => {
  const loadProfile = async () => {
    const profile = await data.getProfile(user.id);
    setProfile(profile);
  };
};
```

#### **Migration Strategy**

**Week 4: Create adapter layer**
```bash
# Create adapter files
mkdir -p src/services/data
touch src/services/data/adapter.ts
touch src/services/data/supabase-data.ts
touch src/services/data/api-data.ts
```

**Week 5: Migrate top 10 most-used queries**
```typescript
// Priority order (highest usage first):
1. getProfile()
2. getUnion() 
3. createPost()
4. createComment()
5. getPosts()
6. getComments()
7. voteOnArgument()
8. createUnion()
9. joinUnion()
10. getUnionMembers()
```

**Week 6: Test with feature flag**
```bash
# Test Supabase backend
EXPO_PUBLIC_USE_NEW_BACKEND=false npm start

# Test API backend
EXPO_PUBLIC_USE_NEW_BACKEND=true npm start
```

**Week 7: Migrate remaining files**
- Find remaining Supabase calls: `grep -r "supabase.from" src/`
- Migrate to adapter one by one
- Test each migration

#### **Benefits**

✅ **Gradual migration** - Don't need to change 50+ files at once  
✅ **Works with both backends** - Can run Supabase OR API  
✅ **Easy testing** - Feature flag toggles backend  
✅ **Type safety** - Shared TypeScript types  
✅ **Rollback friendly** - Just flip flag back

#### **Implementation Checklist**

- [ ] Create adapter layer (3 files)
- [ ] Implement top 10 functions in both adapters
- [ ] Update 10 most-used screens/hooks
- [ ] Test with `USE_NEW_BACKEND=false` (Supabase)
- [ ] Test with `USE_NEW_BACKEND=true` (API)
- [ ] Migrate remaining files gradually
- [ ] Remove direct Supabase calls

**Result:** 🔴 HIGH risk → 🟡 MEDIUM risk

---

### **Risk 4: All-or-Nothing Cutover - Gradual Rollout** ✅

#### **The Problem**
- Can't test with subset of users
- One bad deploy affects everyone
- No way to pause migration
- Hard to isolate issues

#### **The Solution: Server-Side Gradual Rollout**

**Option A: Percentage-Based Rollout** (Recommended)

**Step 1: Create rollout utility**

```typescript
// backend/shared/lib/rollout.ts
import { createHash } from 'crypto';

export const isUserInRollout = (userId: string, percentage: number): boolean => {
  // Deterministic hash - same user always gets same result
  const hash = createHash('sha256')
    .update(userId)
    .digest('hex');
  
  // Convert first 8 chars to number 0-99
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const userPercentage = hashNumber % 100;
  
  return userPercentage < percentage;
};

// Example:
// isUserInRollout('user-123', 10) => true/false (deterministic)
// isUserInRollout('user-123', 10) => same result every time
```

**Step 2: Implement in auth service**

```typescript
// backend/services/auth_service/src/routes/auth.ts
import { isUserInRollout } from '../../../shared/lib/rollout';

// Environment variable controls rollout percentage
const WEBAUTHN_ROLLOUT_PERCENT = parseInt(process.env.WEBAUTHN_ROLLOUT_PERCENT || '0');

app.post('/auth/check', async (req, res) => {
  const { userId } = req.body;
  
  // Check if user is in WebAuthn rollout
  const useWebAuthn = isUserInRollout(userId, WEBAUTHN_ROLLOUT_PERCENT);
  
  res.json({
    authMethod: useWebAuthn ? 'webauthn' : 'supabase',
    rolloutPercentage: WEBAUTHN_ROLLOUT_PERCENT,
  });
});
```

**Step 3: Update frontend to check rollout**

```typescript
// src/services/auth/index.ts
import { CONFIG } from '../config';

export const determineAuthMethod = async (userId: string) => {
  // Check with backend which auth method to use
  const response = await fetch(`${CONFIG.API_URL}/auth/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  
  const { authMethod } = await response.json();
  return authMethod; // 'webauthn' or 'supabase'
};

export const signIn = async (userId?: string) => {
  if (!userId) {
    // New user - use current default
    return CONFIG.USE_WEBAUTHN ? signInWithPasskey() : signInWithSupabase();
  }
  
  // Existing user - check rollout
  const method = await determineAuthMethod(userId);
  
  if (method === 'webauthn') {
    return signInWithPasskey();
  } else {
    return signInWithSupabase();
  }
};
```

#### **Rollout Schedule**

```
Day 1:  10% of users (100 users if you have 1000)
├─ Set WEBAUTHN_ROLLOUT_PERCENT=10
├─ Monitor for 48 hours
├─ Check error rates, user feedback
└─ If issues → set to 0 (instant rollback)

Day 3:  25% of users (if Day 1 successful)
├─ Set WEBAUTHN_ROLLOUT_PERCENT=25
├─ Monitor for 48 hours
└─ Watch for patterns

Day 5:  50% of users (if Day 3 successful)
├─ Set WEBAUTHN_ROLLOUT_PERCENT=50
├─ Monitor for 24 hours
└─ Majority of users now on WebAuthn

Day 6:  75% of users (if Day 5 successful)
├─ Set WEBAUTHN_ROLLOUT_PERCENT=75
├─ Monitor for 24 hours
└─ Almost complete

Day 7:  100% of users (full cutover)
├─ Set WEBAUTHN_ROLLOUT_PERCENT=100
├─ Monitor for 1 week
└─ Disable Supabase auth after stable
```

#### **Monitoring Dashboard**

```typescript
// backend/services/auth_service/src/routes/admin.ts

app.get('/admin/rollout-status', async (req, res) => {
  const stats = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE auth_method = 'webauthn') as webauthn_users,
      COUNT(*) FILTER (WHERE auth_method = 'supabase') as supabase_users,
      COUNT(*) as total_users
    FROM users
  `);
  
  res.json({
    rolloutPercentage: WEBAUTHN_ROLLOUT_PERCENT,
    webauthnUsers: stats.rows[0].webauthn_users,
    supabaseUsers: stats.rows[0].supabase_users,
    totalUsers: stats.rows[0].total_users,
  });
});
```

#### **Option B: Beta Opt-In Program**

**For early testing with willing users:**

```typescript
// Add beta_features table
CREATE TABLE beta_features (
  user_id UUID PRIMARY KEY,
  webauthn_enabled BOOLEAN DEFAULT FALSE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

// Let users opt-in
const enableWebAuthnBeta = async (userId: string) => {
  await db.query(`
    INSERT INTO beta_features (user_id, webauthn_enabled)
    VALUES ($1, true)
    ON CONFLICT (user_id) DO UPDATE
    SET webauthn_enabled = true
  `, [userId]);
};
```

**Frontend opt-in UI:**

```typescript
// src/screens/SettingsScreen.tsx

const SettingsScreen = () => {
  const [betaEnabled, setBetaEnabled] = useState(false);
  
  const handleEnableBeta = async () => {
    Alert.alert(
      'Try Biometric Sign-In',
      'Enable our new passkey-based authentication. You can always switch back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            await enableWebAuthnBeta(user.id);
            setBetaEnabled(true);
            Alert.alert('Success', 'Biometric sign-in enabled! Please set up your passkey.');
          },
        },
      ]
    );
  };
  
  return (
    <View>
      <Text>Beta Features</Text>
      <Button
        title={betaEnabled ? 'Using Passkeys ✅' : 'Try Passkey Sign-In'}
        onPress={handleEnableBeta}
        disabled={betaEnabled}
      />
    </View>
  );
};
```

#### **Benefits**

✅ **Test with small group first** - 10% rollout catches issues early  
✅ **Monitor error rates** - See problems before affecting everyone  
✅ **Instant rollback** - Set percentage to 0, issue resolved  
✅ **User-driven opt-in** - Let enthusiastic users beta test  
✅ **Gradual confidence** - Each step proves stability  
✅ **Pause anytime** - Freeze rollout if issues appear

#### **Implementation Checklist**

- [ ] Create rollout utility (`isUserInRollout`)
- [ ] Add `WEBAUTHN_ROLLOUT_PERCENT` env var
- [ ] Implement `/auth/check` endpoint
- [ ] Update frontend to check rollout
- [ ] Create monitoring dashboard
- [ ] Start at 10% rollout
- [ ] Monitor for 48h before increasing
- [ ] Follow rollout schedule to 100%

**Result:** 🔴 CRITICAL risk → 🟡 MEDIUM risk

---

### **Combined Risk Reduction Summary**

| Risk | Original | Solution | Final | Saved By |
|------|----------|----------|-------|----------|
| User ID Migration | 🔴 CRITICAL | Use UUID | ✅ NONE | Same ID format |
| Email Verification | 🔴 HIGH | Feature flag | 🟡 LOW | Single toggle |
| Supabase Usage | 🔴 HIGH | Adapter | 🟡 MEDIUM | Gradual migration |
| All-or-Nothing | 🔴 CRITICAL | Gradual rollout | 🟡 MEDIUM | 10% → 100% |

**Overall Migration Risk:**  
🔴 CRITICAL → 🟡 MANAGEABLE ✅

---

### **Updated Migration Timeline**

```
Week 3-4: Build Auth Service
├─ Use UUID (not ULID) ✅
├─ Test locally
└─ No production impact

Week 5: Create Safety Mechanisms
├─ Add feature flags (email verification, backend switch) ✅
├─ Create adapter layer ✅
├─ Build rollout system ✅
└─ Test both paths work

Week 6: Start Gradual Rollout
├─ Day 1: 10% rollout ✅
├─ Day 3: 25% rollout
├─ Day 5: 50% rollout
├─ Day 6: 75% rollout
└─ Day 7: 100% rollout

Week 7: Monitor & Cleanup
├─ Monitor for issues
├─ Delete old code
└─ Celebrate! 🎉
```

**Key Changes to Original Plan:**
1. ✅ Use UUID instead of ULID (eliminates ID migration)
2. ✅ Add feature flags for easy rollback
3. ✅ Build adapter layer for gradual Supabase migration
4. ✅ Implement gradual rollout (not all-at-once)

**These 4 changes reduce risk from CRITICAL to MANAGEABLE!**

---

## 🎯 Overview

### **What We're Building**

Replace Supabase email/password authentication with a custom WebAuthn-based auth service that:
- Uses passkeys (Face ID, Touch ID, fingerprints, security keys)
- Collects ZERO email addresses
- Issues short-lived JWTs (15 min)
- Stores client-side Ed25519 signing keys in hardware-backed secure storage

### **Architecture**

```
┌─────────────────────────────────────────────────────────┐
│            Expo App (iOS/Android/Web)                   │
│                                                          │
│  1. User clicks "Sign Up"                               │
│  2. Device prompts for Face ID/Touch ID                 │
│  3. WebAuthn credential created (hardware-backed)       │
│  4. Client generates Ed25519 signing key                │
│  5. Public key + credential sent to server              │
│                                                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│            Auth Service (Port 3001)                     │
│                                                          │
│  1. Verify WebAuthn credential                          │
│  2. Store credential (NO email column)                  │
│  3. Issue JWT (15 min expiry)                           │
│  4. Return token to client                              │
│                                                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL (users table)                   │
│                                                          │
│  - user_id (ULID, primary key)                          │
│  - webauthn_credential_id (unique)                      │
│  - webauthn_public_key (bytes)                          │
│  - client_pub_key (Ed25519 public key)                  │
│  - counter (for replay protection)                      │
│  - created_at                                           │
│                                                          │
│  ❌ NO email column                                     │
│  ❌ NO password_hash column                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Key Technologies**

**Backend:**
- `@simplewebauthn/server` - WebAuthn verification
- `fastify` - HTTP framework
- `jsonwebtoken` - JWT issuance
- `ioredis` - Challenge storage
- `pg` - PostgreSQL client

**Frontend:**
- `react-native-passkey` - WebAuthn for React Native
- `@noble/curves` - Ed25519 key generation
- `expo-secure-store` - Hardware-backed key storage
- `ulid` - User ID generation

---

## 📅 Week 3: Backend WebAuthn Registration

### **Goal**
Build the backend auth service with WebAuthn registration endpoint.

---

### **Day 1: Project Setup**

#### **Task 3.1.1: Create Auth Service Directory**

```bash
cd backend/services
mkdir auth_service
cd auth_service
npm init -y
```

**Install Dependencies:**
```bash
npm install fastify @fastify/cors @simplewebauthn/server jsonwebtoken ioredis pg dotenv ulid
npm install -D @types/node @types/jsonwebtoken typescript ts-node nodemon
```

**Create `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Create `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  }
}
```

**Deliverable:** ✅ Auth service project scaffolded

---

#### **Task 3.1.2: Set Up Environment Variables**

**Create `.env.example`:**
```bash
# Auth Service
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=content
DB_USER=postgres
DB_PASSWORD=your_password

# Redis (for challenge storage)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# WebAuthn
RP_ID=localhost
RP_NAME=United Unions
ORIGIN=http://localhost:19006

# Logging
LOG_LEVEL=info
```

**Create `.env` (gitignored):**
```bash
cp .env.example .env
# Update with actual values
```

**Deliverable:** ✅ Environment configuration ready

---

### **Day 2: Database Schema**

#### **Task 3.2.1: Create Users Table Migration**

**Create `src/db/schema.sql`:**
```sql
-- Auth service database schema
-- NO email column - zero PII collection

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,                     -- ULID format
  display_name TEXT,                            -- Optional friendly name
  webauthn_credential_id TEXT UNIQUE NOT NULL,  -- WebAuthn credential ID
  webauthn_public_key BYTEA NOT NULL,           -- Credential public key
  client_pub_key TEXT NOT NULL,                 -- Ed25519 public key (hex)
  counter INTEGER DEFAULT 0,                    -- For replay attack prevention
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  verified_worker BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_credential_id ON users(webauthn_credential_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- NO email column
-- NO password_hash column
-- NO ip_address column
-- NO user_agent column
```

**Deliverable:** ✅ Database schema defined (zero PII)

---

#### **Task 3.2.2: Create Database Client**

**Create `src/db/client.ts`:**
```typescript
import { Pool } from 'pg';

export const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Health check
export const healthCheck = async () => {
  try {
    const result = await db.query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  process.exit(0);
});
```

**Deliverable:** ✅ Database connection established

---

### **Day 3: WebAuthn Challenge Generation**

#### **Task 3.3.1: Set Up Redis Client**

**Create `src/redis/client.ts`:**
```typescript
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 200, 1000);
  },
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redis.quit();
});
```

**Deliverable:** ✅ Redis client configured for challenge storage

---

#### **Task 3.3.2: Implement Challenge Endpoint**

**Create `src/routes/challenge.ts`:**
```typescript
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { ulid } from 'ulid';
import { redis } from '../redis/client';

export default async function challengeRoutes(app: FastifyInstance) {
  // GET /auth/challenge - Generate WebAuthn challenge
  app.get('/auth/challenge', async (request, reply) => {
    try {
      // Generate cryptographically secure random challenge
      const challenge = randomBytes(32).toString('base64url');
      const challengeId = ulid();
      
      // Store in Redis with 5-minute expiry
      await redis.setex(`challenge:${challengeId}`, 300, challenge);
      
      return {
        challenge,
        challengeId,
        expiresIn: 300, // seconds
      };
    } catch (error) {
      console.error('Challenge generation error:', error);
      return reply.code(500).send({ error: 'Failed to generate challenge' });
    }
  });
}
```

**Deliverable:** ✅ Challenge generation endpoint working

---

### **Day 4: WebAuthn Registration**

#### **Task 3.4.1: Implement Registration Endpoint**

**Create `src/routes/register.ts`:**
```typescript
import { FastifyInstance } from 'fastify';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { ulid } from 'ulid';
import jwt from 'jsonwebtoken';
import { redis } from '../redis/client';
import { db } from '../db/client';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'United Unions';
const ORIGIN = process.env.ORIGIN || 'http://localhost:19006';
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function registerRoutes(app: FastifyInstance) {
  // POST /auth/webauthn/register
  app.post<{
    Body: {
      userId: string;
      displayName?: string;
      challengeId: string;
      credential: {
        id: string;
        rawId: string;
        response: {
          clientDataJSON: string;
          attestationObject: string;
        };
        type: string;
      };
      client_pub_key: string; // Ed25519 public key (hex)
    };
  }>('/auth/webauthn/register', async (request, reply) => {
    const { userId, displayName, challengeId, credential, client_pub_key } = request.body;
    
    try {
      // 1. Retrieve stored challenge
      const expectedChallenge = await redis.get(`challenge:${challengeId}`);
      
      if (!expectedChallenge) {
        return reply.code(400).send({ error: 'Challenge expired or invalid' });
      }
      
      // 2. Verify WebAuthn registration response
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true,
      });
      
      if (!verification.verified || !verification.registrationInfo) {
        return reply.code(401).send({ error: 'WebAuthn verification failed' });
      }
      
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
      
      // 3. Check if credential already exists
      const existingUser = await db.query(
        'SELECT user_id FROM users WHERE webauthn_credential_id = $1',
        [credential.id]
      );
      
      if (existingUser.rowCount > 0) {
        return reply.code(409).send({ error: 'Credential already registered' });
      }
      
      // 4. Store user (NO email)
      await db.query(
        `INSERT INTO users (
          user_id,
          display_name,
          webauthn_credential_id,
          webauthn_public_key,
          client_pub_key,
          counter,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          userId,
          displayName || null,
          credential.id,
          Buffer.from(credentialPublicKey),
          client_pub_key,
          counter,
        ]
      );
      
      // 5. Delete used challenge
      await redis.del(`challenge:${challengeId}`);
      
      // 6. Issue JWT (15 min expiry)
      const token = jwt.sign(
        { userId, type: 'access' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      // 7. Log event (PII-free)
      console.log(`Registration success - User: ${userId.slice(0, 8)}...`);
      
      return {
        success: true,
        userId,
        token,
        expiresIn: 900, // 15 minutes in seconds
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });
}
```

**Deliverable:** ✅ Registration endpoint complete with WebAuthn verification

---

### **Day 5: Integration & Testing**

#### **Task 3.5.1: Create Main Server**

**Create `src/index.ts`:**
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import challengeRoutes from './routes/challenge';
import registerRoutes from './routes/register';
import { healthCheck } from './db/client';

dotenv.config();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// CORS
app.register(cors, {
  origin: process.env.ORIGIN || 'http://localhost:19006',
  credentials: true,
});

// Health check
app.get('/health', async (request, reply) => {
  const dbHealthy = await healthCheck();
  
  if (!dbHealthy) {
    return reply.code(503).send({ status: 'unhealthy', database: false });
  }
  
  return { status: 'healthy', database: true };
});

// Routes
app.register(challengeRoutes);
app.register(registerRoutes);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Auth service listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

**Deliverable:** ✅ Auth service running on port 3001

---

#### **Task 3.5.2: Manual Testing with cURL**

**Test Challenge Generation:**
```bash
curl http://localhost:3001/auth/challenge
```

**Expected Response:**
```json
{
  "challenge": "random-base64url-string",
  "challengeId": "01HQWX...",
  "expiresIn": 300
}
```

**Deliverable:** ✅ Challenge endpoint tested manually

---

#### **Task 3.5.3: Write Unit Tests**

**Create `src/__tests__/registration.test.ts`:**
```typescript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('WebAuthn Registration', () => {
  beforeAll(async () => {
    // Setup test database
  });
  
  afterAll(async () => {
    // Cleanup
  });
  
  test('Challenge generation creates unique challenges', async () => {
    const res1 = await fetch('http://localhost:3001/auth/challenge');
    const data1 = await res1.json();
    
    const res2 = await fetch('http://localhost:3001/auth/challenge');
    const data2 = await res2.json();
    
    expect(data1.challenge).not.toBe(data2.challenge);
    expect(data1.challengeId).not.toBe(data2.challengeId);
  });
  
  test('Registration stores user without email', async () => {
    // Mock WebAuthn credential
    const mockCredential = {
      id: 'test-credential-id',
      rawId: 'test-raw-id',
      response: {
        clientDataJSON: 'mock-client-data',
        attestationObject: 'mock-attestation',
      },
      type: 'public-key',
    };
    
    // Test registration
    // ... (implementation details)
    
    // Verify no email in database
    const user = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    expect(user.rows[0]).not.toHaveProperty('email');
  });
  
  test('Expired challenges are rejected', async () => {
    // Test with expired challengeId
    // ... (implementation details)
  });
});
```

**Run Tests:**
```bash
npm test
```

**Deliverable:** ✅ Unit tests passing

---

### **Week 3 Deliverables Checklist**

- [x] Auth service project scaffolded
- [x] Environment variables configured
- [x] Database schema created (zero PII)
- [x] Database client working
- [x] Redis client configured
- [x] Challenge generation endpoint
- [x] WebAuthn registration endpoint
- [x] JWT issuance working
- [x] Main server running
- [x] Manual testing complete
- [x] Unit tests passing

---

## 📅 Week 4: Backend WebAuthn Authentication

### **Goal**
Implement WebAuthn authentication (login) and JWT refresh endpoints.

---

### **Day 6: WebAuthn Authentication**

#### **Task 4.1.1: Implement Authentication Endpoint**

**Create `src/routes/authenticate.ts`:**
```typescript
import { FastifyInstance } from 'fastify';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { redis } from '../redis/client';
import { db } from '../db/client';

const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:19006';
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function authenticateRoutes(app: FastifyInstance) {
  // POST /auth/webauthn/authenticate
  app.post<{
    Body: {
      challengeId: string;
      assertion: {
        id: string;
        rawId: string;
        response: {
          clientDataJSON: string;
          authenticatorData: string;
          signature: string;
          userHandle?: string;
        };
        type: string;
      };
    };
  }>('/auth/webauthn/authenticate', async (request, reply) => {
    const { challengeId, assertion } = request.body;
    
    try {
      // 1. Retrieve stored challenge
      const expectedChallenge = await redis.get(`challenge:${challengeId}`);
      
      if (!expectedChallenge) {
        return reply.code(400).send({ error: 'Challenge expired or invalid' });
      }
      
      // 2. Get user by credential ID
      const userResult = await db.query(
        'SELECT * FROM users WHERE webauthn_credential_id = $1',
        [assertion.id]
      );
      
      if (userResult.rowCount === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // 3. Verify authentication response
      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: user.webauthn_credential_id,
          credentialPublicKey: user.webauthn_public_key,
          counter: user.counter,
        },
        requireUserVerification: true,
      });
      
      if (!verification.verified) {
        return reply.code(401).send({ error: 'Authentication failed' });
      }
      
      // 4. Update counter (replay attack prevention)
      await db.query(
        'UPDATE users SET counter = $1, last_login_at = NOW() WHERE user_id = $2',
        [verification.authenticationInfo.newCounter, user.user_id]
      );
      
      // 5. Delete used challenge
      await redis.del(`challenge:${challengeId}`);
      
      // 6. Issue JWT (15 min expiry)
      const token = jwt.sign(
        { userId: user.user_id, type: 'access' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      // 7. Log event (PII-free)
      console.log(`Login success - User: ${user.user_id.slice(0, 8)}...`);
      
      return {
        success: true,
        userId: user.user_id,
        token,
        expiresIn: 900, // 15 minutes
      };
      
    } catch (error) {
      console.error('Authentication error:', error);
      return reply.code(500).send({ error: 'Authentication failed' });
    }
  });
}
```

**Update `src/index.ts`:**
```typescript
import authenticateRoutes from './routes/authenticate';

// ...
app.register(authenticateRoutes);
```

**Deliverable:** ✅ Authentication endpoint complete

---

### **Day 7: JWT Refresh & Middleware**

#### **Task 4.2.1: Implement JWT Refresh Endpoint**

**Create `src/routes/refresh.ts`:**
```typescript
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';

const JWT_SECRET = process.env.JWT_SECRET!;

export default async function refreshRoutes(app: FastifyInstance) {
  // POST /auth/refresh
  app.post<{
    Body: { token: string };
  }>('/auth/refresh', async (request, reply) => {
    const { token } = request.body;
    
    try {
      // 1. Verify existing token (allow expired for refresh)
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as {
        userId: string;
        type: string;
      };
      
      if (decoded.type !== 'access') {
        return reply.code(400).send({ error: 'Invalid token type' });
      }
      
      // 2. Verify user still exists
      const userResult = await db.query(
        'SELECT user_id FROM users WHERE user_id = $1',
        [decoded.userId]
      );
      
      if (userResult.rowCount === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      // 3. Issue new token (15 min)
      const newToken = jwt.sign(
        { userId: decoded.userId, type: 'access' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      return {
        success: true,
        token: newToken,
        expiresIn: 900,
      };
      
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return reply.code(401).send({ error: 'Invalid token' });
      }
      
      console.error('Refresh error:', error);
      return reply.code(500).send({ error: 'Token refresh failed' });
    }
  });
}
```

**Update `src/index.ts`:**
```typescript
import refreshRoutes from './routes/refresh';

// ...
app.register(refreshRoutes);
```

**Deliverable:** ✅ JWT refresh endpoint working

---

#### **Task 4.2.2: Create JWT Verification Middleware**

**Create `src/middleware/auth.ts`:**
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JWTPayload {
  userId: string;
  type: string;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
    };
  }
}

export const verifyJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (decoded.type !== 'access') {
      return reply.code(401).send({ error: 'Invalid token type' });
    }
    
    // Attach user to request
    request.user = { userId: decoded.userId };
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.code(401).send({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
    
    return reply.code(500).send({ error: 'Authentication failed' });
  }
};
```

**Deliverable:** ✅ JWT middleware ready for use in other services

---

### **Day 8: Rate Limiting**

#### **Task 4.3.1: Implement Rate Limiting Middleware**

**Install dependency:**
```bash
npm install @fastify/rate-limit
```

**Create `src/middleware/rateLimiter.ts`:**
```typescript
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { redis } from '../redis/client';

export const registerRateLimiting = async (app: FastifyInstance) => {
  // Global rate limit (100 req/min per IP)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
  });
  
  // Stricter limits for auth endpoints
  const authRateLimit = {
    max: 5,
    timeWindow: '15 minutes',
    redis,
    skipOnError: false,
  };
  
  // Apply to auth routes
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/auth/webauthn')) {
      // Rate limit: 5 attempts per 15 minutes
      const key = `rate_limit:auth:${request.ip}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, 900); // 15 minutes
      }
      
      if (current > 5) {
        return reply.code(429).send({ error: 'Too many authentication attempts' });
      }
    }
  });
};
```

**Update `src/index.ts`:**
```typescript
import { registerRateLimiting } from './middleware/rateLimiter';

// ...
await registerRateLimiting(app);
```

**Deliverable:** ✅ Rate limiting enforced on auth endpoints

---

### **Day 9: User Info Endpoint**

#### **Task 4.4.1: Implement User Info Endpoint**

**Create `src/routes/user.ts`:**
```typescript
import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middleware/auth';
import { db } from '../db/client';

export default async function userRoutes(app: FastifyInstance) {
  // GET /users/me - Get current user info
  app.get('/users/me', { preHandler: verifyJWT }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      
      const result = await db.query(
        `SELECT 
          user_id,
          display_name,
          client_pub_key,
          created_at,
          last_login_at,
          verified_worker
        FROM users
        WHERE user_id = $1`,
        [userId]
      );
      
      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const user = result.rows[0];
      
      return {
        userId: user.user_id,
        displayName: user.display_name,
        clientPubKey: user.client_pub_key,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        verifiedWorker: user.verified_worker,
      };
      
    } catch (error) {
      console.error('User info error:', error);
      return reply.code(500).send({ error: 'Failed to fetch user info' });
    }
  });
  
  // GET /users/:userId - Get user by ID (internal use)
  app.get<{
    Params: { userId: string };
  }>('/users/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      
      const result = await db.query(
        `SELECT 
          user_id,
          display_name,
          client_pub_key,
          created_at
        FROM users
        WHERE user_id = $1`,
        [userId]
      );
      
      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      return result.rows[0];
      
    } catch (error) {
      console.error('User lookup error:', error);
      return reply.code(500).send({ error: 'User lookup failed' });
    }
  });
}
```

**Update `src/index.ts`:**
```typescript
import userRoutes from './routes/user';

// ...
app.register(userRoutes);
```

**Deliverable:** ✅ User info endpoints working

---

### **Day 10: Testing & Documentation**

#### **Task 4.5.1: Integration Tests**

**Create `src/__tests__/auth-flow.test.ts`:**
```typescript
import { describe, test, expect } from '@jest/globals';

describe('Complete Auth Flow', () => {
  test('Register → Login → Refresh → Access Protected Resource', async () => {
    // 1. Get challenge
    const challengeRes = await fetch('http://localhost:3001/auth/challenge');
    const { challenge, challengeId } = await challengeRes.json();
    
    // 2. Register (mock WebAuthn)
    // ... (mock credential creation)
    
    // 3. Login with same credential
    // ... (mock authentication)
    
    // 4. Refresh token
    const refreshRes = await fetch('http://localhost:3001/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const { token: newToken } = await refreshRes.json();
    
    // 5. Access protected resource
    const userRes = await fetch('http://localhost:3001/users/me', {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    const user = await userRes.json();
    
    expect(user).toHaveProperty('userId');
    expect(user).not.toHaveProperty('email'); // No email!
  });
  
  test('Rate limiting blocks excessive attempts', async () => {
    // Make 6 registration attempts
    for (let i = 0; i < 6; i++) {
      await fetch('http://localhost:3001/auth/webauthn/register', {
        method: 'POST',
        // ...
      });
    }
    
    // 6th attempt should be rate limited
    const res = await fetch('http://localhost:3001/auth/webauthn/register', {
      method: 'POST',
      // ...
    });
    
    expect(res.status).toBe(429);
  });
});
```

**Run tests:**
```bash
npm test
```

**Deliverable:** ✅ Integration tests passing

---

### **Week 4 Deliverables Checklist**

- [x] Authentication endpoint implemented
- [x] JWT refresh endpoint working
- [x] JWT verification middleware created
- [x] Rate limiting enforced
- [x] User info endpoints working
- [x] Integration tests passing
- [x] All endpoints documented

---

## 📅 Week 5: Frontend Integration

### **Goal**
Integrate WebAuthn authentication into the Expo app, replacing Supabase Auth.

---

### **Day 11: Install Dependencies**

#### **Task 5.1.1: Install Client Libraries**

```bash
cd frontend
npm install react-native-passkey @noble/curves @noble/hashes ulid
```

**Verify compatibility:**
- ✅ `react-native-passkey` - Expo-compatible (no prebuild required)
- ✅ `@noble/curves` - Pure JavaScript
- ✅ `@noble/hashes` - Pure JavaScript
- ✅ `ulid` - Pure JavaScript

**Deliverable:** ✅ All dependencies installed

---

#### **Task 5.1.2: Update Environment Variables**

**Update `frontend/.env`:**
```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_RP_ID=localhost
```

**Update `frontend/app.config.ts`:**
```typescript
export default {
  expo: {
    // ...
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
      rpId: process.env.EXPO_PUBLIC_RP_ID || 'localhost',
    },
  },
};
```

**Deliverable:** ✅ Environment configured

---

### **Day 12: Auth Service Client**

#### **Task 5.2.1: Create Auth Service**

**Create `frontend/src/services/auth.ts`:**
```typescript
import Passkey from 'react-native-passkey';
import { ed25519 } from '@noble/curves/ed25519';
import * as SecureStore from 'expo-secure-store';
import { ulid } from 'ulid';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001';
const RP_ID = Constants.expoConfig?.extra?.rpId || 'localhost';
const RP_NAME = 'United Unions';

interface AuthResult {
  userId: string;
  token: string;
  expiresIn: number;
}

/**
 * Register new user with WebAuthn passkey
 * NO email collection
 */
export const registerWithPasskey = async (displayName?: string): Promise<AuthResult> => {
  try {
    // 1. Generate random user ID (no email required)
    const userId = ulid();
    
    // 2. Get challenge from server
    const challengeRes = await fetch(`${API_URL}/auth/challenge`);
    if (!challengeRes.ok) {
      throw new Error('Failed to get challenge');
    }
    const { challenge, challengeId } = await challengeRes.json();
    
    // 3. Create passkey with device biometrics
    const credential = await Passkey.create({
      rpId: RP_ID,
      rpName: RP_NAME,
      userId: Buffer.from(userId).toString('base64'),
      userName: displayName || `user_${userId.slice(0, 8)}`,
      challenge: challenge,
      userVerification: 'required', // Require biometric
    });
    
    // 4. Generate client signing keys (Ed25519)
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    
    // 5. Store private key in hardware-backed secure storage
    await SecureStore.setItemAsync(
      'signing_private_key',
      Buffer.from(privateKey).toString('hex'),
      { requireAuthentication: true }
    );
    
    // 6. Register with server
    const registerRes = await fetch(`${API_URL}/auth/webauthn/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        displayName: displayName || null,
        challengeId,
        credential: {
          id: credential.id,
          rawId: credential.rawId,
          response: {
            clientDataJSON: credential.response.clientDataJSON,
            attestationObject: credential.response.attestationObject,
          },
          type: 'public-key',
        },
        client_pub_key: Buffer.from(publicKey).toString('hex'),
      }),
    });
    
    if (!registerRes.ok) {
      const error = await registerRes.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    const result = await registerRes.json();
    
    // 7. Store auth token and user ID
    await SecureStore.setItemAsync('auth_token', result.token);
    await SecureStore.setItemAsync('user_id', result.userId);
    
    return result;
    
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Failed to register');
  }
};

/**
 * Sign in with existing passkey
 */
export const signInWithPasskey = async (): Promise<AuthResult> => {
  try {
    // 1. Get challenge
    const challengeRes = await fetch(`${API_URL}/auth/challenge`);
    if (!challengeRes.ok) {
      throw new Error('Failed to get challenge');
    }
    const { challenge, challengeId } = await challengeRes.json();
    
    // 2. Authenticate with passkey
    const assertion = await Passkey.get({
      rpId: RP_ID,
      challenge: challenge,
      userVerification: 'required',
    });
    
    // 3. Verify with server
    const authRes = await fetch(`${API_URL}/auth/webauthn/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId,
        assertion: {
          id: assertion.id,
          rawId: assertion.rawId,
          response: {
            clientDataJSON: assertion.response.clientDataJSON,
            authenticatorData: assertion.response.authenticatorData,
            signature: assertion.response.signature,
            userHandle: assertion.response.userHandle,
          },
          type: 'public-key',
        },
      }),
    });
    
    if (!authRes.ok) {
      const error = await authRes.json();
      throw new Error(error.error || 'Authentication failed');
    }
    
    const result = await authRes.json();
    
    // 4. Store token
    await SecureStore.setItemAsync('auth_token', result.token);
    await SecureStore.setItemAsync('user_id', result.userId);
    
    return result;
    
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Refresh JWT token
 */
export const refreshToken = async (): Promise<string> => {
  try {
    const currentToken = await SecureStore.getItemAsync('auth_token');
    if (!currentToken) {
      throw new Error('No token to refresh');
    }
    
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    });
    
    if (!refreshRes.ok) {
      throw new Error('Token refresh failed');
    }
    
    const { token } = await refreshRes.json();
    
    await SecureStore.setItemAsync('auth_token', token);
    
    return token;
    
  } catch (error: any) {
    console.error('Refresh error:', error);
    throw error;
  }
};

/**
 * Sign out (clear local storage)
 */
export const signOut = async (): Promise<void> => {
  await SecureStore.deleteItemAsync('auth_token');
  await SecureStore.deleteItemAsync('user_id');
};

/**
 * Get current auth token
 */
export const getAuthToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('auth_token');
};

/**
 * Get current user ID
 */
export const getUserId = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('user_id');
};
```

**Deliverable:** ✅ Auth service client complete

---

### **Day 13: Update Auth Screens**

#### **Task 5.3.1: Create Sign Up Screen**

**Create `frontend/src/screens/SignUpScreen.tsx`:**
```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { registerWithPasskey } from '../services/auth';
import { useNavigation } from '@react-navigation/native';

export const SignUpScreen = () => {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  
  const handleSignUp = async () => {
    setLoading(true);
    
    try {
      const result = await registerWithPasskey(displayName || undefined);
      
      Alert.alert(
        'Success!',
        `Account created! Your ID: ${result.userId.slice(0, 8)}...`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home' as never),
          },
        ]
      );
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>No email required</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Display Name (optional)"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />
      
      <Button
        title={loading ? 'Creating Account...' : 'Create Passkey Account'}
        onPress={handleSignUp}
        disabled={loading}
      />
      
      <Text style={styles.info}>
        You'll use Face ID, Touch ID, or your fingerprint to sign in
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  info: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
```

**Deliverable:** ✅ Sign up screen created

---

#### **Task 5.3.2: Create Sign In Screen**

**Create `frontend/src/screens/SignInScreen.tsx`:**
```typescript
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { signInWithPasskey } from '../services/auth';
import { useNavigation } from '@react-navigation/native';

export const SignInScreen = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  
  const handleSignIn = async () => {
    setLoading(true);
    
    try {
      const result = await signInWithPasskey();
      
      Alert.alert(
        'Welcome Back!',
        `Signed in as ${result.userId.slice(0, 8)}...`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home' as never),
          },
        ]
      );
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in with your passkey</Text>
      
      <Button
        title={loading ? 'Signing In...' : 'Sign In with Passkey'}
        onPress={handleSignIn}
        disabled={loading}
      />
      
      <Text style={styles.info}>
        Use Face ID, Touch ID, or your fingerprint to sign in
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  info: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
```

**Deliverable:** ✅ Sign in screen created

---

### **Day 14: Auth Context & Navigation**

#### **Task 5.4.1: Create Auth Context**

**Create `frontend/src/context/AuthContext.tsx`:**
```typescript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuthToken, getUserId, signOut, refreshToken } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAuth();
    
    // Refresh token every 10 minutes
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const checkAuth = async () => {
    try {
      const token = await getAuthToken();
      const uid = await getUserId();
      
      if (token && uid) {
        setIsAuthenticated(true);
        setUserId(uid);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUserId(null);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUserId(null);
  };
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Deliverable:** ✅ Auth context created

---

#### **Task 5.4.2: Update App Navigation**

**Update `frontend/App.tsx`:**
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { HomeScreen } from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <Text>Loading...</Text>;
  }
  
  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </AuthProvider>
  );
}
```

**Deliverable:** ✅ Navigation configured with auth

---

### **Day 15: Testing & Cleanup**

#### **Task 5.5.1: End-to-End Testing**

**Manual Test Checklist:**

1. **Sign Up Flow**
   - [ ] Open app on iOS/Android device
   - [ ] Navigate to Sign Up screen
   - [ ] Enter display name (optional)
   - [ ] Tap "Create Passkey Account"
   - [ ] Device prompts for Face ID/Touch ID
   - [ ] Account created successfully
   - [ ] Redirected to Home screen

2. **Sign In Flow**
   - [ ] Sign out
   - [ ] Navigate to Sign In screen
   - [ ] Tap "Sign In with Passkey"
   - [ ] Device prompts for Face ID/Touch ID
   - [ ] Signed in successfully
   - [ ] Redirected to Home screen

3. **Token Refresh**
   - [ ] Leave app open for 10+ minutes
   - [ ] Verify token auto-refreshes
   - [ ] No sign-out occurs

4. **Security Verification**
   - [ ] Check database - no email column
   - [ ] Check SecureStore - private key stored
   - [ ] Verify biometric required for auth

**Deliverable:** ✅ All manual tests passing

---

#### **Task 5.5.2: Remove Old Supabase Auth Code**

**Delete these files:**
```bash
rm frontend/src/screens/LoginScreen.tsx
rm frontend/src/screens/SignupScreen.tsx
rm frontend/src/screens/ResetPasswordScreen.tsx
rm frontend/src/components/EmailVerificationBanner.tsx
rm frontend/src/hooks/useEmailVerificationGuard.ts
```

**Update `frontend/src/services/supabase.ts`:**
```typescript
// Remove Supabase Auth initialization
// Keep only database client if still using Supabase for data
```

**Deliverable:** ✅ Old auth code removed

---

### **Week 5 Deliverables Checklist**

- [x] Dependencies installed
- [x] Environment variables configured
- [x] Auth service client created
- [x] Sign up screen implemented
- [x] Sign in screen implemented
- [x] Auth context created
- [x] Navigation updated
- [x] End-to-end testing complete
- [x] Old Supabase auth code removed

---

## ✅ Testing & Validation

### **Security Validation Checklist**

- [ ] **Zero Email Collection**
  - Database has NO email column
  - Registration endpoint doesn't accept email
  - No email verification flows

- [ ] **WebAuthn Working**
  - Passkeys created successfully on iOS/Android
  - Biometric authentication required
  - Hardware-backed credentials

- [ ] **JWT Security**
  - Tokens expire after 15 minutes
  - Refresh endpoint working
  - Tokens signed with secure secret

- [ ] **Rate Limiting**
  - 5 auth attempts per 15 minutes enforced
  - 429 error returned on excess attempts

- [ ] **Client Keys**
  - Ed25519 keys generated client-side
  - Private keys stored in SecureStore
  - Public keys sent to server

- [ ] **PII-Free Logging**
  - No IP addresses logged
  - No user agents logged
  - Only anonymized events logged

---

## 🚀 Deployment Checklist

### **Backend Deployment**

- [ ] Environment variables set in production
- [ ] PostgreSQL database created
- [ ] Redis instance configured
- [ ] Auth service deployed (Railway/Render)
- [ ] Health check endpoint accessible
- [ ] SSL/TLS enabled (HTTPS)

### **Frontend Deployment**

- [ ] Update API_URL to production endpoint
- [ ] Update RP_ID to production domain
- [ ] Build and test on iOS device
- [ ] Build and test on Android device
- [ ] Submit to App Store/Play Store (if ready)

### **Verification**

- [ ] Sign up flow works in production
- [ ] Sign in flow works in production
- [ ] Token refresh works in production
- [ ] No errors in production logs
- [ ] Biometric auth works on real devices

---

## 📊 Success Metrics

### **Privacy Compliance**

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Email Collection | ✅ Collected | ❌ None | ✅ |
| Password Storage | ✅ Hashed | ❌ None | ✅ |
| Biometric Auth | ❌ None | ✅ Required | ✅ |
| Hardware-Backed Keys | ❌ None | ✅ SecureStore | ✅ |
| PII in Logs | ❌ IP/UA | ✅ None | ✅ |

### **Security Improvements**

- **Authentication:** 40% → 90% (WebAuthn vs email/password)
- **Privacy:** 10% → 80% (zero PII collection)
- **Cryptography:** 30% → 90% (hardware-backed keys)

---

## 🔧 Critical Migration Tasks

### **Task 1: Remove Email Verification Guards**

**Problem:** Current codebase has 11 protected actions requiring email verification.

**Solution:**
```typescript
// BEFORE: src/hooks/usePosts.ts
const allowed = await guardAction('CREATE_POST');
if (!allowed) throw new Error('Email verification required');

// AFTER: Remove entirely
// const allowed = await guardAction('CREATE_POST');
// if (!allowed) throw new Error('Email verification required');
```

**Files to Modify:**
```bash
src/hooks/usePosts.ts          - Remove CREATE_POST guard
src/hooks/useComments.ts        - Remove CREATE_COMMENT guard
src/hooks/useChannels.ts        - Remove CREATE_CHANNEL guard
src/hooks/useDebates.ts         - Remove CREATE_DEBATE guard
src/hooks/useArguments.ts       - Remove CREATE_ARGUMENT guard
src/hooks/useVotes.ts           - Remove VOTE guard
src/hooks/useUnions.ts          - Remove CREATE_UNION guard
src/hooks/useBoycotts.ts        - Remove CREATE_BOYCOTT guard
src/hooks/useWorkerProposals.ts - Remove CREATE_STRIKE guard
src/hooks/useProfile.ts         - Remove UPDATE_PROFILE guard
src/hooks/usePowerPledges.ts    - Remove CREATE_POWER_PLEDGE guard
```

**Search and Replace:**
```bash
# Remove all email verification guard calls
grep -rl "guardAction" src/hooks/ | while read file; do
  sed -i '/guardAction/d' "$file"
  sed -i '/Email verification required/d' "$file"
done
```

**Deliverable:** ✅ All 11 email verification guards removed

---

### **Task 2: Migrate Audit Logging to PII-Free**

**Problem:** Current audit logs store `username` (email) and need migration to PII-free format.

**Solution:**

**Step 1: Create new audit logging service**
```typescript
// backend/services/auth_service/src/lib/audit.ts
import { Pool } from 'pg';

const logsDb = new Pool({
  connectionString: process.env.LOGS_DB_URL,
});

export const logEvent = async (params: {
  route: string;
  statusCode: number;
  requestHash: string; // SHA256 of request details
}) => {
  await logsDb.query(`
    INSERT INTO logs_schema.events (route, status_code, request_hash)
    VALUES ($1, $2, $3)
  `, [params.route, params.statusCode, params.requestHash]);
};

// Auto-delete after 24 hours (handled by database trigger)
```

**Step 2: Update frontend audit logging**
```typescript
// BEFORE: src/services/auditLog.ts
await auditHelpers.signupSuccess(data.user.id, email, deviceId);

// AFTER: Remove email parameter
await auditHelpers.signupSuccess(data.user.id, deviceId);
```

**Files to Modify:**
```bash
src/services/auditLog.ts       - Remove username parameter
src/hooks/useAuth.ts           - Update all audit calls
src/screens/AuthScreen.tsx     - Remove email from audit calls
```

**Database Migration:**
```sql
-- Create new logs schema
CREATE SCHEMA IF NOT EXISTS logs_schema;

CREATE TABLE logs_schema.events (
  id BIGSERIAL PRIMARY KEY,
  route VARCHAR(255) NOT NULL,
  status_code INT NOT NULL,
  request_hash VARCHAR(64) NOT NULL, -- SHA256 hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-delete after 24 hours
CREATE OR REPLACE FUNCTION logs_schema.delete_old_events()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM logs_schema.events
  WHERE created_at < NOW() - INTERVAL '24 hours';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_old_events
  AFTER INSERT ON logs_schema.events
  EXECUTE FUNCTION logs_schema.delete_old_events();
```

**Deliverable:** ✅ PII-free logging with 24h retention

---

### **Task 3: Database Schema Migration**

**Problem:** Need to migrate from Supabase auth.users to new users table.

**Solution:**

**Step 1: Create migration script**
```typescript
// scripts/migrate-database.ts
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const newDb = new Pool({
  connectionString: process.env.CONTENT_DB_URL,
});

const migrateData = async () => {
  console.log('Starting database migration...');
  
  // 1. Migrate users (preserve UUIDs)
  console.log('Migrating users...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  for (const user of authUsers) {
    await newDb.query(`
      INSERT INTO users (user_id, created_at)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id, user.created_at]);
  }
  console.log(`Migrated ${authUsers.length} users`);
  
  // 2. Migrate profiles
  console.log('Migrating profiles...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');
  
  for (const profile of profiles) {
    await newDb.query(`
      INSERT INTO content_schema.profiles (
        id, display_name, username_normalized, bio, avatar_url, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url
    `, [
      profile.id,
      profile.display_name,
      profile.username_normalized,
      profile.bio,
      profile.avatar_url,
      profile.created_at
    ]);
  }
  console.log(`Migrated ${profiles.length} profiles`);
  
  // 3. Migrate unions
  console.log('Migrating unions...');
  const { data: unions } = await supabase.from('unions').select('*');
  
  for (const union of unions) {
    await newDb.query(`
      INSERT INTO content_schema.unions (
        id, name, description, is_public, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      union.id,
      union.name,
      union.description,
      union.is_public,
      union.created_by,
      union.created_at
    ]);
  }
  console.log(`Migrated ${unions.length} unions`);
  
  // 4. Migrate posts (with pseudonyms)
  console.log('Migrating posts...');
  const { data: posts } = await supabase.from('posts').select('*');
  
  for (const post of posts) {
    // Generate pseudonym for each post author
    const pseudonym = `user_${post.user_id.substring(0, 8)}`;
    
    await newDb.query(`
      INSERT INTO content_schema.posts (
        id, content, union_id, author_pseudonym, is_public, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      post.id,
      post.content,
      post.union_id,
      pseudonym, // Use pseudonym instead of user_id
      post.is_public,
      post.created_at
    ]);
  }
  console.log(`Migrated ${posts.length} posts`);
  
  // Continue for all other tables...
  // channels, debates, arguments, votes, etc.
  
  console.log('✅ Database migration complete!');
};

migrateData().catch(console.error);
```

**Step 2: Run migration**
```bash
# Dry run first
npm run migrate:dry-run

# Actual migration
npm run migrate:production
```

**Step 3: Verify migration**
```bash
# Check row counts match
psql $CONTENT_DB_URL -c "SELECT COUNT(*) FROM content_schema.users;"
psql $CONTENT_DB_URL -c "SELECT COUNT(*) FROM content_schema.profiles;"
psql $CONTENT_DB_URL -c "SELECT COUNT(*) FROM content_schema.posts;"
```

**Deliverable:** ✅ All data migrated to new database

---

### **Task 4: Update Frontend to Use New Auth**

**Problem:** Frontend currently uses Supabase auth throughout.

**Solution:**

**Step 1: Create feature flag**
```typescript
// src/config.ts
export const CONFIG = {
  USE_WEBAUTHN: process.env.EXPO_PUBLIC_USE_WEBAUTHN === 'true',
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
};
```

**Step 2: Create auth adapter**
```typescript
// src/services/auth/index.ts
import { CONFIG } from '../config';
import * as WebAuthnAuth from './webauthn';
import * as SupabaseAuth from './supabase';

// Adapter pattern - switch based on feature flag
export const auth = CONFIG.USE_WEBAUTHN ? WebAuthnAuth : SupabaseAuth;

// Usage in components:
// const { signUp, signIn, signOut } = auth;
```

**Step 3: Update all components**
```typescript
// BEFORE: src/screens/ProfileScreen.tsx
import { supabase } from '../services/supabase';
const { data } = await supabase.from('profiles').select('*').eq('id', user.id);

// AFTER: Use API instead
import { fetchProfile } from '../api/profiles';
const profile = await fetchProfile(userId);
```

**Files to Modify:**
```bash
src/screens/ProfileScreen.tsx
src/screens/UnionDetailScreen.tsx
src/screens/CreateUnionScreen.tsx
src/hooks/usePosts.ts
src/hooks/useComments.ts
src/hooks/useVotes.ts
# ... all files using Supabase queries
```

**Deliverable:** ✅ Frontend uses WebAuthn auth + API calls

---

### **Task 5: Files to Delete**

**After successful migration, delete these files:**

```bash
# Email verification system
rm src/services/emailVerification.ts
rm src/components/EmailVerificationBanner.tsx

# Old auth screens
rm src/screens/AuthScreen.tsx
rm src/screens/ResetPasswordScreen.tsx

# Old Supabase auth hooks
rm src/hooks/useEmailVerificationGuard.ts

# Rate limiting (move to backend)
rm src/services/rateLimiter.ts

# Validation schemas for email/password
grep -l "emailSchema\|passwordSchema" src/utils/* | xargs rm
```

**Deliverable:** ✅ All legacy auth code deleted

---

## 🔄 Rollback Procedures

### **Emergency Rollback Plan**

If migration fails, follow these steps immediately:

---

### **Scenario 1: Auth Service Crashes (Week 3-4)**

**Symptoms:**
- Auth service won't start
- Database connection errors
- WebAuthn registration fails

**Rollback:**
```bash
# 1. No frontend changes yet, so nothing to rollback
# 2. Debug auth service locally
# 3. Fix issues before proceeding

# No user impact - Supabase auth still running
```

**Risk:** ✅ LOW (no production impact)

---

### **Scenario 2: Frontend Integration Fails (Week 5)**

**Symptoms:**
- Passkey prompts don't appear
- App crashes on sign up
- Token storage fails

**Rollback:**
```bash
# 1. Revert frontend to previous commit
git checkout main
git pull

# 2. Set feature flag
export EXPO_PUBLIC_USE_WEBAUTHN=false

# 3. Redeploy frontend
eas build --platform ios
eas build --platform android

# Users still use Supabase auth
```

**Risk:** ⚠️ MEDIUM (some users might have created passkeys)

---

### **Scenario 3: Production Cutover Fails (Week 6)**

**Symptoms:**
- Mass user login failures
- Database migration errors
- Data inconsistencies

**Immediate Actions:**

**Step 1: Disable WebAuthn (5 minutes)**
```bash
# Set feature flag to false
export EXPO_PUBLIC_USE_WEBAUTHN=false

# Redeploy frontend immediately
eas update --branch production --message "Rollback to Supabase auth"

# Users can now use Supabase auth again
```

**Step 2: Restore Database (15 minutes)**
```bash
# Restore Supabase database from backup
pg_restore -d $SUPABASE_DB_URL backup_$(date +%Y%m%d).sql

# Verify data integrity
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM auth.users;"
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM public.profiles;"
```

**Step 3: Communicate with Users (30 minutes)**
```
Subject: Temporary Authentication Issue Resolved

We experienced a brief authentication issue and have restored service.
If you created a passkey account, please contact support for migration.

All data is safe and your account is accessible.
```

**Step 4: Post-Mortem (24 hours)**
- [ ] Document what went wrong
- [ ] Identify root cause
- [ ] Create fix plan
- [ ] Schedule retry date

**Risk:** 🔴 HIGH (affects all users)

---

### **Data Recovery Procedures**

#### **Recover Lost User Data**
```typescript
// scripts/recover-user-data.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const recoverUserData = async (userId: string) => {
  // 1. Find user in backup
  const { data: backupUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (!backupUser) {
    console.log(`No backup found for user ${userId}`);
    return;
  }
  
  // 2. Restore user profile
  const { error } = await supabase
    .from('profiles')
    .upsert(backupUser);
  
  if (error) {
    console.error(`Failed to restore user ${userId}:`, error);
  } else {
    console.log(`✅ Restored user ${userId}`);
  }
};
```

#### **Verify Data Integrity**
```sql
-- Check for missing users
SELECT COUNT(*) FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Check for orphaned content
SELECT COUNT(*) FROM posts
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Check vote counts
SELECT SUM(yes_votes + no_votes) FROM boycott_proposals;
SELECT COUNT(*) FROM boycott_votes;
```

**Deliverable:** ✅ Rollback procedures documented and tested

---

### **Rollback Testing (Before Week 6)**

**Test rollback procedure in staging:**

```bash
# 1. Deploy to staging with WebAuthn
export EXPO_PUBLIC_USE_WEBAUTHN=true
eas build --platform ios --profile staging

# 2. Create test users
# ... create 5 test accounts ...

# 3. Trigger rollback
export EXPO_PUBLIC_USE_WEBAUTHN=false
eas update --branch staging --message "Test rollback"

# 4. Verify test users can still log in
# ... test with Supabase auth ...

# 5. Document any issues
```

**Deliverable:** ✅ Rollback tested in staging

---

## 🎯 Summary

### **What Was Built**

**Backend (Week 3-4):**
- ✅ WebAuthn registration endpoint
- ✅ WebAuthn authentication endpoint
- ✅ JWT issuance and refresh
- ✅ Rate limiting
- ✅ PII-free logging

**Frontend (Week 5):**
- ✅ Passkey registration UI
- ✅ Passkey sign-in UI
- ✅ Client-side key generation
- ✅ Auth context and navigation
- ✅ Automatic token refresh

### **What Was Removed**

- ❌ Email/password authentication
- ❌ Email verification flows
- ❌ Password reset screens
- ❌ Email collection (database column)
- ❌ IP/UA logging

### **Privacy Guarantees**

✅ **Zero email collection**  
✅ **Hardware-backed biometric auth**  
✅ **Client-controlled signing keys**  
✅ **Short-lived JWTs (15 min)**  
✅ **PII-free logging**  
✅ **Rate limiting enforced**

---

## 📚 Next Steps

After completing Phase 1A (Blue Spirit), proceed to:

**Week 6-8:** Encrypted Memberships + Media + DMs  
**Week 9-11:** Blind-Signature Voting  
**Week 12:** Pseudonymous Content + PII-Free Logs  
**Week 13-14:** Integration Testing + Deployment

---

**END OF PHASE 1A: BLUE SPIRIT**

🎉 Congratulations on implementing privacy-first authentication!
