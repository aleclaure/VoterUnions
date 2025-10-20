# Device Token Auth Implementation Findings

**Date:** October 19, 2025  
**Investigation:** Analyzed existing codebase to determine Device Token Auth implementation requirements  
**Status:** 🔴 **OUTDATED - CRYPTO APPROACH WAS INVALID**

---

## ⚠️ CRITICAL: This Document is Outdated

**Architect review identified that the crypto approach was not viable.**

**Read corrected version:** [INVESTIGATION_FINDINGS_CORRECTED.md](./INVESTIGATION_FINDINGS_CORRECTED.md)

**What was wrong:**
- Assumed `expo-crypto` had keypair generation (it doesn't)
- Assumed HMAC-SHA256 approach (not cryptographically sound)
- Underestimated complexity and timeline

**Correct approach:**
- Use `elliptic` library (pure JS ECDSA)
- ECDSA P-256 signatures
- 6-7 day timeline (not 3-4)

---

# Original Findings (Invalid - Do Not Use)

---

## 🎯 Executive Summary

**Good News:** The app already has most of the infrastructure needed for Device Token Authentication:
- ✅ Secure token storage (`expo-secure-store`)
- ✅ Device fingerprinting (`useDeviceId` hook)
- ✅ Rate limiting system
- ✅ Audit logging framework
- ✅ Feature flag system

**What We Need to Build:**
- Device keypair generation (200 lines)
- Challenge-response auth logic (150 lines)
- Update AuthContext for device methods (100 lines)
- New registration/login UI (300 lines total)
- Backend modifications (3-4 hours work)

**Estimated Effort:** 3-4 days (originally estimated 5 days)

---

## 📦 Existing Infrastructure (Reusable)

### 1. **Secure Storage** ✅ READY
**File:** `src/services/supabase.ts` (lines 28-74)

```typescript
const SecureAuthStorage = {
  getItem: async (key: string) => {
    // Uses expo-secure-store on native (hardware-backed)
    // Falls back to AsyncStorage on web
  },
  setItem: async (key: string, value: string) => { ... },
  removeItem: async (key: string) => { ... }
}
```

**Reuse for:**
- Storing device private keys
- Storing JWT tokens (access + refresh)
- Storing user ID

**Platform Support:**
- iOS: Hardware-backed Keychain
- Android: Hardware-backed Keystore
- Web: IndexedDB (with error recovery)

---

### 2. **Device Fingerprinting** ✅ READY
**File:** `src/hooks/useDeviceId.ts` (104 lines)

```typescript
export function useDeviceId() {
  // iOS: getIosIdForVendorAsync() - stable across reinstalls
  // Android: getAndroidId() - stable across reinstalls
  // Web: Browser fingerprint (user agent + screen)
  // All device IDs are SHA-256 hashed for privacy
}
```

**Current Usage:**
- Vote deduplication (per-device tracking)
- Session management
- Audit logging
- Rate limiting

**Reuse for:**
- Device registration metadata
- Multi-device session tracking
- Suspicious device detection

---

### 3. **Rate Limiting** ✅ READY
**File:** `src/services/rateLimit.ts` (253 lines)

**Already Configured:**
```typescript
login: {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,     // 15 min window
  blockDurationMs: 30 * 60 * 1000 // 30 min block
},
signup: {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,     // 1 hour window
  blockDurationMs: 60 * 60 * 1000 // 1 hour block
}
```

**Reuse for:**
- Device token registration attempts
- Device token login attempts
- Challenge request limits

---

### 4. **Audit Logging** ✅ READY
**File:** `src/services/auditLog.ts` (54 lines)

```typescript
export const logAuditEvent = async (params: AuditLogParams) => {
  await supabase.rpc('log_audit_event', {
    p_user_id: params.userId || null,
    p_username: params.username || null,  // ⚠️ Remove for privacy
    p_device_id: params.deviceId || null,
    p_action_type: params.actionType,
    // ...
  });
}
```

**Helper Functions Available:**
```typescript
auditHelpers.signupSuccess(userId, email, deviceId)
auditHelpers.signupFailed(email, error, deviceId)
auditHelpers.loginSuccess(userId, email, deviceId)
auditHelpers.loginFailed(email, error, deviceId)
auditHelpers.logout(userId, email, deviceId)
```

**Modification Needed:**
- Remove `username` (currently stores email)
- Remove `email` parameters from helpers
- Update to privacy-first (UUID-only)

---

### 5. **Feature Flags** ✅ READY
**File:** `src/config.ts` (156 lines)

```typescript
export const CONFIG = {
  USE_WEBAUTHN: false,          // WebAuthn vs Supabase auth
  USE_NEW_BACKEND: false,       // New API vs Supabase backend
  REQUIRE_EMAIL_VERIFICATION: true,
  WEBAUTHN_ROLLOUT_PERCENT: 0,
  API_URL: 'http://localhost:3001',
}
```

**Add New Flag:**
```typescript
USE_DEVICE_TOKEN: parseBoolean(
  process.env.EXPO_PUBLIC_USE_DEVICE_TOKEN,
  true // Default: use device token (Expo Go compatible)
)
```

**Logic:**
```typescript
// In AuthContext
const register = async () => {
  if (CONFIG.USE_WEBAUTHN) {
    await registerWithWebAuthn(); // Future: development builds
  } else {
    await registerWithDevice();   // Now: Expo Go
  }
}
```

---

### 6. **Authentication Context** ⚠️ NEEDS EXPANSION
**File:** `src/contexts/AuthContext.tsx` (58 lines)

**Current:**
```typescript
interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  clearAuth: () => void;
}
```

**Simple state container** - delegates actual auth logic to `useAuth` hook

**Modification Plan:**
- Keep existing structure (minimal breaking changes)
- Add device token methods to `useAuth` hook
- User state changes from Supabase User → simple { id: string }

---

### 7. **Current Authentication Flow** 📊
**Files:** `src/hooks/useAuth.ts` (106 lines), `src/screens/AuthScreen.tsx` (200+ lines)

**Current Flow:**
```
User enters email/password
  ↓
Rate limit check
  ↓
Validation (email schema, password strength)
  ↓
supabase.auth.signUp() / signInWithPassword()
  ↓
Audit log (success/failure)
  ↓
Store session in SecureAuthStorage
```

**Device Token Flow (proposed):**
```
User taps "Create Account"
  ↓
Rate limit check
  ↓
Generate device keypair (expo-crypto)
  ↓
Request challenge from backend
  ↓
Sign challenge with private key
  ↓
Send signature + device info to backend
  ↓
Backend verifies, creates user, issues JWT
  ↓
Store tokens + keypair in SecureStore
  ↓
Audit log (success/failure)
```

**Code Similarity:** ~70% reusable (rate limiting, audit logging, UI patterns)

---

## 🔨 What Needs to Be Built

### 1. **Device Auth Service** (NEW)
**File:** `src/services/deviceAuth.ts` (~200 lines)

**Functions to implement:**
```typescript
// Keypair Management
generateDeviceKeypair(): Promise<{ publicKey, privateKey }>
storeDeviceKeypair(privateKey, publicKey): Promise<void>
getDeviceKeypair(): Promise<{ publicKey, privateKey } | null>
deleteDeviceKeypair(): Promise<void>

// Challenge-Response
signChallenge(challenge, privateKey): Promise<signature>
verifySignature(challenge, signature, publicKey): Promise<boolean>

// Device Info (reuse useDeviceId)
getDeviceInfo(): Promise<DeviceInfo>
```

**Dependencies:**
- `expo-crypto` ✅ Already installed
- `expo-secure-store` ✅ Already installed
- `expo-application` ✅ Already installed

**Technical Approach:**
```typescript
// Use HMAC-SHA256 for simplicity (works in Expo Go)
import * as Crypto from 'expo-crypto';

const generateDeviceKeypair = async () => {
  // Generate random private key
  const privateKey = await Crypto.getRandomBytesAsync(32);
  const privateKeyHex = Buffer.from(privateKey).toString('hex');
  
  // Derive public key (for HMAC, public = hash of private)
  const publicKey = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    privateKeyHex
  );
  
  return { publicKey, privateKey: privateKeyHex };
};

const signChallenge = async (challenge: string, privateKey: string) => {
  // HMAC-SHA256(challenge, privateKey)
  const message = challenge + privateKey;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message
  );
};
```

---

### 2. **Update AuthContext** (MODIFY)
**File:** `src/hooks/useAuth.ts` (+100 lines)

**Add New Methods:**
```typescript
export const useAuth = () => {
  // Existing Supabase methods (keep for now)
  const signUp = async (email, password) => { ... }
  const signInWithPassword = async (email, password) => { ... }
  const signOut = async () => { ... }
  
  // NEW: Device token methods
  const registerWithDevice = async () => {
    // 1. Generate keypair
    const { publicKey, privateKey } = await generateDeviceKeypair();
    
    // 2. Request challenge
    const { userId, challenge } = await fetch(
      `${CONFIG.API_URL}/auth/register/init`
    ).then(r => r.json());
    
    // 3. Sign challenge
    const signature = await signChallenge(challenge, privateKey);
    
    // 4. Verify and create user
    const { accessToken, refreshToken } = await fetch(
      `${CONFIG.API_URL}/auth/register/verify`,
      {
        method: 'POST',
        body: JSON.stringify({
          userId,
          publicKey,
          signature,
          deviceInfo: await getDeviceInfo()
        })
      }
    ).then(r => r.json());
    
    // 5. Store credentials
    await storeDeviceKeypair(privateKey, publicKey);
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_id', userId);
    
    setUser({ id: userId });
    await auditHelpers.signupSuccess(userId, null, deviceId);
  };
  
  const loginWithDevice = async () => {
    // Similar flow for login
  };
  
  return {
    user,
    session,
    isLoading,
    // Supabase methods (legacy)
    signUp,
    signInWithPassword,
    // Device token methods
    registerWithDevice,
    loginWithDevice,
    signOut,
  };
};
```

---

### 3. **Registration UI** (NEW)
**File:** `src/screens/DeviceRegisterScreen.tsx` (~150 lines)

**Design:**
```typescript
export function DeviceRegisterScreen() {
  const { registerWithDevice } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const handleRegister = async () => {
    setLoading(true);
    try {
      await registerWithDevice();
      // Navigate to onboarding
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView>
      <Text style={styles.title}>Create Anonymous Account</Text>
      <Text style={styles.subtitle}>
        No email required - your device is your identity
      </Text>
      
      <View style={styles.features}>
        <FeatureRow icon="🔒" title="100% Private" />
        <FeatureRow icon="📱" title="Device-Based" />
        <FeatureRow icon="⚡" title="Instant Access" />
      </View>
      
      <Button
        title="Create Account with This Device"
        onPress={handleRegister}
        loading={loading}
      />
      
      <Text style={styles.disclaimer}>
        Your account is tied to this device. Keep it safe!
      </Text>
    </SafeAreaView>
  );
}
```

---

### 4. **Login UI** (NEW)
**File:** `src/screens/DeviceLoginScreen.tsx` (~150 lines)

**Features:**
- Auto-login if keypair exists
- Manual login button
- Link to registration

```typescript
export function DeviceLoginScreen() {
  const { loginWithDevice } = useAuth();
  
  useEffect(() => {
    checkAutoLogin();
  }, []);
  
  const checkAutoLogin = async () => {
    const keypair = await getDeviceKeypair();
    if (keypair) {
      await loginWithDevice();
    }
  };
  
  return (
    <SafeAreaView>
      <Text style={styles.title}>Welcome Back</Text>
      
      <Button
        title="Login with This Device"
        onPress={handleLogin}
      />
      
      <Button
        title="Create New Account"
        variant="outline"
        onPress={() => navigation.navigate('Register')}
      />
    </SafeAreaView>
  );
}
```

---

### 5. **Backend Modifications** (MODIFY)
**Files:** 
- `backend/services/auth/src/routes/register.ts`
- `backend/services/auth/src/routes/auth.ts`

**New Endpoints:**

1. **POST /auth/register/init** (device token version)
```typescript
{
  response: {
    userId: string,      // UUID v4
    challenge: string    // Random 32-byte hex
  }
}
```

2. **POST /auth/register/verify** (device token version)
```typescript
{
  request: {
    userId: string,
    publicKey: string,
    signature: string,
    deviceInfo: {
      deviceId: string,
      deviceName: string,
      osName: string,
      osVersion: string
    }
  },
  response: {
    accessToken: string,  // JWT (15 min expiry)
    refreshToken: string  // JWT (30 day expiry)
  }
}
```

**New Database Table:**
```sql
CREATE TABLE device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  os_name TEXT NOT NULL,
  os_version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_credentials_user ON device_credentials(user_id);
CREATE INDEX idx_device_credentials_device ON device_credentials(device_id);
```

**Signature Verification:**
```javascript
const verifyDeviceSignature = (challenge, signature, publicKey) => {
  // Recompute expected signature
  const expected = crypto
    .createHmac('sha256', challenge + publicKey)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
};
```

---

## 🔄 Integration Strategy

### Phase 1: Build Device Auth Alongside Supabase
**Duration:** 3 days

**Day 1:**
- [ ] Create `deviceAuth.ts` service
- [ ] Test keypair generation locally
- [ ] Test challenge signing

**Day 2:**
- [ ] Add device token methods to `useAuth`
- [ ] Test in isolation (console.log flow)

**Day 3:**
- [ ] Create DeviceRegisterScreen
- [ ] Create DeviceLoginScreen
- [ ] Add navigation

**Day 4:**
- [ ] Modify backend endpoints
- [ ] Create device_credentials table
- [ ] Test end-to-end flow

**Day 5:**
- [ ] Integration testing (iOS + Android)
- [ ] Update documentation
- [ ] Update audit logging (remove email)

---

### Phase 2: Feature Flag Rollout
**Duration:** 1 day

Add to `config.ts`:
```typescript
AUTH_METHOD: parseEnum(
  process.env.EXPO_PUBLIC_AUTH_METHOD,
  ['supabase', 'device_token', 'webauthn'],
  'device_token' // Default to device token
)
```

Update `AuthScreen`:
```typescript
if (CONFIG.AUTH_METHOD === 'device_token') {
  navigation.navigate('DeviceRegister');
} else if (CONFIG.AUTH_METHOD === 'supabase') {
  // Show email/password form
}
```

---

## 🚧 Migration Challenges & Solutions

### Challenge 1: User ID Mapping
**Problem:** Existing data references Supabase `auth.users.id`, new users have different IDs

**Solutions:**

**Option A: Dual Identity (RECOMMENDED)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,              -- New device token user ID
  supabase_id UUID UNIQUE,         -- Legacy Supabase user ID (nullable)
  created_at TIMESTAMP
);

