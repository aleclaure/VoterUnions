# Quick Reference: Device Token Authentication

**Fast lookup for common authentication tasks**

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend Platform Router                                │
│  src/services/platformDeviceAuth.ts                      │
│                                                           │
│  if (Platform.OS === 'web')                              │
│    → webDeviceAuth.ts (@noble/curves)                    │
│  else                                                     │
│    → deviceAuth.ts (elliptic)                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Backend (Unified)                                        │
│  backend/services/auth/                                   │
│                                                           │
│  POST /auth/challenge                                     │
│  POST /auth/register-device                               │
│  POST /auth/verify-device                                 │
│  POST /auth/refresh                                       │
│                                                           │
│  Platform-aware signature verification:                   │
│  - Strategy 1: Compact + SHA-256 hash                     │
│  - Strategy 2: DER + SHA-256 hash                         │
│  - Strategy 3: Raw message (fallback)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 File Locations

### Frontend

| File | Purpose | Platform |
|------|---------|----------|
| `src/services/platformDeviceAuth.ts` | Platform router | Both |
| `src/services/webDeviceAuth.ts` | Web crypto | Web only |
| `src/services/deviceAuth.ts` | Native crypto | iOS/Android |
| `src/screens/AuthScreen.tsx` | Authentication UI | Both |
| `src/hooks/useAuth.ts` | Auth hook | Both |

### Backend

| File | Purpose |
|------|---------|
| `backend/services/auth/src/index.ts` | Main server |
| `backend/services/auth/src/routes/auth.ts` | Auth endpoints |
| `backend/services/auth/src/crypto.ts` | Signature verification |
| `backend/services/auth/src/db.ts` | Database schema |
| `backend/services/auth/src/tokens.ts` | JWT generation |

### Fixes & Diagnostics

| File | Purpose |
|------|---------|
| `src/services/__tests__/cryptoCompatibilityTest.ts` | Compatibility test |
| `src/services/FIXES/FIX_OPTION_1_*.ts` | Manual hashing fix |
| `backend/services/auth/FIXES/FIX_OPTION_2_*.ts` | Backend dual verification |
| `src/services/FIXES/FIX_OPTION_3_*.ts` | Shared crypto utils |
| `backend/services/auth/src/routes/diagnostic.ts` | Test endpoints |

### Documentation

| File | Purpose |
|------|---------|
| `SIGNATURE_COMPATIBILITY_GUIDE.md` | Complete guide |
| `IMPLEMENTATION_VERIFICATION.md` | Verification report |
| `PLATFORM_SEPARATION_COMPLIANCE.md` | Compliance doc |
| `backend/services/auth/EXPECTED_ERRORS.md` | Expected errors |
| `backend/services/auth/README.md` | Deployment guide |

---

## 🚀 Common Tasks

### Test Web Authentication Locally

```bash
# 1. Start backend
cd backend/services/auth
npm run dev

# 2. Start frontend
cd ../../..
npx expo start --web

# 3. Open browser
http://localhost:8081

# 4. Click "Register This Device"
# 5. Check backend logs for verification
```

### Test Native Authentication

```bash
# 1. Start backend
cd backend/services/auth
npm run dev

# 2. Start Metro bundler
cd ../../..
npx expo start

# 3. Run on iOS simulator
Press 'i' in terminal

# 4. Click "Register This Device"
# 5. Check backend logs for verification
```

### Run Compatibility Test

```typescript
// Add to your test file
import { runAllCompatibilityTests } from './src/services/__tests__/cryptoCompatibilityTest';

const results = runAllCompatibilityTests();
console.log('Compatible:', results.compatible);
```

### Use Diagnostic Endpoints

```bash
# Get crypto info
curl http://localhost:3001/diagnostic/crypto-info

# Test signature
curl -X POST http://localhost:3001/diagnostic/test-signature \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test",
    "signature": "...",
    "publicKey": "...",
    "platform": "web"
  }'

# Test hashing
curl -X POST http://localhost:3001/diagnostic/hash-message \
  -H "Content-Type: application/json" \
  -d '{"message": "test-challenge"}'
```

### Deploy to Railway

