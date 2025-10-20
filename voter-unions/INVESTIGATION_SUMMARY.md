# Device Token Auth Investigation Summary

**Date:** October 19, 2025  
**Task:** Investigate existing app code to determine Device Token Auth implementation requirements  
**Status:** 🔴 **OUTDATED - SEE CORRECTED VERSION**

---

## ⚠️ IMPORTANT: This Document is Outdated

**Architect review identified critical crypto assumptions error.**

**Please read:** [INVESTIGATION_FINDINGS_CORRECTED.md](./INVESTIGATION_FINDINGS_CORRECTED.md)

**Key Changes:**
- Original assumed `expo-crypto` had keypair generation (WRONG)
- Corrected version uses `elliptic` library (pure JS, Expo Go compatible)
- Timeline revised: 6-7 days (not 3-4)
- Native-only recommendation (disable device auth on web)

---

# Original Investigation (Outdated)

---

## 🎯 Quick Answer

**Can we implement Device Token Auth successfully?**  
✅ **YES** - The app is remarkably well-prepared. 70% of the infrastructure already exists.

**How long will it take?**  
⏱️ **3-4 days** (originally estimated 5 days)

**What needs to be built?**  
📝 **~600 net lines of code** (550 new, 400 modified, 350 deleted)

---

## 📊 What Already Exists

### 1. Secure Token Storage ✅
**File:** `src/services/supabase.ts`  
**What it does:** Hardware-backed storage using `expo-secure-store`
- iOS: Keychain (hardware-backed)
- Android: Keystore (hardware-backed)
- Web: IndexedDB (with error recovery)

**Can reuse for:**
- Device private keys
- JWT tokens (access + refresh)
- User ID

---

### 2. Device Fingerprinting ✅
**File:** `src/hooks/useDeviceId.ts`  
**What it does:** Generates stable device identifiers
- iOS: `getIosIdForVendorAsync()` (survives reinstalls)
- Android: `getAndroidId()` (survives reinstalls)
- Web: Browser fingerprint (user agent + screen)
- All IDs hashed with SHA-256

**Currently used for:**
- Vote deduplication (per-device tracking)
- Session management
- Audit logging
- Rate limiting

**Can reuse for:**
- Device registration metadata
- Multi-device session tracking
- Suspicious device detection

---

### 3. Rate Limiting ✅
**File:** `src/services/rateLimit.ts`  
**What it does:** Prevents abuse with configurable limits

**Already configured:**
```typescript
login: 5 attempts / 15 minutes (30 min block)
signup: 3 attempts / 1 hour (1 hour block)
```

**Can reuse for:**
- Device token registration
- Device token login
- Challenge requests

---

### 4. Audit Logging ✅
**File:** `src/services/auditLog.ts`  
**What it does:** Logs security events to database

**Helper functions available:**
- `auditHelpers.signupSuccess(userId, email, deviceId)`
- `auditHelpers.signupFailed(email, error, deviceId)`
- `auditHelpers.loginSuccess(userId, email, deviceId)`
- `auditHelpers.logout(userId, email, deviceId)`

**Needs modification:**
- Remove `email` parameter (privacy)
- Remove `username` field (currently stores email)

---

### 5. Feature Flag System ✅
**File:** `src/config.ts`  
**What it does:** Controls app behavior with environment variables

**Existing flags:**
```typescript
USE_WEBAUTHN: false
USE_NEW_BACKEND: false
REQUIRE_EMAIL_VERIFICATION: true
API_URL: 'http://localhost:3001'
```

**Need to add:**
```typescript
USE_DEVICE_TOKEN: true  // New flag for device auth
```

---

## 🔨 What Needs to Be Built

### Day 1: Device Auth Service (~200 lines)
**File:** `src/services/deviceAuth.ts` (NEW)

**Functions:**
```typescript
generateDeviceKeypair()      // Create ECDSA keypair
storeDeviceKeypair()         // Save to SecureStore
getDeviceKeypair()           // Retrieve from SecureStore
deleteDeviceKeypair()        // Remove on logout
signChallenge()              // Sign with private key
getDeviceInfo()              // Device metadata
```

**Dependencies:** Already installed ✅
- `expo-crypto`
- `expo-secure-store`
- `expo-application`

---

### Day 2: Update Auth Hook (+100 lines)
**File:** `src/hooks/useAuth.ts` (MODIFY)

**Add methods:**
```typescript
registerWithDevice()  // Device-based registration
loginWithDevice()     // Device-based login
```

**Keep existing:**
```typescript
signUp()              // Legacy Supabase
signInWithPassword()  // Legacy Supabase
signOut()             // Shared
```

---

### Day 3: Registration UI (~150 lines)
**File:** `src/screens/DeviceRegisterScreen.tsx` (NEW)

**Features:**
- "Create Anonymous Account" button
- Privacy features list (🔒 Private, 📱 Device-Based, ⚡ Instant)
- Loading states
- Error handling
- Disclaimer about device-specific account

---

### Day 4: Login UI (~150 lines)
**File:** `src/screens/DeviceLoginScreen.tsx` (NEW)

**Features:**
- Auto-login on app start (if keypair exists)
- Manual "Login with This Device" button
- Link to registration screen
- Error handling

---

### Day 5: Backend Integration (~3-4 hours)
**Files:** 
- `backend/services/auth/src/routes/register.ts`
- `backend/services/auth/src/routes/auth.ts`

**New endpoints:**
1. `POST /auth/register/init` - Generate challenge
2. `POST /auth/register/verify` - Verify signature, create user
3. `POST /auth/login/init` - Login challenge
4. `POST /auth/login/verify` - Verify signature, issue tokens