-- Existing users
INSERT INTO users (id, supabase_id)
SELECT id, id FROM auth.users;

-- New users (device token)
INSERT INTO users (id) VALUES (gen_random_uuid());
```

**Option B: Full Migration**
- Export all Supabase users
- Create device credentials for each
- Migrate user IDs atomically

---

### Challenge 2: Email References
**Problem:** 7 files reference `user.email`

**Files to Update:**
```
src/hooks/useSessionTimeout.ts      - Remove email from session
src/hooks/useAuth.ts                - Remove email parameter
src/hooks/useEmailVerificationGuard.ts - DELETE entire file
src/services/emailVerification.ts   - DELETE entire file
src/screens/OnboardingScreen.tsx    - Remove email field
src/components/EmailVerificationBanner.tsx - DELETE
src/screens/EditProfileScreen.tsx   - Remove email field
```

**Solution:**
- Feature flag: `REQUIRE_EMAIL_VERIFICATION = false`
- Remove email guards from all 11 protected actions
- Update UI to not show email fields

---

### Challenge 3: Account Recovery
**Problem:** No email = no password reset

**Solutions:**

**Option A: Backup Codes (RECOMMENDED)**
```typescript
// During registration
const backupCodes = generateBackupCodes(6); // 6 random codes
await SecureStore.setItemAsync('backup_codes', JSON.stringify(backupCodes));

