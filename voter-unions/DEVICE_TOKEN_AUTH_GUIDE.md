# Device Token Authentication - Complete Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [User Experience](#user-experience)
- [Security](#security)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is Device Token Authentication?

Device Token Authentication is a **privacy-first** authentication system that eliminates the need for email addresses and passwords. Instead, it uses **cryptographic signatures** to prove device identity.

**Key Benefits:**
- 🎭 **No Email Collection** - Complete user privacy
- 🔐 **No Passwords** - Nothing to forget or leak
- ⚡ **One-Tap Login** - Automatic authentication
- 🛡️ **Hardware Security** - Keys stored in iOS Keychain / Android Keystore
- ✅ **Expo Go Compatible** - Works in development without custom native modules

### Why We Built This

Originally planned to use WebAuthn (biometric authentication), but WebAuthn requires custom native modules that are incompatible with Expo Go. Device Token Auth achieves the same privacy-first goals while staying 100% within the Expo managed workflow.

---

## Architecture

### Cryptographic Flow

```
1. REGISTRATION
   User taps "Create Account"
   ↓
   App generates ECDSA P-256 keypair
   ↓
   Private key → Secure Storage (hardware-backed)
   Public key → Backend server
   ↓
   Backend stores public key + issues JWT tokens
   ↓
   User registered!

2. LOGIN
   App detects existing keypair
   ↓
   Backend sends random challenge
   ↓
   App signs challenge with private key
   ↓
   Backend verifies signature with public key
   ↓
   If valid → Issue JWT tokens
   ↓
   User authenticated!
```

### Technology Stack

**Frontend (Expo/React Native):**
- `@noble/curves` - ECDSA P-256 signatures (audited by Trail of Bits)
- `@noble/hashes` - SHA-256 hashing
- `react-native-get-random-values` - Hardware RNG polyfill
- `expo-secure-store` - Hardware-backed key storage
- `expo-device` - Device information APIs

**Backend (Node.js/Fastify):**
- `@noble/curves` - Signature verification
- `jsonwebtoken` - JWT token generation
- `ioredis` - Challenge storage (5-minute TTL)
- `pg` - PostgreSQL database

**Security:**
- NIST P-256 (secp256r1) elliptic curve
- Deterministic signatures (RFC 6979)
- Hardware-backed randomness (SecRandomCopyBytes on iOS, SecureRandom on Android)
- Zero-knowledge authentication (backend never sees private key)

---

## Getting Started

### Prerequisites

- Expo Go app installed on iOS or Android device
- Node.js 18+ (for backend)
- PostgreSQL 14+ (for backend)
- Redis 6+ (for backend challenge storage)

### Enable Device Token Auth

**1. Set environment variable:**

```bash
export EXPO_PUBLIC_USE_DEVICE_AUTH=true
```

Or add to `.env`:
```
EXPO_PUBLIC_USE_DEVICE_AUTH=true
```

**2. Restart Expo server:**

```bash
npm start
```

**3. Open in Expo Go:**

Scan the QR code with your device.

### Test the Integration

**Day 1 Test (Crypto Verification):**

The app will show a DeviceAuthTest component on launch. Tap "Run Crypto Tests" to verify:
- ✅ Hardware RNG working
- ✅ Keypair generation working
- ✅ Signatures valid
- ✅ Secure storage working

**Registration Test:**

Navigate to DeviceRegisterScreen and tap "Create Account". You should see:
1. Platform check (native only)
2. Feature explanation screen
3. One-tap registration
4. Success message

**Login Test:**

After registration, navigate to DeviceLoginScreen. You should see:
1. Auto-login attempt (if keypair detected)
2. Manual "Log In" button
3. Instant authentication

---

## User Experience

### Registration Flow

```
User sees: "Create Your Account - Privacy-First Authentication"

Explainer Screen:
┌────────────────────────────────────────┐
│ 🔒 How It Works                        │
│                                        │
│ 🎭 No Email Collection                │
│ We don't ask for email or password    │
│                                        │
│ 🔐 Cryptographic Identity              │
│ Your device generates a unique key    │
│                                        │
│ ⚡ One-Tap Login                       │
│ Future logins are automatic!          │
│                                        │
│ 📱 Device-Specific                     │
│ Account tied to this device           │
└────────────────────────────────────────┘

[ Create Account ]  ← One tap!

Success: "Account Created! 🎉"
```

### Login Flow

```
User opens app
↓
App detects device keypair
↓
Auto-login starts (silent, in background)
↓
User sees: "Logging in automatically..."
↓
Success! User authenticated
↓
Navigate to main app

If auto-login fails:
User sees manual "Log In" button
One tap → Authenticated!
```

### Platform Handling

**On Web:**
```
⚠️ Web Platform Detected

Device Token Authentication requires hardware-backed
secure storage, which is only available on iOS and Android.

To use this feature:
1. Install Expo Go on your device
2. Scan the QR code
3. Create your account
```

**Already Registered:**
```
✅ Already Registered

This device has already been registered.
You should be logged in automatically.

If you want to create a new account, please log out first.
```

---

## Security

### Cryptographic Details

**Curve:** NIST P-256 (secp256r1)
- NSA Suite B approved
- FIPS 186-4 compliant
- 128-bit security level
- Widely supported in hardware

**Signature Algorithm:** ECDSA with deterministic nonces (RFC 6979)
- Same input = same signature (reproducible)
- No random nonce needed (safer against bad RNG)
- Signature size: ~64-72 bytes

**Hash Function:** SHA-256
- FIPS 180-4 compliant
- 256-bit output
- Collision-resistant

### Key Storage

**iOS:**
- iOS Keychain (hardware-backed)
- Survives app reinstall
- Requires biometric/passcode to access (configurable)
- Backed up to iCloud Keychain (encrypted)

**Android:**
- Android Keystore (hardware-backed)
- Survives app reinstall
- Can require biometric/PIN for access
- Not backed up (device-specific)

### Threat Model

**What Device Token Auth Protects Against:**
- ✅ Password leaks (no passwords exist)
- ✅ Phishing (no credentials to steal)
- ✅ Credential stuffing (each device unique)
- ✅ Man-in-the-middle (signatures can't be replayed)
- ✅ Privacy invasion (no email/PII collected)

**What It Doesn't Protect Against:**
- ❌ Physical device theft (attacker has the keys)
- ❌ Malware on device (can intercept before signing)
- ❌ Rooted/jailbroken devices (key extraction possible)

**Mitigations:**
- Require device passcode/biometric for key access
- Detect rooted/jailbroken devices and refuse auth
- Implement session timeouts
- Monitor for suspicious activity patterns

### Attack Scenarios

**Scenario 1: Stolen Device**
- Attacker has physical access to device
- **Risk:** Can authenticate as user if device unlocked
- **Mitigation:** Require biometric/PIN for key access, remote logout capability

**Scenario 2: Man-in-the-Middle**
- Attacker intercepts network traffic
- **Risk:** None (signatures are one-time use, challenge-based)
- **Mitigation:** Challenges expire in 5 minutes, deleted after use

**Scenario 3: Signature Replay**
- Attacker captures old signature
- **Risk:** None (challenge changes each time)
- **Mitigation:** Backend verifies challenge matches stored value

**Scenario 4: Public Key Replacement**
- Attacker tries to register with same device ID
- **Risk:** None (device ID is unique constraint)
- **Mitigation:** Database enforces UNIQUE(device_id)

---

## Development

### File Structure

```
voter-unions/
├── src/
│   ├── setup/
│   │   └── crypto-polyfill.ts           ← Hardware RNG setup (MUST IMPORT FIRST)
│   ├── services/
│   │   └── deviceAuth.ts                ← Core crypto functions
│   ├── hooks/
│   │   └── useAuth.ts                   ← Auth hook with device methods
│   ├── screens/
│   │   ├── DeviceRegisterScreen.tsx     ← Registration UI
│   │   ├── DeviceLoginScreen.tsx        ← Login UI
│   │   └── DeviceAuthTest.tsx           ← Crypto test component
│   └── config.ts                        ← Feature flags (USE_DEVICE_AUTH)

backend/
└── services/
    └── auth/
        ├── src/
        │   ├── routes/
        │   │   ├── register.ts          ← POST /auth/register-device
        │   │   └── auth.ts              ← POST /auth/challenge, /auth/verify-device
        │   └── db/
        │       └── schema.sql           ← device_credentials table
        └── DEVICE_TOKEN_AUTH_MIGRATION.md
```

### Key Functions

**`deviceAuth.ts`:**
```typescript
isDeviceAuthSupported()          // Check if platform supports device auth
generateDeviceKeypair()          // Generate P-256 keypair
storeDeviceKeypair()             // Save to secure storage
getDeviceKeypair()               // Retrieve from secure storage
signChallenge()                  // Sign challenge with private key
verifySignature()                // Verify signature (local testing)
getDeviceInfo()                  // Get device metadata
deleteDeviceKeypair()            // Remove keys (logout)
testDeviceAuth()                 // Run comprehensive tests
```

**`useAuth.ts`:**
```typescript
registerWithDevice()             // Register new device
loginWithDevice()                // Authenticate with signature
canAutoLogin()                   // Check if auto-login possible
hasDeviceKeypair                 // Boolean state (device registered)
```

### Testing Locally

**1. Test Crypto Setup (Day 1):**
```bash
# Open app in Expo Go
# Component shows automatically
# Tap "Run Crypto Tests"
# All tests should pass ✅
```

**2. Test Registration:**
```bash
# Navigate to DeviceRegisterScreen
# Tap "Create Account"
# Should see success message
```

**3. Test Login:**
```bash
# Close and reopen app
# Should auto-login immediately
# Or tap manual "Log In" button
```

**4. Test Logout:**
```bash
# Call signOut()
# Should delete device keypair
# Next login should fail (no keypair)
```

### Debugging

**Check Device Keypair:**
```typescript
import * as deviceAuth from './src/services/deviceAuth';

const keypair = await deviceAuth.getDeviceKeypair();
console.log('Has keypair:', !!keypair);
if (keypair) {
  console.log('Public key:', keypair.publicKey.substring(0, 20) + '...');
}
```

**Test Signature:**
```typescript
const challenge = 'test-' + Date.now();
const signature = await deviceAuth.signChallenge(challenge, keypair.privateKey);
const isValid = deviceAuth.verifySignature(challenge, signature, keypair.publicKey);
console.log('Signature valid:', isValid); // Should be true
```

**Check Secure Storage:**
```typescript
import * as SecureStore from 'expo-secure-store';

const privateKey = await SecureStore.getItemAsync('device_private_key');
console.log('Private key exists:', !!privateKey);
```

---

## Production Deployment

### Frontend (Expo)

**1. Set production environment variable:**
```bash
export EXPO_PUBLIC_USE_DEVICE_AUTH=true
export EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

**2. Build with EAS:**
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

**3. Submit to stores:**
```bash
eas submit --platform ios
eas submit --platform android
```

### Backend (Fastify)

**1. Set environment variables:**
```bash
export NODE_ENV=production
export JWT_SECRET=<strong-random-secret>
export DATABASE_URL=postgresql://user:pass@host:5432/db
export REDIS_URL=redis://host:6379
export CORS_ORIGIN=https://app.yourdomain.com
```

**2. Run database migration:**
```bash
npm run db:migrate
```

**3. Start service:**
```bash
npm run build
npm start
```

### Gradual Rollout

Use the `WEBAUTHN_ROLLOUT_PERCENT` config for gradual rollout:

```typescript
// 10% of users get device auth
export EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT=10

// Check if user is in rollout
const userId = getUserId();
const hash = hashUserId(userId);
const isInRollout = (hash % 100) < CONFIG.WEBAUTHN_ROLLOUT_PERCENT;

if (isInRollout) {
  // Use device auth
} else {
  // Use Supabase auth
}
```

---

## Troubleshooting

### "Platform not supported" Error

**Cause:** Running on web  
**Fix:** Test on iOS/Android device with Expo Go

### "RNG appears broken" Error

**Cause:** Polyfill not imported first  
**Fix:** Check `App.tsx` has `import './src/setup/crypto-polyfill'` as FIRST line

### "Device already registered" Error

**Cause:** Device keypair already exists  
**Fix:** Use `loginWithDevice()` instead of `registerWithDevice()`

### "No device keypair found" Error

**Cause:** Device not registered yet  
**Fix:** Use `registerWithDevice()` first

### Auto-login Not Working

**Causes:**
1. Device keypair deleted (user logged out)
2. Backend challenge endpoint failing
3. Network error

**Debug:**
```typescript
const { canAutoLogin, hasDeviceKeypair } = useAuth();
console.log('Can auto-login:', canAutoLogin());
console.log('Has keypair:', hasDeviceKeypair);
```

### Signature Verification Fails

**Causes:**
1. Wrong public/private key pair
2. Challenge mismatch
3. Signature format incorrect

**Debug:**
```typescript
const isValid = deviceAuth.verifySignature(challenge, signature, publicKey);
console.log('Local verification:', isValid);
// If true locally but fails on backend → backend issue
// If false locally → crypto issue
```

---

## FAQ

**Q: Can users switch devices?**  
A: No. Each device has its own account. This is a fundamental privacy trade-off.

**Q: What happens if user loses their device?**  
A: They lose access to that account. Future versions could add account recovery via backup keys.

**Q: Is this more secure than passwords?**  
A: Yes for most threats (phishing, credential stuffing, password leaks). No for physical device theft.

**Q: Can this work on web?**  
A: No. Web doesn't have hardware-backed secure storage. Use Supabase auth on web.

**Q: How do I disable device auth?**  
A: Set `EXPO_PUBLIC_USE_DEVICE_AUTH=false` and restart.

**Q: Can I run both Supabase and Device Auth?**  
A: Yes! The system supports dual-auth. Use feature flags to control which users see which flow.

---

## Support

For issues or questions:
1. Check [DEVICE_TOKEN_AUTH_INDEX.md](./DEVICE_TOKEN_AUTH_INDEX.md)
2. Read [IMPLEMENTATION_FINDINGS_FINAL.md](./IMPLEMENTATION_FINDINGS_FINAL.md)
3. Review [backend/DEVICE_TOKEN_AUTH_MIGRATION.md](../backend/DEVICE_TOKEN_AUTH_MIGRATION.md)

---

**Last Updated:** October 20, 2025  
**Status:** ✅ Days 1-6 Complete  
**Next:** Day 7 (E2E Testing & Production Deployment)
