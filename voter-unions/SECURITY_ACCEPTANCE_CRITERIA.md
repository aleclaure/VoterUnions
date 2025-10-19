# Security Acceptance Criteria – United Unions App

**Target Architecture:** Expo (iOS / Android / Web)  
**Current Status:** Expo + Supabase (PostgreSQL, Auth, Storage)  
**Purpose:** Define minimum security and privacy requirements for voter unions, consumer boycotts, and worker strikes while maximizing anonymity and minimizing data collection.

---

## 📋 Table of Contents

1. [Identity & Key Management](#1-identity--key-management)
2. [Data Minimization & Storage](#2-data-minimization--storage)
3. [Network & Transport Security](#3-network--transport-security)
4. [App/Web Integrity & Runtime Hardening](#4-appweb-integrity--runtime-hardening)
5. [Voting & Union Logic](#5-voting--union-logic)
6. [Supply-Chain & Release Controls](#6-supply-chain--release-controls)
7. [Incident Response & Key Rotation](#7-incident-response--key-rotation)
8. [Compliance & Transparency](#8-compliance--transparency)
9. [User Education & UX Safety](#9-user-education--ux-safety)
10. [Pass/Fail Criteria](#passfail-criteria)
11. [Gap Analysis Summary](#gap-analysis-summary)
12. [Migration Roadmap](#migration-roadmap)

---

## 1) Identity & Key Management

### **Target Requirements**

#### **Accounts**
- **iOS:** WebAuthn / passkeys
- **Android:** WebAuthn / passkeys
- **Web:** WebAuthn / passkeys
- **Acceptance:** All accounts use passkeys; no passwords, emails, or phone numbers required.

#### **Private Key Storage**
- **iOS:** Secure Enclave via RN Keychain (non-exportable, ThisDeviceOnly)
- **Android:** StrongBox/Keystore via RN Keychain (non-exportable)
- **Web:** Platform authenticator credentials; app crypto keys via WebCrypto
- **Acceptance:** Private keys never leave the device; server never holds private keys.

#### **Local Cryptographic Operations**
- **iOS:** On-device sign/decrypt
- **Android:** On-device sign/decrypt
- **Web:** On-device sign/decrypt (WebCrypto)
- **Acceptance:** All signing/decryption happens locally.

#### **Key Rotation**
- **iOS:** Supported (UI + backend flow)
- **Android:** Supported
- **Web:** Supported
- **Acceptance:** Users can rotate keys; old voting/membership tokens revoked.

#### **Recovery**
- **iOS:** Optional social recovery or user-controlled encrypted backup (no server custody)
- **Android:** Optional social recovery or user-controlled encrypted backup
- **Web:** Passkey + optional encrypted export (user-controlled download)
- **Acceptance:** Recovery never stores plaintext keys server-side.

---

### **Current Implementation (Voter Unions App)**

✅ **What You Have:**
- Email/password authentication via Supabase Auth
- Tokens stored in `expo-secure-store` (hardware-backed on iOS/Android)
- JWT-based session management
- Password reset via email verification

❌ **What's Missing:**
- No WebAuthn/passkeys support
- Email addresses collected and stored in `auth.users`
- Passwords hashed server-side (not passkeys)
- No client-side cryptographic operations (no signing/encryption)
- No key rotation capability
- Recovery depends on email access

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| Passkeys instead of passwords | ❌ Email/password | **CRITICAL** | ⚠️ Partial (react-native-passkey exists but limited) |
| No email/phone collection | ❌ Emails required | **CRITICAL** | ❌ No (Supabase Auth requires email) |
| Secure Enclave/StrongBox | ✅ expo-secure-store | ✅ SATISFIED | ✅ Yes |
| Client-side crypto operations | ❌ None | **HIGH** | ✅ Yes (expo-crypto + WebCrypto) |
| Key rotation | ❌ None | **MEDIUM** | ✅ Yes (with custom implementation) |
| Social recovery | ❌ None | **MEDIUM** | ✅ Yes (with custom implementation) |

---

### **Migration Path**

#### **Phase 1: Enhance Current Auth (Expo-compatible)**
**Time:** 2-3 weeks  
**Cost:** Low  
**Complexity:** Medium

- Add optional passkey enrollment for existing email users
- Implement client-side key generation via `expo-crypto`
- Store private keys in `expo-secure-store`
- Keep email as fallback for recovery

**Libraries:**
```bash
npm install react-native-passkey expo-crypto
```

**Limitations:** Still collects emails (fallback), not fully anonymous

---

#### **Phase 2: Custom Auth Server (Expo-compatible but complex)**
**Time:** 1-2 months  
**Cost:** Medium ($50-100/mo for auth server)  
**Complexity:** High

- Replace Supabase Auth with custom passkey-only auth
- No email/password collection
- Client-side key management only
- Social recovery via encrypted shards

**Trade-offs:**
- ✅ No PII collection
- ❌ Lose Supabase Auth features (email verification, password reset)
- ❌ Must build auth UI from scratch
- ❌ Increased operational burden

---

#### **Phase 3: Full Native Implementation**
**Time:** 3-4 months  
**Cost:** High (2x development time)  
**Complexity:** Very High

- Rebuild in Swift + Kotlin
- Native WebAuthn/passkey APIs
- Platform authenticator APIs (Face ID, Touch ID, Android Biometric)
- Full Secure Enclave/StrongBox integration

**Benefits:**
- ✅ Best security (native platform APIs)
- ✅ No third-party auth dependencies
- ❌ 2x codebase maintenance forever

---

## 2) Data Minimization & Storage

### **Target Requirements**

#### **PII Collection**
- **iOS/Android/Web:** None by default
- **Acceptance:** No emails, phone numbers, or device IDs collected.

#### **Membership Records**
- **iOS:** Client-side encrypted blobs before upload
- **Android:** Same as iOS
- **Web:** Same (ciphertext stored; IndexedDB only for local cache)
- **Acceptance:** Server stores ciphertext only; unreadable without user key.

#### **Votes**
- **iOS:** Blind-signed ballots; server stores ciphertext + used-token hashes
- **Android:** Same
- **Web:** Same
- **Acceptance:** No server mapping of user → vote.

#### **Logs**
- **iOS/Android/Web:** ≤72h retention, encrypted, no plaintext IP/UA (hash/salt only if truly needed)
- **Acceptance:** Short retention; minimal metadata.

#### **Analytics**
- **iOS/Android/Web:** Aggregate counts only
- **Acceptance:** No per-user analytics.

#### **Local Storage**
- **iOS:** Encrypted storage / SQLCipher; never AsyncStorage for secrets
- **Android:** Same
- **Web:** IndexedDB + client-side encryption; no LocalStorage for secrets
- **Acceptance:** No sensitive data in plaintext local stores.

---

### **Current Implementation**

✅ **What You Have:**
- Device-based voting (no IP tracking)
- No per-user analytics
- Secrets in `expo-secure-store` (encrypted)
- Audit logs with 72h retention (partially implemented)

❌ **What's Missing:**
- Email addresses stored in `auth.users` (PII)
- `device_id` stored in vote tables (potential tracking)
- Membership records in plaintext (not encrypted)
- Vote records in plaintext (not blind-signed)
- Audit logs store plaintext IPs in some places

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| No PII collection | ❌ Emails stored | **CRITICAL** | ❌ No (requires custom auth) |
| Encrypted membership records | ❌ Plaintext in DB | **HIGH** | ✅ Yes (client-side encryption) |
| Blind-signed votes | ❌ Plaintext votes | **CRITICAL** | ✅ Yes (RSA blind signatures) |
| No device_id tracking | ⚠️ Device IDs in votes | **MEDIUM** | ✅ Yes (use token hashes instead) |
| 72h log retention | ⚠️ Partial | **LOW** | ✅ Yes (PostgreSQL cron job) |
| No LocalStorage for secrets | ✅ expo-secure-store | ✅ SATISFIED | ✅ Yes |

---

### **Migration Path**

#### **Phase 1: Client-Side Encryption (Expo-compatible)**
**Time:** 2-4 weeks  
**Cost:** Low  
**Complexity:** Medium

**Membership Records:**
```typescript
// Before sending to server
import * as Crypto from 'expo-crypto';

async function encryptMembership(unionId: string, userId: string) {
  const userKey = await SecureStore.getItemAsync('user_encryption_key');
  const plaintext = JSON.stringify({ unionId, userId });
  
  // Encrypt with user's key
  const ciphertext = await encryptAES(plaintext, userKey);
  
  // Store only ciphertext on server
  await supabase.from('union_members').insert({
    union_id: unionId,
    encrypted_data: ciphertext, // Server can't read this
    created_at: new Date()
  });
}
```

**Database Schema:**
```sql
-- Replace plaintext user_id with encrypted blob
ALTER TABLE union_members 
  DROP COLUMN user_id,
  ADD COLUMN encrypted_data TEXT NOT NULL;

-- Server can only store, not read
CREATE POLICY select_own_encrypted ON union_members
  FOR SELECT USING (encrypted_data IS NOT NULL);
```

---

#### **Phase 2: Blind Signature Voting (Expo-compatible)**
**Time:** 3-6 weeks  
**Cost:** Medium  
**Complexity:** High

**Implementation:**
```typescript
// 1. User generates blinded ballot
import { blindMessage, unblindSignature } from 'blind-signatures';

const ballot = { proposal_id: 'xyz', vote: 'yes' };
const { blinded, blindingFactor } = blindMessage(ballot);

// 2. Server signs without seeing contents
const signedBlinded = await supabase.rpc('issue_voting_token', {
  blinded_ballot: blinded,
  union_id: unionId
});

// 3. User unblinds signature
const validSignature = unblindSignature(signedBlinded, blindingFactor);

// 4. User submits anonymous vote with valid signature
await supabase.from('votes').insert({
  signature: validSignature,
  encrypted_ballot: encrypt(ballot, votingKey), // Server can't read
  token_hash: hash(validSignature) // Prevent double voting
});
```

**Server:**
```sql
-- Server only stores ciphertext + signature
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature TEXT NOT NULL,
  encrypted_ballot TEXT NOT NULL, -- Server cannot decrypt
  token_hash TEXT UNIQUE NOT NULL, -- Prevent reuse
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No user_id column = no linkage
```

---

#### **Phase 3: Remove PII (Requires Custom Auth)**
**Time:** 1-2 months  
**Cost:** High  
**Complexity:** Very High

- Replace Supabase Auth with passkey-only system
- Delete `auth.users` table (no emails)
- Use blind tokens for authentication
- Zero-knowledge proof of membership

---

## 3) Network & Transport Security

### **Target Requirements**

#### **HTTPS Only**
- **iOS:** ATS enforced
- **Android:** `usesCleartextTraffic="false"`
- **Web:** HTTPS only
- **Acceptance:** No cleartext traffic.

#### **Certificate Pinning**
- **iOS:** Required via RN pinning module; rotate per release
- **Android:** Required via RN pinning module; rotate per release
- **Web:** Not possible; use HSTS preload + CSP + SRI
- **Acceptance:** Native apps pin; web uses HSTS (preload), Subresource Integrity, strict CSP.

#### **Token Lifetime**
- **iOS/Android:** Access ≤15 min; refresh ≤24h
- **Web:** Same; prefer HttpOnly, Secure, SameSite cookies
- **Acceptance:** Short-lived tokens; refresh rotation; HttpOnly cookies on web.

#### **Replay Protection**
- **iOS/Android/Web:** Nonce + timestamp
- **Acceptance:** Server rejects replays and skewed timestamps.

#### **Rate Limiting**
- **iOS/Android/Web:** Per endpoint
- **Acceptance:** Abuse-resistant rate limits and backoff.

#### **Origin Hiding**
- **iOS/Android/Web (backend):** CDN/WAF in front; origin allowlist to CDN IPs only
- **Acceptance:** No direct origin exposure.

#### **Censorship Resistance**
- **iOS:** .onion mirror + "Open in Tor Browser" action
- **Android:** Same
- **Web:** .onion link + interstitial instructions (open in Tor Browser only)
- **Acceptance:** Onion mirror maintained; clear UX for high-risk users.

---

### **Current Implementation**

✅ **What You Have:**
- HTTPS enforced (Supabase default)
- ATS enabled on iOS (Expo default)
- Token storage in `expo-secure-store`
- Client-side rate limiting
- Session management

❌ **What's Missing:**
- No certificate pinning
- Access tokens valid 1 hour (not 15 min)
- Refresh tokens valid 7 days (not 24h)
- No nonce/timestamp replay protection
- Rate limiting client-side only (not server-side)
- No CDN/WAF layer
- No .onion mirror

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| HTTPS only | ✅ Enforced | ✅ SATISFIED | ✅ Yes |
| Certificate pinning | ❌ None | **HIGH** | ⚠️ Partial (requires EAS Build) |
| Access tokens ≤15 min | ❌ 1 hour | **MEDIUM** | ✅ Yes (Supabase config) |
| Refresh tokens ≤24h | ❌ 7 days | **MEDIUM** | ✅ Yes (Supabase config) |
| Replay protection | ❌ None | **HIGH** | ✅ Yes (Edge Functions) |
| Server-side rate limiting | ❌ Client-side only | **HIGH** | ✅ Yes (Edge Functions) |
| CDN/WAF | ❌ None | **MEDIUM** | ✅ Yes (Cloudflare) |
| .onion mirror | ❌ None | **LOW** | ✅ Yes (separate deployment) |

---

### **Migration Path**

#### **Phase 1: Quick Wins (1-2 weeks)**

**1. Shorten Token Lifetimes**
```typescript
// Supabase dashboard: Authentication → Settings
{
  "JWT_EXPIRY": 900,        // 15 minutes (was 3600)
  "REFRESH_TOKEN_REUSE_INTERVAL": 0,  // No reuse
  "SECURITY_REFRESH_TOKEN_ROTATION_ENABLED": true,
  "REFRESH_TOKEN_EXPIRY": 86400  // 24 hours (was 604800)
}
```

**2. Add Cloudflare WAF**
```bash
# Point custom domain to Supabase via Cloudflare
# Enable WAF rules, rate limiting, IP allowlisting
Cost: $0 (free tier)
Time: 1-2 hours
```

---

#### **Phase 2: Certificate Pinning (2-3 weeks)**

**Requires:** EAS Build (no Expo Go)

```typescript
// Install pinning library
npm install react-native-ssl-pinning

// app.config.ts
export default {
  expo: {
    plugins: [
      [
        "react-native-ssl-pinning",
        {
          "hosts": [
            {
              "host": "yourproject.supabase.co",
              "pins": [
                "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
              ]
            }
          ]
        }
      ]
    ]
  }
}
```

**Cert rotation process:**
```bash
# Every 90 days or with Supabase cert updates
1. Get new cert hashes from Supabase
2. Update app.config.ts
3. Build new release: eas build --platform all
4. Deploy via EAS Update or App Store/Play Store
```

---

#### **Phase 3: Server-Side Security (3-4 weeks)**

**Replay Protection (Edge Function):**
```typescript
// supabase/functions/secure-vote/index.ts
const validateRequest = (req: Request) => {
  const nonce = req.headers.get('X-Nonce');
  const timestamp = req.headers.get('X-Timestamp');
  
  // Check timestamp within 5 minutes
  if (Math.abs(Date.now() - parseInt(timestamp)) > 300000) {
    throw new Error('Request expired');
  }
  
  // Check nonce not reused
  const used = await checkNonceUsed(nonce);
  if (used) {
    throw new Error('Replay detected');
  }
  
  await markNonceUsed(nonce, timestamp);
};
```

**Server-Side Rate Limiting:**
```typescript
// Use Upstash Redis or PostgreSQL
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

const { success } = await ratelimit.limit(userId);
if (!success) {
  return new Response("Rate limit exceeded", { status: 429 });
}
```

---

#### **Phase 4: .onion Mirror (1-2 weeks)**

**Setup:**
1. Deploy Supabase self-hosted instance
2. Configure as Tor hidden service
3. Add deep link handler in app:

```typescript
// App.tsx
import * as Linking from 'expo-linking';

const openInTor = async () => {
  const onionUrl = 'http://yourapp.onion';
  
  // iOS: Onion Browser
  await Linking.openURL(`onionbrowser://${onionUrl}`);
  
  // Android: Tor Browser
  await Linking.openURL(`torbrowser:${onionUrl}`);
};

// Show button in Settings
<Button onPress={openInTor}>Open in Tor (High Security)</Button>
```

---

## 4) App/Web Integrity & Runtime Hardening

### **Target Requirements**

#### **Build Mode**
- **iOS:** Hermes; no dev menu/debug symbols in release
- **Android:** Hermes; no dev menu/debug symbols in release
- **Web:** Production build; no dev tooling exposed
- **Acceptance:** No debug artifacts in production builds.

#### **OTA Updates**
- **iOS:** Signed EAS Update or OTA disabled
- **Android:** Signed EAS Update or OTA disabled
- **Web:** No remote code eval; immutable asset hashing
- **Acceptance:** Only signed updates; no dynamic code loading (e.g., eval).

#### **Dependency Hygiene**
- **iOS/Android/Web:** Lockfile committed; CI SCA; fail build on high severity
- **Acceptance:** Weekly scans; critical vulns block release.

#### **Compromise Checks**
- **iOS:** Jailbreak/emulator detection; block sensitive actions
- **Android:** Root/emulator detection; block sensitive actions
- **Web:** Browser security headers & runtime checks
- **Acceptance:** Sensitive actions blocked on compromised native devices; web enforces CSP/COOP/COEP.

#### **Attestation**
- **iOS:** App Attest / DeviceCheck required for vote casting
- **Android:** Play Integrity required for vote casting
- **Web:** Optional WebAuthn attestation allowlist (AAGUID) when feasible
- **Acceptance:** Integrity signal required for native voting; web uses WebAuthn attestation if practical.

#### **Obfuscation/Tamper**
- **iOS:** Minify/obfuscate; runtime signature/self-check
- **Android:** Same
- **Web:** SRI + content hashing; CSP script-src 'self' 'strict-dynamic'
- **Acceptance:** Detect repacks (native); prevent script injection (web).

---

### **Current Implementation**

✅ **What You Have:**
- Hermes enabled (Expo default for SDK 52+)
- Production builds via EAS Build
- Lockfile committed (package-lock.json)
- No dev menu in production

❌ **What's Missing:**
- No signed OTA updates (using unsigned EAS Update)
- No CI dependency scanning
- No jailbreak/root detection
- No App Attest or Play Integrity
- No code obfuscation
- No runtime tamper detection

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| Hermes engine | ✅ Enabled | ✅ SATISFIED | ✅ Yes |
| No dev menu in prod | ✅ Disabled | ✅ SATISFIED | ✅ Yes |
| Signed OTA updates | ❌ Unsigned | **HIGH** | ✅ Yes (EAS code signing) |
| CI dependency scanning | ❌ None | **HIGH** | ✅ Yes (npm audit, Snyk) |
| Jailbreak/root detection | ❌ None | **MEDIUM** | ⚠️ Partial (requires native module) |
| App Attest/Play Integrity | ❌ None | **HIGH** | ❌ No (requires native implementation) |
| Code obfuscation | ❌ None | **MEDIUM** | ⚠️ Partial (metro-minify-terser) |
| Runtime tamper detection | ❌ None | **LOW** | ✅ Yes (custom checks) |

---

### **Migration Path**

#### **Phase 1: CI/CD Security (1-2 weeks)**

**Dependency Scanning:**
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm audit --audit-level=high
      # Fail build if high/critical vulnerabilities found
      - run: |
          if [ $(npm audit --json | jq '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical') -gt 0 ]; then
            echo "High/critical vulnerabilities found"
            exit 1
          fi
```

**Add Snyk (optional):**
```bash
npm install -g snyk
snyk test  # Run in CI
```

---

#### **Phase 2: Signed OTA Updates (1 week)**

```bash
# Configure EAS Update code signing
eas update:configure

# Deploy signed update
eas update --branch production --message "Security patch"
```

**Verify signatures in app:**
```typescript
// App.tsx
import * as Updates from 'expo-updates';

Updates.checkForUpdateAsync().then(update => {
  if (update.isAvailable && update.manifest.signature) {
    // Update is signed and verified
    Updates.fetchUpdateAsync();
  } else {
    console.error('Unsigned update detected - rejecting');
  }
});
```

---

#### **Phase 3: Device Integrity Checks (2-3 weeks)**

**Jailbreak/Root Detection (Expo compatible with caveats):**
```typescript
// Limited detection without native modules
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const detectJailbreak = async () => {
  if (Platform.OS === 'ios') {
    // Check for common jailbreak paths
    const paths = [
      '/Applications/Cydia.app',
      '/Library/MobileSubstrate',
      '/bin/bash',
      '/usr/sbin/sshd'
    ];
    
    for (const path of paths) {
      try {
        await FileSystem.getInfoAsync(path);
        return true; // Jailbroken
      } catch {}
    }
  }
  
  if (Platform.OS === 'android') {
    // Check for root indicators
    const rootPaths = [
      '/system/app/Superuser.apk',
      '/sbin/su',
      '/system/bin/su'
    ];
    
    for (const path of rootPaths) {
      try {
        await FileSystem.getInfoAsync(path);
        return true; // Rooted
      } catch {}
    }
  }
  
  return false;
};

// Block voting on compromised devices
const handleVote = async () => {
  const compromised = await detectJailbreak();
  if (compromised) {
    Alert.alert('Security Notice', 'Voting disabled on modified devices');
    return;
  }
  
  // Proceed with vote
};
```

**Limitations:** Basic detection, easily bypassed. For production:
- Use `react-native-device-info` (requires native module, breaks Expo Go)
- Or require App Attest/Play Integrity (native only)

---

#### **Phase 4: App Attest & Play Integrity (Native Only)**

**NOT Expo Go compatible - requires custom native code**

**iOS App Attest:**
```swift
// ios/VoterUnions/AppDelegate.swift
import DeviceCheck

func attestDevice(completion: @escaping (String?) -> Void) {
    let service = DCAppAttestService.shared
    guard service.isSupported else { return completion(nil) }
    
    service.generateKey { keyId, error in
        guard let keyId = keyId else { return completion(nil) }
        
        // Send keyId to server for attestation
        let challenge = getServerChallenge()
        let hash = Data(challenge.utf8).sha256()
        
        service.attestKey(keyId, clientDataHash: hash) { attestation, error in
            // Send attestation to server for verification
            completion(attestation?.base64EncodedString())
        }
    }
}
```

**Android Play Integrity:**
```kotlin
// android/app/src/main/java/com/voterUnions/PlayIntegrityModule.kt
import com.google.android.play.core.integrity.IntegrityManager
import com.google.android.play.core.integrity.IntegrityManagerFactory

fun checkIntegrity(context: Context, callback: (String?) -> Unit) {
    val integrityManager = IntegrityManagerFactory.create(context)
    
    val nonce = generateNonce()
    val integrityTokenRequest = IntegrityTokenRequest.builder()
        .setNonce(nonce)
        .build()
    
    integrityManager.requestIntegrityToken(integrityTokenRequest)
        .addOnSuccessListener { response ->
            // Send token to server for verification
            callback(response.token())
        }
        .addOnFailureListener { callback(null) }
}
```

**Server Verification:**
```typescript
// supabase/functions/verify-integrity/index.ts
import { verify as verifyAppAttest } from '@apple/app-attest';
import { verify as verifyPlayIntegrity } from '@google/play-integrity';

Deno.serve(async (req) => {
  const { platform, token } = await req.json();
  
  if (platform === 'ios') {
    const valid = await verifyAppAttest(token, {
      teamId: 'YOUR_TEAM_ID',
      bundleId: 'com.voterUnions'
    });
    
    if (!valid) {
      return new Response('Invalid device', { status: 403 });
    }
  }
  
  if (platform === 'android') {
    const valid = await verifyPlayIntegrity(token, {
      packageName: 'com.voterUnions'
    });
    
    if (!valid) {
      return new Response('Invalid device', { status: 403 });
    }
  }
  
  return new Response('Device verified', { status: 200 });
});
```

---

#### **Phase 5: Code Obfuscation (2-3 weeks)**

**Metro bundler obfuscation:**
```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        toplevel: true,
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  };

  return config;
})();
```

**Advanced obfuscation (native only):**
- iOS: SwiftShield
- Android: ProGuard/R8

---

## 5) Voting & Union Logic

### **Target Requirements**

#### **Eligibility**
- **iOS/Android/Web:** Blind-signature token issuance to members only
- **Acceptance:** Only valid members receive voting tokens.

#### **Double Voting**
- **iOS/Android/Web:** Used-token IDs hashed and tracked
- **Acceptance:** Duplicate tokens rejected.

#### **Anonymity**
- **iOS/Android/Web:** No user→vote mapping stored
- **Acceptance:** Servers cannot link identity to ballot.

#### **Verifiability**
- **iOS/Android/Web:** Client receives hash receipt (no contents)
- **Acceptance:** Users can verify inclusion without revealing choice.

#### **Results**
- **iOS/Android/Web:** Aggregates only
- **Acceptance:** No per-vote metadata exposed.

---

### **Current Implementation**

✅ **What You Have:**
- Device-based voting (1 vote per device per proposal)
- Dual-trigger vote protection (prevents manipulation)
- RLS policies enforce union membership
- Aggregate vote counts only (no per-vote details)

❌ **What's Missing:**
- No blind signatures (votes linkable to users)
- Device ID stored (potential tracking)
- No cryptographic receipts
- Vote contents stored in plaintext

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| Blind-signature tokens | ❌ None | **CRITICAL** | ✅ Yes (RSA blind sigs) |
| No user→vote mapping | ⚠️ device_id stored | **HIGH** | ✅ Yes (use token hashes) |
| Token hash tracking | ❌ None | **HIGH** | ✅ Yes (PostgreSQL) |
| Cryptographic receipts | ❌ None | **MEDIUM** | ✅ Yes (hash commitments) |
| Aggregate results only | ✅ Implemented | ✅ SATISFIED | ✅ Yes |

---

### **Migration Path**

**See Section 2 (Data Minimization) for full blind signature implementation.**

**Summary:**
1. Replace plaintext votes with encrypted ballots
2. Issue blind-signed tokens to verified members
3. Accept anonymous votes with valid signatures
4. Track token hashes (not user IDs) to prevent double voting
5. Return commitment receipts for verifiability

---

## 6) Supply-Chain & Release Controls

### **Target Requirements**

#### **Audits**
- **iOS/Android/Web:** Weekly dependency and license audits
- **Acceptance:** Documented and tracked; blockers fail CI.

#### **Reproducibility**
- **iOS:** CI verifies App Store build hashes
- **Android:** CI verifies Play Store build hashes
- **Web:** CI verifies artifact hashes
- **Acceptance:** Release artifacts match CI builds.

#### **SBOM**
- **iOS/Android/Web:** Generated each release
- **Acceptance:** SBOM archived per version.

#### **Manual Review**
- **iOS/Android/Web:** Crypto/auth/networking dependencies
- **Acceptance:** Human sign-off before release.

---

### **Current Implementation**

✅ **What You Have:**
- Lockfile committed (package-lock.json)
- Manual dependency updates

❌ **What's Missing:**
- No automated weekly audits
- No build reproducibility checks
- No SBOM generation
- No manual review process for critical deps

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| Weekly audits | ❌ Manual only | **MEDIUM** | ✅ Yes (GitHub Actions) |
| Reproducible builds | ❌ Not verified | **MEDIUM** | ✅ Yes (EAS Build) |
| SBOM generation | ❌ None | **LOW** | ✅ Yes (cyclonedx) |
| Manual crypto review | ❌ None | **MEDIUM** | ✅ Yes (process) |

---

### **Migration Path**

#### **Phase 1: Automated Audits (1 week)**

**GitHub Actions:**
```yaml
# .github/workflows/weekly-audit.yml
name: Weekly Security Audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday 9am

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm audit --audit-level=moderate
      - run: npx better-npm-audit audit --level moderate
      - name: Check licenses
        run: npx license-checker --summary
```

---

#### **Phase 2: SBOM Generation (1 week)**

```bash
# Install CycloneDX
npm install -g @cyclonedx/cyclonedx-npm

# Generate SBOM
cyclonedx-npm --output-file sbom.json

# Archive in CI
# .github/workflows/release.yml
- name: Generate SBOM
  run: |
    cyclonedx-npm --output-file sbom-${{ github.sha }}.json
    
- name: Upload SBOM
  uses: actions/upload-artifact@v3
  with:
    name: sbom-${{ github.sha }}
    path: sbom-${{ github.sha }}.json
```

---

#### **Phase 3: Reproducible Builds (2 weeks)**

**EAS Build verification:**
```yaml
# .github/workflows/verify-build.yml
name: Verify Build Reproducibility

on:
  release:
    types: [published]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build from EAS
        run: eas build:download --platform ios --latest
      
      - name: Verify build hash
        run: |
          EXPECTED_HASH=$(cat build-hash.txt)
          ACTUAL_HASH=$(shasum -a 256 *.ipa | cut -d ' ' -f 1)
          
          if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
            echo "Build hash mismatch!"
            exit 1
          fi
```

---

#### **Phase 4: Manual Review Process (ongoing)**

**Create dependency review checklist:**

```markdown
# Crypto/Auth Dependency Review Checklist

Before approving PRs that add/update these dependency types:

## Cryptography Libraries
- [ ] Library actively maintained (commits in last 3 months)
- [ ] No known CVEs in version being added
- [ ] License compatible (MIT, Apache 2.0, BSD)
- [ ] Algorithms used are modern (no MD5, SHA1, DES, RC4)
- [ ] Library doesn't phone home or collect telemetry

## Authentication Libraries
- [ ] OWASP recommended or widely audited
- [ ] No hardcoded credentials in source
- [ ] Session management follows best practices
- [ ] Token storage uses secure methods

## Networking Libraries
- [ ] Enforces HTTPS by default
- [ ] Supports certificate pinning
- [ ] No insecure defaults (e.g., allows SSLv3)

Reviewer signature: ________________
Date: ___________
```

**GitHub branch protection:**
```yaml
# Require review from CODEOWNERS for sensitive files
# .github/CODEOWNERS
package.json @security-team
package-lock.json @security-team
src/services/supabase.ts @security-team
src/hooks/useAuth.tsx @security-team
```

---

## 7) Incident Response & Key Rotation

### **Target Requirements**

#### **Kill Switches**
- **iOS/Android/Web:** Server-side flags disable vote/join instantly
- **Acceptance:** Critical flows can be disabled without client update.

#### **Key Rotation**
- **iOS/Android/Web:** Quarterly tested; HSM/KMS with split custody
- **Acceptance:** Rotation runbook exercised quarterly.

#### **Backups**
- **iOS/Android/Web:** Encrypted, geo-redundant; quarterly restore test
- **Acceptance:** Proven restore; keys separate from data.

#### **Breach Response**
- **iOS/Android/Web:** Containment ≤24h; communications ≤72h if any PII impacted
- **Acceptance:** Timely containment and disclosure.

---

### **Current Implementation**

✅ **What You Have:**
- Supabase backups (daily)
- RLS policies can be updated immediately

❌ **What's Missing:**
- No feature flags / kill switches
- No key rotation process
- No backup restore testing
- No incident response plan

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| Kill switches | ❌ None | **HIGH** | ✅ Yes (feature flags) |
| Quarterly key rotation | ❌ None | **MEDIUM** | ✅ Yes (Supabase dashboard) |
| Backup restore drills | ❌ None | **HIGH** | ✅ Yes (process) |
| Incident response plan | ❌ None | **HIGH** | ✅ Yes (documentation) |

---

### **Migration Path**

#### **Phase 1: Feature Flags (1-2 weeks)**

**Database:**
```sql
-- Feature flags table
CREATE TABLE feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Critical flags
INSERT INTO feature_flags (flag_name, enabled) VALUES
  ('voting_enabled', true),
  ('union_creation_enabled', true),
  ('new_signups_enabled', true);

-- Function to check flags
CREATE OR REPLACE FUNCTION is_feature_enabled(flag TEXT)
RETURNS BOOLEAN AS $$
  SELECT enabled FROM feature_flags WHERE flag_name = flag;
$$ LANGUAGE SQL STABLE;
```

**Client:**
```typescript
// src/hooks/useFeatureFlag.ts
export const useFeatureFlag = (flagName: string) => {
  const { data: enabled, isLoading } = useQuery({
    queryKey: ['featureFlag', flagName],
    queryFn: async () => {
      const { data } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_name', flagName)
        .single();
      
      return data?.enabled ?? false;
    },
    refetchInterval: 30000, // Poll every 30s
  });
  
  return { enabled: enabled ?? false, isLoading };
};

// Usage
const VoteButton = () => {
  const { enabled } = useFeatureFlag('voting_enabled');
  
  if (!enabled) {
    return <Text>Voting temporarily disabled</Text>;
  }
  
  return <Button onPress={handleVote}>Vote</Button>;
};
```

**Kill switch UI (admin only):**
```typescript
// Emergency disable voting
const disableVoting = async () => {
  await supabase
    .from('feature_flags')
    .update({ enabled: false, updated_by: currentUserId })
    .eq('flag_name', 'voting_enabled');
  
  // All clients will see change within 30 seconds
};
```

---

#### **Phase 2: Backup Restore Drills (quarterly)**

**Runbook:**
```markdown
# Quarterly Backup Restore Test

**Schedule:** First Monday of every quarter

## Steps:

1. **Download latest backup**
   - Supabase Dashboard → Database → Backups
   - Download most recent backup

2. **Create test project**
   - Create new Supabase project: voter-unions-restore-test
   - Note project URL and keys

3. **Restore backup**
   ```bash
   pg_restore -h db.xxxxx.supabase.co -U postgres -d postgres backup.dump
   ```

4. **Verify data integrity**
   - Count total users: `SELECT COUNT(*) FROM profiles;`
   - Count total votes: `SELECT COUNT(*) FROM proposal_votes;`
   - Check RLS policies: `\d+ proposals`
   - Verify triggers: `SELECT * FROM pg_trigger;`

5. **Time the restore**
   - Record time taken (target: <30 minutes for 10GB DB)

6. **Document issues**
   - Any errors encountered?
   - Any data corruption?
   - RLS policies missing?

7. **Cleanup**
   - Delete test project
   - Archive test results

**Last test:** [Date]  
**Time to restore:** [Duration]  
**Issues found:** [None / List]  
**Tested by:** [Name]
```

---

#### **Phase 3: Key Rotation (1 week setup, quarterly execution)**

**Supabase JWT Secret Rotation:**
```markdown
# JWT Secret Rotation Runbook

**Frequency:** Every 90 days

## Steps:

1. **Generate new secret**
   - Supabase Dashboard → Settings → API
   - Click "Generate new JWT secret"
   - Save old secret for transition period

2. **Dual-secret transition (7 days)**
   - Both old and new secrets valid
   - Allows users to get new tokens without force-logout

3. **Monitor token errors**
   - Check error logs for auth failures
   - Should see <1% errors (users with very old tokens)

4. **Invalidate old secret (after 7 days)**
   - Supabase Dashboard → Disable old JWT secret
   - All users now must have new tokens

5. **Force logout remaining users**
   ```sql
   -- Invalidate all refresh tokens older than rotation date
   DELETE FROM auth.refresh_tokens
   WHERE created_at < '2025-01-01'::timestamptz;
   ```

6. **Update app config (if needed)**
   - EAS Update with new EXPO_PUBLIC_SUPABASE_ANON_KEY if changed
   - Deploy new build if service_role key changed

7. **Document rotation**
   - Date rotated: _______
   - By: _______
   - Issues: _______
```

---

#### **Phase 4: Incident Response Plan (documentation)**

**Create:** `voter-unions/INCIDENT_RESPONSE.md`

```markdown
# Incident Response Plan

## Severity Levels

### P0 - Critical (Active Breach)
- Database compromised
- User data exposed
- Vote manipulation detected
- **Response time:** <1 hour

### P1 - High (Potential Breach)
- Suspicious activity detected
- Vulnerability reported
- DDoS attack
- **Response time:** <4 hours

### P2 - Medium (Service Degradation)
- Performance issues
- Non-critical bug
- **Response time:** <24 hours

## Response Steps

### 1. Detect (0-15 min)
- [ ] Alert triggered (monitoring, user report, security researcher)
- [ ] Assign incident commander
- [ ] Create incident Slack channel

### 2. Contain (15 min - 4 hours)
- [ ] Disable affected features via kill switches
- [ ] Block malicious IPs at Cloudflare
- [ ] Revoke compromised API keys
- [ ] Enable maintenance mode if needed

### 3. Investigate (concurrent)
- [ ] Review audit logs
- [ ] Check database for unauthorized changes
- [ ] Analyze network traffic
- [ ] Determine scope of breach

### 4. Eradicate (4-24 hours)
- [ ] Patch vulnerability
- [ ] Rotate all keys and secrets
- [ ] Deploy fix via EAS Update or emergency build
- [ ] Verify fix in production

### 5. Recover (24-48 hours)
- [ ] Re-enable features gradually
- [ ] Monitor for recurrence
- [ ] Restore from backup if necessary

### 6. Communicate (within 72 hours)
- [ ] Internal stakeholders
- [ ] Affected users (if PII impacted)
- [ ] Public disclosure (if required by law)
- [ ] Security community (if vulnerability discovered)

### 7. Post-Mortem (within 7 days)
- [ ] Write incident report
- [ ] Identify root cause
- [ ] Document lessons learned
- [ ] Update runbooks

## Contact List

- **Incident Commander:** [Name, Phone]
- **Database Admin:** [Name, Phone]
- **Security Team:** [Email]
- **Legal Counsel:** [Name, Phone]
- **Supabase Support:** support@supabase.io
```

---

## 8) Compliance & Transparency

### **Target Requirements**

#### **Privacy Policy**
- **iOS/Android/Web:** "No personal data collected" with technical detail
- **Acceptance:** Public, specific, and truthful.

#### **Open Crypto Code**
- **iOS/Android/Web:** Public, auditable
- **Acceptance:** Vote/crypto code open for review.

#### **Transparency Report**
- **iOS/Android/Web:** Annual requests & actions
- **Acceptance:** Published yearly.

#### **Independent Audit**
- **iOS/Android/Web:** Pre-launch and major releases
- **Acceptance:** Third-party security review completed.

---

### **Current Implementation**

✅ **What You Have:**
- Privacy policy screen (basic GDPR compliance)
- Open source codebase (potential - not currently public)

❌ **What's Missing:**
- Privacy policy claims email collection (contradicts target)
- Vote/crypto code not separated for easy auditing
- No transparency report
- No third-party security audit

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| "No PII" privacy policy | ❌ Claims email collection | **HIGH** | ✅ Yes (update docs) |
| Open crypto code | ⚠️ Not public | **MEDIUM** | ✅ Yes (GitHub public repo) |
| Annual transparency report | ❌ None | **LOW** | ✅ Yes (documentation) |
| Third-party audit | ❌ None | **MEDIUM** | ✅ Yes (hire firm) |

---

### **Migration Path**

#### **Phase 1: Update Privacy Policy (1 week)**

**After implementing passkey-only auth:**

```markdown
# Privacy Policy - Voter Unions

**Effective Date:** [Date]

## Data We DO NOT Collect

We are committed to protecting your privacy. **We do not collect:**
- ❌ Email addresses
- ❌ Phone numbers
- ❌ Device identifiers
- ❌ IP addresses (not logged)
- ❌ Browsing history
- ❌ Location data
- ❌ Contacts or photos

## Data We DO Collect

**Encrypted Membership Records:**
- Your union membership is stored as encrypted ciphertext
- The server cannot decrypt this data without your device key
- Keys never leave your device

**Anonymous Vote Ballots:**
- Votes are blind-signed and encrypted
- The server cannot link your identity to your vote
- We only store aggregate vote counts

**Temporary Security Logs:**
- Kept for maximum 72 hours
- Used only for abuse prevention
- Automatically deleted after 72h

## How We Protect Your Data

**Device-Only Cryptography:**
- Private keys stored in Secure Enclave (iOS) or StrongBox (Android)
- All signing/encryption happens on your device
- Server never has access to your keys

**Zero-Knowledge Architecture:**
- Server cannot see membership details or vote contents
- All sensitive data encrypted client-side before upload

## Your Rights

**Data Portability:**
You can export your encrypted data anytime from Settings.

**Right to Deletion:**
You can delete your account and all data permanently.

**No Third-Party Sharing:**
We never sell or share your data with third parties.

## Technical Details

For transparency, here's exactly how we protect your privacy:
- WebAuthn/Passkeys for authentication (no passwords)
- RSA blind signatures for anonymous voting
- AES-256 encryption for membership records
- Certificate pinning on mobile apps
- .onion mirror for censorship resistance

## Contact

Questions? Contact us at: privacy@voterUnions.org

**This policy is legally binding and auditable.**
```

---

#### **Phase 2: Open Source Crypto Code (1 day)**

**Separate crypto code for easy auditing:**

```
voter-unions/
├── src/
│   ├── crypto/  ← Separate directory
│   │   ├── README.md  ← Document all crypto
│   │   ├── blindSignatures.ts  ← Voting crypto
│   │   ├── encryption.ts  ← Membership encryption
│   │   ├── keyManagement.ts  ← Key generation/rotation
│   │   └── __tests__/
│   │       ├── blindSignatures.test.ts
│   │       ├── encryption.test.ts
│   │       └── keyManagement.test.ts
```

**Crypto README:**
```markdown
# Cryptographic Implementation - Voter Unions

This directory contains all cryptographic code used in the app.

## Voting System (Blind Signatures)

**Algorithm:** RSA-2048 blind signatures  
**Library:** `blind-signatures` v2.1.0  
**Purpose:** Anonymous voting without server linkage

**Files:**
- `blindSignatures.ts` - Core voting crypto
- Tests: 15 unit tests, 100% coverage

## Membership Encryption

**Algorithm:** AES-256-GCM  
**Library:** `expo-crypto`  
**Purpose:** Client-side encryption before server upload

**Files:**
- `encryption.ts` - Membership encryption
- Tests: 12 unit tests, 100% coverage

## Security Properties

1. **Forward Secrecy:** Compromising future keys doesn't expose past votes
2. **Unlinkability:** Server cannot correlate votes to users
3. **Verifiability:** Users can prove their vote was counted
4. **Receipt-Freeness:** Users cannot prove how they voted (prevents coercion)

## Auditing

All crypto code is:
- ✅ Covered by automated tests
- ✅ Uses well-vetted libraries (no custom crypto)
- ✅ Documented with security proofs
- ✅ Open source for third-party review
```

**Make repository public:**
```bash
# After review and before launch
gh repo edit --visibility public
```

---

#### **Phase 3: Transparency Report (annual)**

**Create:** `voter-unions/transparency-reports/2025.md`

```markdown
# Transparency Report - 2025

**Reporting Period:** January 1, 2025 - December 31, 2025

## Government Requests for User Data

| Type | Requests Received | Requests Complied With | Data Disclosed |
|------|-------------------|------------------------|----------------|
| US Law Enforcement | 0 | 0 | N/A |
| Foreign Governments | 0 | 0 | N/A |
| Civil Subpoenas | 0 | 0 | N/A |

**Note:** We received zero requests in 2025. Even if we had received requests, we collect no personal data that could be disclosed.

## Content Takedown Requests

| Source | Requests | Complied | Rejected |
|--------|----------|----------|----------|
| Users (reporting system) | 47 | 12 | 35 |
| Legal (DMCA, etc.) | 0 | 0 | 0 |

**Compliance details:**
- 12 posts removed for violating community guidelines (spam, harassment)
- All moderation actions logged publicly in union moderation logs

## Security Incidents

| Date | Type | Impact | Resolution |
|------|------|--------|------------|
| None | N/A | N/A | N/A |

We experienced zero security breaches in 2025.

## Infrastructure Changes

- **Q1:** Migrated to passkey-only authentication (removed email requirement)
- **Q2:** Implemented blind-signature voting system
- **Q3:** Added .onion mirror for censorship resistance
- **Q4:** Third-party security audit completed

## Audits & Certifications

- **Security Audit:** Completed by [Audit Firm] on [Date]
  - Report: [Link to public report]
  - Findings: 0 critical, 2 medium (both resolved)

## Commitment to Transparency

We publish this report annually and welcome questions at: transparency@voterUnions.org
```

---

#### **Phase 4: Third-Party Security Audit (before launch)**

**Firms to consider:**
- Trail of Bits (crypto specialists): $30-50k
- NCC Group: $25-40k
- Cure53 (web/mobile): $20-35k

**Scope of audit:**
- Cryptographic implementation (blind signatures, encryption)
- Authentication flow (passkeys, key management)
- Database security (RLS policies, triggers)
- Network security (certificate pinning, HTTPS)
- Supply chain (dependency review)

**Deliverable:**
- Public report (redacted sensitive details)
- Private detailed findings
- Remediation recommendations

---

## 9) User Education & UX Safety

### **Target Requirements**

#### **Onboarding**
- **iOS/Android/Web:** Explain passkeys, no PII, client-side encryption
- **Acceptance:** Clear, non-technical language.

#### **Tor Access**
- **iOS:** "Open in Tor Browser" action to .onion mirror
- **Android:** Same
- **Web:** Interstitial explaining Tor requirement
- **Acceptance:** High-risk users guided to onion mirror.

#### **Consent UX**
- **iOS/Android/Web:** Explicit confirm for "Join union" and "Cast vote"
- **Acceptance:** Clear consent and privacy notes.

---

### **Current Implementation**

✅ **What You Have:**
- Onboarding screens explaining app features
- Consent dialogs for critical actions (partially)
- Email verification flow

❌ **What's Missing:**
- No passkey education (because using email/password)
- No Tor access instructions
- Limited privacy education

---

### **Gap Analysis**

| Requirement | Current Status | Gap Severity | Expo Compatible? |
|-------------|---------------|--------------|------------------|
| Passkey education | ❌ None (using passwords) | **LOW** | ✅ Yes (UI screens) |
| Privacy explanation | ⚠️ Basic | **MEDIUM** | ✅ Yes (UI screens) |
| Tor access instructions | ❌ None | **LOW** | ✅ Yes (deep linking) |
| Explicit consent | ⚠️ Partial | **LOW** | ✅ Yes (UI improvements) |

---

### **Migration Path**

#### **Phase 1: Passkey Onboarding (1-2 weeks)**

**After implementing passkey auth:**

```typescript
// src/screens/auth/PasskeyOnboardingScreen.tsx
const PasskeyOnboardingScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome to Voter Unions</Text>
      
      <View style={styles.section}>
        <Icon name="shield-check" size={48} color="#4CAF50" />
        <Text style={styles.heading}>No Passwords, No Emails</Text>
        <Text style={styles.body}>
          We use <Text style={styles.bold}>passkeys</Text> instead of passwords.
          Your phone's Face ID or fingerprint is your login.
        </Text>
      </View>
      
      <View style={styles.section}>
        <Icon name="lock" size={48} color="#2196F3" />
        <Text style={styles.heading}>Your Data Stays Private</Text>
        <Text style={styles.body}>
          We don't collect your email, phone, or location.
          Everything is encrypted on your device before leaving.
        </Text>
      </View>
      
      <View style={styles.section}>
        <Icon name="eye-off" size={48} color="#9C27B0" />
        <Text style={styles.heading}>Anonymous Voting</Text>
        <Text style={styles.body}>
          When you vote, we use <Text style={styles.bold}>blind signatures</Text>.
          The server cannot see how you voted or link votes to your identity.
        </Text>
      </View>
      
      <Button
        title="Set Up Passkey"
        onPress={handleCreatePasskey}
      />
      
      <TouchableOpacity onPress={() => navigation.navigate('PrivacyDetails')}>
        <Text style={styles.link}>How does this work technically?</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

---

#### **Phase 2: Tor Access Instructions (1 week)**

**Settings screen:**
```typescript
// src/screens/SettingsScreen.tsx
const TorAccessSection = () => {
  const openInTor = async () => {
    const onionUrl = 'http://voterUnionsXXXXXXX.onion';
    
    Alert.alert(
      'Open in Tor Browser',
      'For maximum privacy and censorship resistance, you can access Voter Unions via Tor.\n\n' +
      '1. Install Tor Browser (iOS) or Onion Browser (Android)\n' +
      '2. Open this link in Tor:\n' + onionUrl,
      [
        { text: 'Copy Link', onPress: () => Clipboard.setString(onionUrl) },
        { text: 'Open Tor', onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL(`onionbrowser://${onionUrl}`);
          } else {
            Linking.openURL(`torbrowser:${onionUrl}`);
          }
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>High Security Mode</Text>
      <Text style={styles.description}>
        If you're organizing in a high-risk environment, use our Tor mirror
        to hide your IP address and bypass censorship.
      </Text>
      <Button title="Access via Tor" onPress={openInTor} />
    </View>
  );
};
```

---

#### **Phase 3: Enhanced Consent Dialogs (1 week)**

**Join Union:**
```typescript
const JoinUnionButton = ({ unionId, unionName }: Props) => {
  const handleJoinPress = () => {
    Alert.alert(
      'Join Union?',
      `You're about to join "${unionName}".\n\n` +
      '✓ Your membership will be encrypted\n' +
      '✓ Only you can decrypt it\n' +
      '✓ You can leave anytime\n\n' +
      'Other union members will see you in the member list, but the server cannot.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join Union', onPress: confirmJoin, style: 'default' }
      ]
    );
  };
  
  return <Button title="Join Union" onPress={handleJoinPress} />;
};
```

**Cast Vote:**
```typescript
const VoteButton = ({ proposalId, vote }: Props) => {
  const handleVotePress = () => {
    Alert.alert(
      'Confirm Your Vote',
      `You're voting "${vote}" on this proposal.\n\n` +
      '✓ Your vote is anonymous and encrypted\n' +
      '✓ You can verify it was counted\n' +
      '✓ You cannot change it after submission\n' +
      '✓ The server cannot see how you voted\n\n' +
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Vote ${vote}`, onPress: confirmVote, style: 'default' }
      ]
    );
  };
  
  return <Button title={`Vote ${vote}`} onPress={handleVotePress} />;
};
```

---

## Pass/Fail Criteria

### **Passing Criteria Summary**

To achieve security acceptance, the app must satisfy ALL of the following:

#### ✅ **No Plaintext Personal Data**
- [ ] No collection or transmission of emails, phones, or device IDs
- [ ] Logs minimal and short-lived (≤72h)
- [ ] No analytics tracking individual users

#### ✅ **Device-Bound Secrets**
- [ ] Keys live only in Secure Enclave/StrongBox (native) or platform WebAuthn (web)
- [ ] Keys never transmitted to server
- [ ] Recovery never stores plaintext keys server-side

#### ✅ **Encrypted & Pinned Transport**
- [ ] All traffic HTTPS
- [ ] Native apps use certificate pinning (rotated per release)
- [ ] Web uses HSTS preload + CSP + SRI

#### ✅ **Server Breach Impact Minimal**
- [ ] Database dump yields no usable identities
- [ ] Database dump yields no vote linkages (ciphertexts only)
- [ ] Server cannot decrypt membership or vote data

#### ✅ **Private Verifiability**
- [ ] Users can verify their vote was counted
- [ ] Verification doesn't reveal vote contents or identity

#### ✅ **Auditable Crypto & Policy**
- [ ] Crypto and voting code public/auditable
- [ ] SBOM + reproducible builds in place
- [ ] Third-party security audit completed

#### ✅ **Censorship/Seizure Resilience**
- [ ] CDN origin hiding (WAF in front)
- [ ] .onion mirror maintained and accessible
- [ ] Kill-switches and key rotation tested quarterly

---

## Gap Analysis Summary

### **Current Architecture: Voter Unions (Expo + Supabase)**

| Category | Satisfied | Partially Satisfied | Not Satisfied | Critical Gaps |
|----------|-----------|---------------------|---------------|---------------|
| **1. Identity & Key Management** | 1/6 | 0/6 | 5/6 | Passkeys, No PII, Client crypto |
| **2. Data Minimization** | 2/6 | 1/6 | 3/6 | Encrypted records, Blind sigs |
| **3. Network Security** | 2/7 | 0/7 | 5/7 | Cert pinning, Replay protection |
| **4. Runtime Hardening** | 2/6 | 1/6 | 3/6 | Attestation, Jailbreak detection |
| **5. Voting Logic** | 1/5 | 1/5 | 3/5 | Blind signatures, No user mapping |
| **6. Supply Chain** | 1/4 | 0/4 | 3/4 | CI audits, SBOM, Reproducibility |
| **7. Incident Response** | 1/4 | 0/4 | 3/4 | Kill switches, Rotation, Drills |
| **8. Compliance** | 0/4 | 1/4 | 3/4 | Privacy policy update, Audit |
| **9. User Education** | 0/3 | 2/3 | 1/3 | Passkey onboarding, Tor access |
| **TOTAL** | **10/45** | **6/45** | **29/45** | **64% gap** |

---

### **Critical Gaps (Blocking Launch)**

These requirements are **CRITICAL** and must be addressed before public launch:

1. **Passkey-Only Authentication** - No emails/passwords
2. **Blind-Signature Voting** - No user→vote linkage
3. **Client-Side Encryption** - Server cannot decrypt membership
4. **Certificate Pinning** - Prevent MITM attacks
5. **Third-Party Security Audit** - Independent verification

---

### **High Priority Gaps (Should Address Soon)**

6. Server-side rate limiting (prevent abuse)
7. Replay protection (nonce + timestamp)
8. Feature flags / kill switches (incident response)
9. No device_id tracking (anonymity)
10. CI dependency scanning (supply chain)

---

### **Medium Priority Gaps (Address Before Scale)**

11. Key rotation process
12. App Attest / Play Integrity
13. Backup restore drills
14. SBOM generation
15. Incident response plan

---

### **Low Priority Gaps (Nice to Have)**

16. .onion mirror
17. Jailbreak/root detection
18. Code obfuscation
19. Transparency reports
20. User education enhancements

---

## Migration Roadmap

### **Phase 0: Current State (Today)**

**Architecture:** Expo + Supabase  
**Auth:** Email/password  
**Voting:** Device-based (plaintext votes)  
**Security Score:** 22% compliant

**Critical Limitations:**
- Collects emails (PII)
- Votes linkable to users
- No blind signatures
- No certificate pinning

---

### **Phase 1: Hardening Current Stack (1-3 months)**

**Goal:** Improve security within Expo/Supabase constraints  
**Security Score Target:** 45% compliant

**What to Implement:**
1. ✅ Client-side encryption for membership (2 weeks)
2. ✅ Shorten token lifetimes (1 day)
3. ✅ Add Cloudflare WAF (1 week)
4. ✅ CI dependency scanning (1 week)
5. ✅ Feature flags / kill switches (2 weeks)
6. ✅ Backup restore drills (quarterly)
7. ✅ SBOM generation (1 week)

**Trade-offs:**
- ✅ Expo Go compatible
- ✅ Fast implementation
- ❌ Still collects emails
- ❌ Votes still linkable

---

### **Phase 2: Hybrid Approach (3-6 months)**

**Goal:** Add critical security features, break Expo Go compatibility  
**Security Score Target:** 70% compliant

**What to Implement:**
1. ⚠️ Certificate pinning (requires EAS Build)
2. ⚠️ Blind-signature voting (complex but Expo-compatible)
3. ⚠️ Optional passkey enrollment (alongside email)
4. ⚠️ Server-side rate limiting (Edge Functions)
5. ⚠️ Replay protection (Edge Functions)
6. ⚠️ Jailbreak/root detection (basic)

**Trade-offs:**
- ❌ No more Expo Go (requires EAS builds)
- ✅ Still single codebase
- ⚠️ Still uses Supabase Auth (emails collected)
- ✅ Votes now anonymous (blind sigs)

---

### **Phase 3: Custom Auth Server (6-12 months)**

**Goal:** Remove PII collection entirely  
**Security Score Target:** 85% compliant

**What to Implement:**
1. ❌ Replace Supabase Auth with custom passkey server
2. ❌ Zero PII collection (no emails, no phones)
3. ❌ Social recovery system
4. ❌ Key rotation UI + backend
5. ✅ Update privacy policy ("no data collected")
6. ✅ Third-party security audit

**Trade-offs:**
- ✅ No PII collection
- ✅ Passkey-only auth
- ❌ Custom auth infrastructure ($50-100/mo)
- ❌ More operational burden

---

### **Phase 4: Full Native + Self-Hosted (12-18 months)**

**Goal:** Maximum security and independence  
**Security Score Target:** 95% compliant

**What to Implement:**
1. ❌ Rebuild in Swift (iOS) + Kotlin (Android)
2. ❌ Native WebAuthn/passkey APIs
3. ❌ App Attest + Play Integrity
4. ❌ Native certificate pinning
5. ❌ Self-hosted Supabase (or custom backend)
6. ❌ .onion mirror
7. ✅ Full code obfuscation
8. ✅ Runtime tamper detection

**Trade-offs:**
- ✅ Best possible security
- ✅ Maximum independence
- ❌ 2x development time forever
- ❌ High operational costs ($200-500/mo)

---

## Implementation Decision Matrix

### **Use Current Stack (Expo + Supabase) If:**
- ✅ MVP/early growth phase
- ✅ Limited budget (<$100/mo)
- ✅ Team focused on features, not infrastructure
- ✅ Organizing in democratic countries (US, EU, UK)
- ✅ Acceptable to collect emails (with strong RLS protection)

**Recommendation:** Implement Phase 1 (hardening)

---

### **Upgrade to Hybrid (Phase 2) If:**
- ⚠️ Seeing coordinated attacks or abuse
- ⚠️ Want anonymous voting (blind signatures)
- ⚠️ Have 1000+ active users
- ⚠️ Budget allows $100-200/mo
- ⚠️ Acceptable to break Expo Go compatibility

**Recommendation:** Implement Phase 2 (EAS Build + blind sigs)

---

### **Build Custom Auth (Phase 3) If:**
- 🔴 Legal requirement: no PII collection
- 🔴 Organizing in restrictive jurisdictions
- 🔴 Users demand zero-knowledge architecture
- 🔴 Budget allows $200-500/mo
- 🔴 Have DevOps expertise in-house

**Recommendation:** Implement Phase 3 (custom passkey server)

---

### **Go Full Native (Phase 4) If:**
- 🔴 State-level adversaries (surveillance, repression)
- 🔴 Need platform attestation (App Attest, Play Integrity)
- 🔴 Want maximum security posture
- 🔴 Budget allows $500-1000/mo
- 🔴 Have native iOS/Android developers
- 🔴 Can maintain 2 codebases long-term

**Recommendation:** Implement Phase 4 (native apps + self-hosted)

---

## Cost Comparison

| Phase | Monthly Cost | Development Time | Maintenance Burden | Security Score |
|-------|--------------|------------------|-------------------|----------------|
| **Phase 0 (Current)** | $0-25 | 0 months | Low | 22% |
| **Phase 1 (Hardened Expo)** | $25-50 | 1-3 months | Low | 45% |
| **Phase 2 (Hybrid)** | $50-100 | 3-6 months | Medium | 70% |
| **Phase 3 (Custom Auth)** | $100-300 | 6-12 months | High | 85% |
| **Phase 4 (Full Native)** | $200-1000 | 12-18 months | Very High | 95% |

---

## Conclusion

**This document defines the target security architecture** for a zero-knowledge, anonymous political organizing app.

**The current Voter Unions app (Expo + Supabase):**
- ✅ Has good foundation (RLS, device-based voting, email verification)
- ❌ Falls short on 64% of acceptance criteria
- ⚠️ Critical gaps: PII collection, vote linkability, no blind signatures

**Recommended path forward:**

1. **Now (Months 0-3):** Implement Phase 1 (hardening current stack)
   - Get to 45% compliance quickly
   - Minimal cost and complexity
   - Keeps Expo Go compatibility

2. **After MVP traction (Months 3-6):** Evaluate Phase 2 (hybrid)
   - If seeing abuse/attacks: implement server-side security
   - If users demand anonymity: implement blind signatures
   - Break Expo Go, move to EAS Build only

3. **If scaling (Months 6-12):** Consider Phase 3 (custom auth)
   - If legal requires no PII: build passkey-only system
   - If budget allows: hire security firm for audit

4. **If threatened (Months 12+):** Evaluate Phase 4 (native)
   - If facing state-level adversaries: rebuild in Swift/Kotlin
   - If need platform attestation: implement App Attest/Play Integrity
   - Accept 2x development cost for maximum security

**The choice depends on your threat model, budget, and timeline.**

---

## Related Documentation

- **Current Security Status:** [SECURITY_STATUS.md](SECURITY_STATUS.md) - What's implemented today
- **Vote Protection Audit:** [VOTE_COUNTING_AUDIT.md](VOTE_COUNTING_AUDIT.md) - Device-based voting system
- **GDPR Compliance:** [PHASE3_COMPLETE.md](PHASE3_COMPLETE.md) - Data export, deletion, reporting
- **Email Verification:** [EMAIL_VERIFICATION_COMPLETE.md](EMAIL_VERIFICATION_COMPLETE.md) - Verification enforcement
- **Project Overview:** [replit.md](replit.md) - Architecture and user preferences

---

**For security vulnerabilities, please report to:** [Your security contact - add before production]

**Do not** disclose security issues publicly until they are fixed.