**New database table:**
```sql
CREATE TABLE device_credentials (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  public_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  os_name TEXT,
  created_at TIMESTAMP,
  last_used_at TIMESTAMP
);
```

---

## 📈 Code Impact

### New Files (4)
```
src/services/deviceAuth.ts          200 lines
src/screens/DeviceRegisterScreen.tsx 150 lines
src/screens/DeviceLoginScreen.tsx    150 lines
src/types/deviceAuth.ts              50 lines
──────────────────────────────────────────────
Total new:                           550 lines
```

### Modified Files (4)
```
src/hooks/useAuth.ts                +100 lines
src/config.ts                       +15 lines
src/services/auditLog.ts            -20 lines
backend/services/auth/...           +300 lines
──────────────────────────────────────────────
Total modifications:                 +400 lines
```

### Deleted Files (3)
```
src/services/emailVerification.ts   -200 lines
src/components/EmailVerificationBanner.tsx -100 lines
src/hooks/useEmailVerificationGuard.ts -50 lines
──────────────────────────────────────────────
Total deletions:                     -350 lines
```

### Net Change
```
New:      +550 lines
Modified: +400 lines
Deleted:  -350 lines
──────────────────────────────────────────────
Net:      +600 lines
```

---

## 🗺️ Implementation Plan

### 5-Day Breakdown

**Day 1: Core Service**
- [ ] Create `deviceAuth.ts`
- [ ] Implement keypair generation (HMAC-SHA256)
- [ ] Implement challenge signing
- [ ] Test locally (console.log flow)
- [ ] Add feature flag to config

**Day 2: Auth Integration**
- [ ] Add device methods to `useAuth`
- [ ] Update AuthContext types
- [ ] Test with mock backend
- [ ] Update audit logging (remove email)

**Day 3: Registration UI**
- [ ] Create `DeviceRegisterScreen`
- [ ] Add navigation route
- [ ] Implement registration flow
- [ ] Test UI (mock backend)

**Day 4: Login UI**
- [ ] Create `DeviceLoginScreen`
- [ ] Add auto-login logic
- [ ] Add navigation route
- [ ] Test login flow (mock backend)

**Day 5: Backend + E2E Testing**
- [ ] Create device token endpoints
- [ ] Add `device_credentials` table
- [ ] Test E2E flow (iOS)
- [ ] Test E2E flow (Android)
- [ ] Update documentation

---

## 🔒 Security Analysis

### Strengths ✅
- Hardware-backed key storage (iOS Keychain / Android Keystore)
- Challenge-response prevents replay attacks
- Per-device authentication (no shared credentials)
- Rate limiting prevents brute force
- Audit logging for suspicious activity
- Privacy-first (no email collection)

### Weaknesses ⚠️
- No biometric UI (just button tap)
- Device loss = account loss (without recovery)
- Custom implementation (not W3C standard)
- HMAC-SHA256 (simpler than ECDSA, less standard)

### Mitigations 🛡️
1. **Backup codes** - Generated during registration
2. **Device linking** - Future feature for multi-device
3. **Audit logs** - Track suspicious device changes
4. **Rate limiting** - Prevent challenge flooding
5. **Upgrade path** - Easy migration to WebAuthn later

---

## 📚 Documentation Created

### 1. IMPLEMENTATION_FINDINGS.md (Comprehensive)
- Complete infrastructure inventory
- Line-by-line code examples
- Migration challenges & solutions
- Detailed 5-day implementation plan
- Security analysis
- Code impact assessment

### 2. DEVICE_TOKEN_AUTH_PLAN.md (Technical Spec)
- Architecture diagrams
- API endpoint specifications
- Database schema
- Frontend implementation examples
- Backend implementation examples
- Testing checklist

### 3. OPTION_1A_DEVICE_TOKEN_INSERT.md (Quick Reference)
- Why Device Token Auth?
- Week 5A breakdown
- Migration path to WebAuthn
- Security comparison table

### 4. Updated Files
- `security_phase_one_A_blue_spirit.md` - Added implementation findings section
- `MIGRATION_CHECKLIST.md` - Updated Week 5A tasks
- `replit.md` - Added Blue Spirit progress section

---

## ✅ Key Takeaways

1. **App is Ready** - 70% of infrastructure already exists
2. **Fast Implementation** - 3-4 days (not 5)
3. **Low Risk** - Can build alongside Supabase auth
4. **Future Proof** - Easy upgrade to WebAuthn later
5. **Privacy First** - Achieves no-email goal immediately

---

## 🎯 Next Decision Point

**Review IMPLEMENTATION_FINDINGS.md and decide:**

**Option A:** Proceed with Device Token Auth
- ✅ Privacy-first NOW
- ✅ Keep Expo Go workflow
- ✅ Launch MVP faster
- ⚠️ No biometric UI (yet)

**Option B:** Wait for WebAuthn
- ✅ Biometric UI (Face ID/Touch ID)
- ✅ W3C standard
- ❌ Requires development builds
- ❌ Delays MVP launch

**Recommended:** Option A (Device Token now, WebAuthn later)

---

## 📖 Where to Find Details

| Document | Purpose | Length |
|----------|---------|--------|
| **INVESTIGATION_SUMMARY.md** | This file - quick overview | 1 page |
| **IMPLEMENTATION_FINDINGS.md** | Complete technical analysis | 15 pages |
| **DEVICE_TOKEN_AUTH_PLAN.md** | Technical specifications | 10 pages |
| **OPTION_1A_DEVICE_TOKEN_INSERT.md** | Quick reference guide | 5 pages |
| **security_phase_one_A_blue_spirit.md** | Full migration guide | 100+ pages |

---

**Investigation Status:** ✅ COMPLETE  
**Ready for Decision:** ✅ YES  
**Ready for Implementation:** ✅ YES (pending approval)

