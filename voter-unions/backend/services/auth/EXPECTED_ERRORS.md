# Expected Errors & Compatibility Issues

## ⚠️ Critical: Web vs Native Signature Compatibility

### The Problem

Web and native clients use different crypto libraries that may produce **incompatible signatures**:

| Platform | Library | Hashing | Format |
|----------|---------|---------|--------|
| Web | @noble/curves | Manual SHA-256 first | Compact (64 bytes) |
| Native | elliptic | Unknown (may be internal) | DER (variable) |

---

## 🔍 Specific Incompatibility Risks

### 1. Double-Hashing Issue

**Web Implementation:**
```typescript
// webDeviceAuth.ts:161-164
const messageHash = sha256(new TextEncoder().encode(challenge));
const signatureBytes = p256.sign(messageHash, privateKeyBytes);
```

**Native Implementation:**
```typescript
// deviceAuth.ts:132
const signature = keyPair.sign(challenge);
```

**Question:** Does `elliptic.sign(challenge)` hash internally or not?

**If YES:** ✅ Signatures compatible (both sign sha256(challenge))
**If NO:** ❌ **INCOMPATIBLE**
- Web signs: `sha256(challenge)`
- Native signs: `challenge` (raw string)
- Backend expects: `sha256(challenge)`
- **Result:** Native authentication will FAIL with "Invalid signature"

---

### 2. String Encoding Differences

**Web:**
```typescript
new TextEncoder().encode(challenge)  // UTF-8
```

**Native (unknown):**
```typescript
keyPair.sign(challenge)  // What encoding?
```

**If different encoding:** Hash values won't match, signatures invalid.

---

### 3. Signature Format (Already Handled)

**Web:** Compact format (64 bytes)
**Native:** DER format (70-72 bytes)

**Solution:** ✅ Backend has DER parser to convert DER → Compact

---

## 🧪 Testing Required

### Test 1: Verify Native Hashing Behavior

Create a test in `deviceAuth.ts`:

```typescript
import { ec } from 'elliptic';
import { createHash } from 'crypto';

// Test if elliptic hashes internally
const testChallenge = "test-challenge-123";
const privateKey = "abcd1234...";

const keyPair = ec.keyFromPrivate(privateKey, 'hex');

// Sign with elliptic
const signature = keyPair.sign(testChallenge);

// Manually hash and sign
const manualHash = createHash('sha256').update(testChallenge).digest();
const signatureFromHash = keyPair.sign(manualHash);

// Compare
console.log("Sign(challenge):", signature.toDER('hex'));
console.log("Sign(sha256(challenge)):", signatureFromHash.toDER('hex'));
console.log("Match?", signature.toDER('hex') === signatureFromHash.toDER('hex'));
```

**Expected Result:**
- If they match → elliptic hashes internally ✅
- If different → **WE HAVE A PROBLEM** ❌

---

### Test 2: Cross-Platform Verification

1. Register a web device
2. Get challenge
3. Sign with web crypto
4. Verify on backend → Should succeed ✅

5. Register a native device
6. Get challenge
7. Sign with elliptic
8. Verify on backend → **May fail** ❌

---

## 🛠️ Potential Fix If Incompatible

If native doesn't hash internally, we need to fix `deviceAuth.ts`:

### Current (Potentially Wrong):
```typescript
export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const signature = keyPair.sign(challenge);  // ❌ May not hash
  return signature.toDER('hex');
}
```

### Fixed Version:
```typescript
import { createHash } from 'crypto';

export async function signChallenge(
  challenge: string,
  privateKey: string
): Promise<string> {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');

  // Manually hash FIRST (like web does)
  const messageHash = createHash('sha256').update(challenge).digest();

  // Sign the hash
  const signature = keyPair.sign(messageHash);
  return signature.toDER('hex');
}
```

---

## 📊 Expected Error Scenarios

### Scenario 1: Native Signs Without Hashing

**What Happens:**
1. Native client registers → ✅ Success
2. Native client gets challenge: `"abc123..."`
3. Native signs `"abc123..."` directly (no hash)
4. Native sends signature to backend
5. Backend tries to verify:
   - Expects signature of: `sha256("abc123...")`
   - Receives signature of: `"abc123..."` (raw)
6. **Verification fails** → 401 Unauthorized
7. **Error message:** "Invalid signature"

**Logs:**
```
[Platform: ios] Compact format verification failed, trying alternatives
[Platform: ios] DER format verification failed
[Platform: ios] Raw message verification failed
[Platform: ios] All verification strategies failed
```

---

### Scenario 2: String Encoding Mismatch

**What Happens:**
1. Web encodes challenge as UTF-8
2. Native encodes challenge as ASCII (hypothetically)
3. Hash values differ
4. Signatures valid for different hashes
5. **Verification fails** → 401 Unauthorized

---

### Scenario 3: Everything Works (Best Case)

**What Happens:**
1. Both platforms hash identically
2. Backend DER parser converts native signatures
3. Verification succeeds ✅

---

## 🔍 How to Detect the Issue

### Backend Logs to Watch For:

**Web Success:**
```
[Platform: web] Signature verified with compact format
[Platform: web] Device authenticated
```

**Native Success:**
```
[Platform: ios] Compact format verification failed, trying alternatives
[Platform: ios] Signature verified with DER format
[Platform: ios] Device authenticated
```

**Native Failure (Hashing Issue):**
```
[Platform: ios] Compact format verification failed, trying alternatives
[Platform: ios] DER format verification failed
[Platform: ios] Raw message verification failed
[Platform: ios] All verification strategies failed
ERROR: 401 Invalid signature
```

---

## 🎯 Recommended Testing Order

1. **Test web authentication first**
   - Should work (same library on client and server)

2. **Test native authentication second**
   - May fail due to hashing incompatibility

3. **If native fails:**
   - Check backend logs for platform context
   - Verify elliptic hashing behavior
   - Apply fix to `deviceAuth.ts` if needed

---

## 🛡️ Mitigation: Strategy 3 (Raw Message)

The backend already has a fallback strategy:

```typescript
// Strategy 3: Try with different hash (some implementations might not hash)
try {
  const isValid = p256.verify(
    signatureBytes,
    hexToBytes(message), // Use raw message bytes (no hash)
    publicKeyBytes
  );
  if (isValid) {
    console.log(`[Platform: ${platform}] Signature verified with raw message`);
    return true;
  }
}
```

**This might catch the issue** if native signs raw strings, but it's not guaranteed to work because:
- The raw challenge is a hex string
- `hexToBytes(message)` expects hex encoding
- If challenge is not valid hex, this fails too

---

## 🎯 Bottom Line

### Most Likely Scenario:
**Web works, Native MIGHT fail with "Invalid signature" on first test.**

### Why I Built 3 Strategies:
To handle these exact incompatibility risks defensively.

### What You Should Do:
1. Test web authentication → Should work ✅
2. Test native authentication → Watch logs carefully
3. If native fails with "Invalid signature":
   - Check backend logs for strategy attempts
   - We'll need to investigate elliptic's hashing behavior
   - May need to update `deviceAuth.ts` to hash manually

---

## 📝 Test Checklist

- [ ] Web registration succeeds
- [ ] Web login succeeds
- [ ] Native registration succeeds
- [ ] Native login succeeds (⚠️ May fail here)
- [ ] Invalid signature returns 401 (not crash)
- [ ] Platform logged in all attempts

---

**Last Updated:** October 22, 2025
**Confidence Level:** 70% chance native works as-is, 30% chance needs hashing fix