```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
cd backend/services/auth
railway init

# Add database
railway add --plugin postgresql

# Set environment variables
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
railway variables set REFRESH_SECRET="$(openssl rand -hex 32)"
railway variables set CORS_ORIGIN="http://localhost:8081"

# Deploy
railway up

# Check logs
railway logs
```

---

## 🔍 Troubleshooting

### Web Authentication Fails

**Symptom:** "Invalid signature" error for web

**Check:**
1. ✅ Web imports from platformDeviceAuth
2. ✅ webDeviceAuth uses @noble/curves/nist.js
3. ✅ No Buffer usage in web code
4. ✅ Backend verifies with SHA-256 hash

**Fix:** Verify imports and hex conversion functions

### Native Authentication Fails

**Symptom:** "Invalid signature" error for native

**Check:**
1. ✅ Backend logs show which strategy attempted
2. ✅ Run cryptoCompatibilityTest
3. ✅ Check if elliptic hashes internally

**Fix:** Apply Fix Option 1 (manual hashing)

**Backend Logs:**
```
[Platform: ios] Compact format verification failed
[Platform: ios] DER format verification failed
[Platform: ios] Raw message verification failed
[Platform: ios] All strategies failed
```

### Database Connection Fails

**Symptom:** "Database initialization failed"

**Check:**
1. ✅ PostgreSQL running
2. ✅ DATABASE_URL correct in .env
3. ✅ Can connect with psql

**Fix:**
```bash
# Check PostgreSQL
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Restart PostgreSQL
brew services restart postgresql
```

### CORS Errors

**Symptom:** Browser blocks requests

**Check:**
1. ✅ CORS_ORIGIN in .env
2. ✅ Backend server running
3. ✅ Frontend URL matches CORS_ORIGIN

**Fix:**
```env
# .env
CORS_ORIGIN=http://localhost:8081
```

---

## 📊 Quick Diagnosis

### Is it working?

```bash
# Test web
curl -X POST http://localhost:3001/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","platform":"web"}'

# Should return:
{
  "challenge": "abcd1234...",
  "expiresAt": "2025-10-22T..."
}
```

### Which fix do I need?

| Question | Answer | Fix Needed |
|----------|--------|------------|
| Just starting? | Yes | Fix Option 3 |
| Web works, native fails? | Yes | Fix Option 1 |
| Can't update app? | Yes | Fix Option 2 |
| Everything works? | Yes | None! |

### What should logs show?

**Good (Web):**
```
[Platform: web] Signature verified with compact format
[Platform: web] Device authenticated
```

**Good (Native):**
```
[Platform: ios] Signature verified with DER format
[Platform: ios] Device authenticated
```

**Bad:**
```
[Platform: ios] All verification strategies failed
ERROR: 401 Invalid signature
```

---

## 🎯 Key Concepts

### Platform Separation

- **Web**: @noble/curves (browser-compatible)
- **Native**: elliptic (React Native compatible)
- **Router**: platformDeviceAuth.ts (auto-detects)
- **Backend**: Accepts both (platform-aware)

### Signature Formats

- **Web**: Compact (64 bytes hex)
- **Native**: DER (variable length, starts with 0x30)
- **Backend**: Auto-converts DER → Compact

### Hashing

- **Web**: Manually hashes with SHA-256 FIRST
- **Native**: May or may not hash internally
- **Backend**: Expects SHA-256 hashed message

### Authentication Flow

1. Client requests challenge
2. Server generates random challenge
3. Client signs sha256(challenge)
4. Client sends signature + public key
5. Server verifies signature
6. Server returns JWT tokens

---

## 📞 Quick Links

- [Full Compatibility Guide](./SIGNATURE_COMPATIBILITY_GUIDE.md)
- [Implementation Verification](./IMPLEMENTATION_VERIFICATION.md)
- [Platform Compliance](./backend/services/auth/PLATFORM_SEPARATION_COMPLIANCE.md)
- [Expected Errors](./backend/services/auth/EXPECTED_ERRORS.md)
- [Deployment Guide](./backend/services/auth/README.md)

---

**Last Updated:** October 22, 2025
