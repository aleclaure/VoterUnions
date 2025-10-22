# Signature Compatibility Guide

**Complete guide to diagnosing and fixing web vs native signature incompatibility**

---

## 📋 Table of Contents

1. [The Problem](#the-problem)
2. [Diagnosis](#diagnosis)
3. [Fix Options](#fix-options)
4. [Testing Procedures](#testing-procedures)
5. [Deployment Strategy](#deployment-strategy)

---

## 🔍 The Problem

Web and native clients use different crypto libraries that may produce incompatible signatures:

### Web (`webDeviceAuth.ts`)
```typescript
// Manually hashes FIRST
const messageHash = sha256(new TextEncoder().encode(challenge));
const signature = p256.sign(messageHash, privateKey);
// Format: Compact (64 bytes)
```

### Native (`deviceAuth.ts`)
```typescript
// May or may not hash internally
const signature = keyPair.sign(challenge);
// Format: DER (variable length)
```

### Backend Expectation
```typescript
// Expects signature of SHA-256 hashed message
const messageHash = sha256(new TextEncoder().encode(message));
const isValid = p256.verify(signatureBytes, messageHash, publicKeyBytes);
```

### Potential Issues

1. **Double-hashing**: If elliptic hashes internally, native and web are compatible ✅
2. **No hashing**: If elliptic doesn't hash, native signs raw string while web signs hash ❌
3. **Encoding differences**: Different string encodings could cause hash mismatches ❌

---

## 🔬 Diagnosis

### Step 1: Run Compatibility Test

```typescript
// src/services/__tests__/cryptoCompatibilityTest.ts
import { runAllCompatibilityTests } from '../__tests__/cryptoCompatibilityTest';

const results = runAllCompatibilityTests();

if (results.compatible) {
  console.log('✅ Libraries are compatible - no fix needed');
} else {
  console.log('❌ Incompatibility detected - apply Fix Option 1 or 2');
}
```

### Step 2: Test Web Authentication

```bash
# Should work (same library on client and server)
curl -X POST http://localhost:3001/auth/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "04...",
    "deviceId": "web-test-123",
    "platform": "web"
  }'
```

**Expected:** ✅ Success

### Step 3: Test Native Authentication

```bash
# May fail if hashing incompatible
curl -X POST http://localhost:3001/auth/verify-device \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": "abc123...",
    "signature": "30440220...",
    "deviceId": "ios-test-123",
    "publicKey": "04..."
  }'
```

**If Success:** ✅ No fix needed, libraries are compatible
**If 401 "Invalid signature":** ❌ Apply one of the fixes below

### Step 4: Check Backend Logs

**Compatible (Success):**
```
[Platform: ios] Compact format verification failed, trying alternatives
[Platform: ios] Signature verified with DER format
[Platform: ios] Device authenticated
```

**Incompatible (Failure):**
```
[Platform: ios] Compact format verification failed, trying alternatives
[Platform: ios] DER format verification failed
[Platform: ios] Raw message verification failed
[Platform: ios] All verification strategies failed
ERROR: 401 Invalid signature
```

---

## 🛠️ Fix Options

### Fix Option 1: Normalize Native to Hash Manually ⭐ RECOMMENDED

**When to use:** After confirming incompatibility
**Pros:** Guarantees compatibility, simple one-time fix
**Cons:** Requires changing client code

**Files:**
- `src/services/FIXES/FIX_OPTION_1_deviceAuth_manual_hash.ts`

**How to apply:**

1. **Add import to deviceAuth.ts:**
```typescript
import { sha256 } from '@noble/hashes/sha256';
```

2. **Update signChallenge function:**
```typescript
export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');

  // CRITICAL: Manually hash FIRST
  const messageHash = sha256(new TextEncoder().encode(challenge));

  // Sign the hash
  const signature = keyPair.sign(messageHash);
  return signature.toDER('hex');
}
```

3. **Update verifySignature function:**
```typescript
export function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string
): boolean {
  const key = ec.keyFromPublic(publicKey, 'hex');

  // CRITICAL: Manually hash FIRST
  const messageHash = sha256(new TextEncoder().encode(challenge));

  return key.verify(messageHash, signature);
}
```

4. **Test:**
```bash
# Both should now succeed
npm run test:web-auth
npm run test:native-auth
```

---

### Fix Option 2: Backend Dual Verification

**When to use:** Can't update native clients immediately
**Pros:** No client changes, backward compatible
**Cons:** More complex backend, hides root cause

**Files:**
- `backend/services/auth/FIXES/FIX_OPTION_2_backend_dual_verification.ts`

**How to apply:**

Replace `verifySignature` in `backend/services/auth/src/crypto.ts` with the version from Fix Option 2.

**Adds 2 new strategies:**
- Strategy 3: Verify raw message (no hash)
- Strategy 4: DER + raw message

**Backend will now accept:**
- ✅ Hashed signatures (web, fixed native)
- ✅ Unhashed signatures (unfixed native)

**Logs will warn when detecting unhashed:**
```
[Platform: ios] ⚠️  Verified with raw message (native not hashing!)
[Platform: ios] ⚠️  RECOMMENDATION: Update native client to hash before signing
```

---

### Fix Option 3: Shared Crypto Utilities ⭐ BEST LONG-TERM

**When to use:** For maintainability and preventing future issues
**Pros:** Single source of truth, prevents divergence
**Cons:** More initial work

**Files:**
- `src/services/FIXES/FIX_OPTION_3_shared_crypto_utils.ts`

**How to apply:**

1. **Add shared utilities:**
```bash
cp src/services/FIXES/FIX_OPTION_3_shared_crypto_utils.ts \
   src/services/sharedCryptoUtils.ts
```

2. **Update webDeviceAuth.ts:**
```typescript
import { prepareMessageForSigning, bytesToHex, hexToBytes }
  from './sharedCryptoUtils';

export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  const privateKeyBytes = hexToBytes(privateKey);
  const messageHash = prepareMessageForSigning(challenge); // ← Shared
  const signature = p256.sign(messageHash, privateKeyBytes);
  return bytesToHex(signature.toCompactRawBytes());
}
```

3. **Update deviceAuth.ts:**
```typescript
import { prepareMessageForSigning } from './sharedCryptoUtils';

export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const messageHash = prepareMessageForSigning(challenge); // ← Shared
  const signature = keyPair.sign(messageHash);
  return signature.toDER('hex');
}
```

4. **Benefits:**
- Both platforms use identical hashing logic
- Single place to update crypto operations
- Well-documented canonical methods
- Easy to test and maintain

---

## 🧪 Testing Procedures

### 1. Run Compatibility Test

```bash
# Frontend
cd /path/to/voter-unions
npm run test:crypto-compatibility
```

Expected output:
```
=== ELLIPTIC HASHING BEHAVIOR TEST ===
Signatures match: ✅ YES
Conclusion: Elliptic hashes internally - compatible with backend

=== CROSS-LIBRARY COMPATIBILITY TEST ===
Public keys match: ✅ YES
```

### 2. Use Diagnostic Endpoints

**Backend must be running in development mode:**

```bash
# Test signature verification
curl -X POST http://localhost:3001/diagnostic/test-signature \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test-challenge-123",
    "signature": "30440220...",
    "publicKey": "04a1b2c3...",
    "platform": "ios"
  }'

# Response:
{
  "valid": true,
  "diagnostics": {
    "platform": "ios",
    "signatureFormat": "DER",
    "expectedHash": "abcd1234..."
  }
}
```

```bash
# Test hashing consistency
curl -X POST http://localhost:3001/diagnostic/hash-message \
  -H "Content-Type: application/json" \
  -d '{"message": "test-challenge-123"}'

# Compare client-side hash with server-side hash
# They MUST match
```

### 3. End-to-End Test

**Web:**
```bash
# 1. Register
POST /auth/register-device
{ "platform": "web", "publicKey": "...", "deviceId": "..." }

# 2. Get challenge
POST /auth/challenge
{ "deviceId": "web-test-123", "platform": "web" }

# 3. Sign challenge (client-side)
const hash = sha256(challenge);
const signature = p256.sign(hash, privateKey);

# 4. Verify
POST /auth/verify-device
{ "challenge": "...", "signature": "...", "deviceId": "...", "publicKey": "..." }

# Expected: 200 OK with tokens
```

**Native:**
```bash
# Same flow, but signature format is DER
# Backend should auto-detect and convert

# Expected: 200 OK with tokens
```

---

## 🚀 Deployment Strategy

### Phase 1: Diagnosis (Local)

1. ✅ Run cryptoCompatibilityTest
2. ✅ Test web authentication locally
3. ✅ Test native authentication locally
4. ✅ Check backend logs
5. ✅ Determine if fix needed

### Phase 2: Apply Fix (If Needed)

**If incompatible detected:**

1. **Immediate (Backend Fix Option 2):**
   - Deploy backend with dual verification
   - Allows existing clients to keep working
   - Logs warnings for unhashed signatures

2. **Client Update (Fix Option 1):**
   - Update deviceAuth.ts to hash manually
   - Release new app version
   - Monitor backend logs to see adoption

3. **Long-term (Fix Option 3):**
   - Refactor to shared utilities
   - Prevents future issues
   - Clean architecture

### Phase 3: Verification (Production)

1. **Deploy backend:**
   ```bash
   cd backend/services/auth
   railway up
   ```

2. **Test web registration:**
   ```bash
   # From browser
   https://yourapp.com
   # Click "Register This Device"
   # Check Railway logs
   ```

3. **Test native registration:**
   ```bash
   # From iOS/Android app
   # Register device
   # Check Railway logs for verification strategy used
   ```

4. **Monitor logs:**
   ```bash
   railway logs
   # Look for:
   # [Platform: web] Signature verified with compact format
   # [Platform: ios] Signature verified with DER format
   # Or warnings if unhashed
   ```

### Phase 4: Cleanup

After all clients updated to Fix Option 1 or 3:

1. **Remove backend fallback strategies** (if using Fix Option 2)
2. **Keep only Strategy 1 and 2** (hashed verification)
3. **Add test to prevent regression**

---

## 📊 Decision Matrix

| Scenario | Recommended Fix | Timeline |
|----------|----------------|----------|
| Just starting development | Fix Option 3 | Day 1 |
| Discovered before launch | Fix Option 1 | Before deploy |
| Discovered after launch | Fix Option 2 → 1 → 3 | Gradual |
| Can't update native app | Fix Option 2 | Permanent |

---

## 🔒 Security Notes

All fix options are secure because:

1. **We control the challenge**: Server generates random challenge
2. **We verify the signature**: Signature must match the public key
3. **Public key is registered**: Device public key stored during registration
4. **Challenge is single-use**: Deleted after verification
5. **Short expiration**: Challenges expire in 5 minutes

Whether signing `sha256(challenge)` or `challenge` directly:
- Signature still proves possession of private key ✅
- Replay attacks prevented by single-use challenges ✅
- Man-in-the-middle prevented by signature verification ✅

---

## 📝 Summary

1. **Run diagnostic test** to determine if fix needed
2. **Choose fix based on your scenario:**
   - **Starting fresh?** → Fix Option 3
   - **Need quick fix?** → Fix Option 1
   - **Can't update clients?** → Fix Option 2
3. **Test thoroughly** with diagnostic endpoints
4. **Deploy and monitor** backend logs
5. **Verify both platforms** authenticate successfully

**Files to reference:**
- Diagnostic test: `src/services/__tests__/cryptoCompatibilityTest.ts`
- Fix Option 1: `src/services/FIXES/FIX_OPTION_1_deviceAuth_manual_hash.ts`
- Fix Option 2: `backend/services/auth/FIXES/FIX_OPTION_2_backend_dual_verification.ts`
- Fix Option 3: `src/services/FIXES/FIX_OPTION_3_shared_crypto_utils.ts`
- Diagnostic endpoints: `backend/services/auth/src/routes/diagnostic.ts`
- Expected errors: `backend/services/auth/EXPECTED_ERRORS.md`

---

**Last Updated:** October 22, 2025