// Show to user ONCE
<Text>Save these codes! They're your only way to recover your account:</Text>
<Text>{backupCodes.join('\n')}</Text>
```

**Option B: No Recovery**
- Accept device loss = account loss
- Clear disclaimer during registration
- Simple, aligns with privacy-first

**Option C: Device Linking**
- Allow linking multiple devices
- Complex, defer to post-MVP

---

## 📊 Code Impact Analysis

### Files to Create (4 new)
```
src/services/deviceAuth.ts          ~200 lines
src/screens/DeviceRegisterScreen.tsx ~150 lines
src/screens/DeviceLoginScreen.tsx    ~150 lines
src/types/deviceAuth.ts              ~50 lines
───────────────────────────────────────────────
Total new code:                      ~550 lines
```

### Files to Modify (4 existing)
```
src/hooks/useAuth.ts                +100 lines (add device methods)
src/config.ts                       +15 lines (add USE_DEVICE_TOKEN)
src/services/auditLog.ts            -20 lines (remove email)
backend/services/auth/...           +300 lines (device endpoints)
───────────────────────────────────────────────
Total modifications:                 ~400 lines
```

### Files to Delete (3 deprecated)
```
src/services/emailVerification.ts   -200 lines
src/components/EmailVerificationBanner.tsx -100 lines
src/hooks/useEmailVerificationGuard.ts -50 lines
───────────────────────────────────────────────
Total deletions:                     -350 lines
```

### Net Code Change
```
New:        +550 lines
Modified:   +400 lines
Deleted:    -350 lines
───────────────────────────────────────────────
Net:        +600 lines
```

**Complexity:** Medium (most code is straightforward API calls)

---

## ✅ Readiness Assessment

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| Secure Storage | ✅ Ready | 0 hours | SecureAuthStorage already exists |
| Device ID | ✅ Ready | 0 hours | useDeviceId hook already exists |
| Rate Limiting | ✅ Ready | 0 hours | rateLimiter already configured |
| Audit Logging | ⚠️ Modify | 1 hour | Remove email, keep device tracking |
| Feature Flags | ✅ Ready | 0.5 hours | Add USE_DEVICE_TOKEN flag |
| Keypair Generation | ❌ Build | 4 hours | New deviceAuth.ts service |
| Auth Methods | ❌ Build | 6 hours | Update useAuth hook |
| Registration UI | ❌ Build | 4 hours | New DeviceRegisterScreen |
| Login UI | ❌ Build | 4 hours | New DeviceLoginScreen |
| Backend Endpoints | ❌ Build | 8 hours | Modify auth service |
| Database Schema | ❌ Build | 2 hours | Add device_credentials table |
| Testing | ❌ Build | 4 hours | E2E flow testing |

**Total Estimated Effort:** ~33 hours = **4-5 days**

---

## 🎯 Recommended Implementation Order

### Day 1: Core Infrastructure
1. Create `deviceAuth.ts` service
2. Implement keypair generation
3. Test challenge signing locally
4. Add feature flag to config

### Day 2: Frontend Integration
1. Add device methods to useAuth
2. Update AuthContext types
3. Test auth flow with console logs
4. Update audit logging (remove email)

### Day 3: UI Components
1. Build DeviceRegisterScreen
2. Build DeviceLoginScreen
3. Add navigation routes
4. Test UI flow (mock backend)

### Day 4: Backend Implementation
1. Create device token endpoints
2. Add device_credentials table
3. Implement signature verification
4. Test with real backend

### Day 5: Integration & Testing
1. E2E testing (iOS + Android)
2. Rate limiting verification
3. Audit log verification
4. Documentation updates

---

## 🔒 Security Considerations

### Strengths
- ✅ Hardware-backed key storage (iOS Keychain, Android Keystore)
- ✅ Challenge-response prevents replay attacks
- ✅ Per-device authentication (no credential sharing)
- ✅ Rate limiting prevents brute force
- ✅ Audit logging for suspicious activity

### Weaknesses
- ⚠️ No biometric UI (just button tap)
- ⚠️ Device loss = account loss (without recovery codes)
- ⚠️ Custom implementation (not W3C standard like WebAuthn)
- ⚠️ HMAC-SHA256 (simpler than ECDSA, but less standard)

### Mitigations
1. **Backup codes** - Generate during registration
2. **Device linking** - Future feature for multi-device
3. **Audit logs** - Track suspicious device changes
4. **Rate limiting** - Prevent challenge flooding
5. **Upgrade path** - Easy migration to WebAuthn later

---

## 📈 Success Criteria

### Functional Requirements
- [ ] User can register without email
- [ ] User can login with device
- [ ] Auto-login on app restart works
- [ ] Tokens refresh automatically
- [ ] Logout clears credentials
- [ ] Works in Expo Go (iOS + Android)

### Security Requirements
- [ ] Private keys never leave device
- [ ] Challenge-response prevents replay
- [ ] Rate limiting prevents brute force
- [ ] Audit logs track all auth events
- [ ] No PII collected (UUID-only)

### UX Requirements
- [ ] Registration takes <3 seconds
- [ ] Login is instant (auto-login)
- [ ] Clear privacy messaging
- [ ] Account recovery option (backup codes)

---

## 🚀 Next Steps

1. **Review this document** with user
2. **Create task list** for 5-day implementation
3. **Build Day 1** (deviceAuth.ts service)
4. **Test locally** before integrating
5. **Iterate based on feedback**

