# Hybrid Auth Deployment Guide

## ✅ Code Changes Complete (Committed Locally)

**Branch**: `claude/code-investigation-011CULV8bQvr5aPNNVprVFu9`

### Files Modified:
1. ✅ `src/utils/password.ts` - Password hashing utilities (ADDED)
2. ✅ `src/routes/device-token.ts` - Added hybrid auth endpoints (PRESERVED all existing token auth)
3. ✅ `package.json` - Added bcrypt dependency

### Endpoints Added:
- `POST /auth/set-password` - Add username/password to existing device user
- `POST /auth/login-hybrid` - Login with both device token + password

---

## 🚀 STEP 1: Push Changes to GitHub

**Run this in your terminal:**

```bash
cd /home/tupac-katari/Documents/VoterUnions/backend/services/auth
git push origin claude/code-investigation-011CULV8bQvr5aPNNVprVFu9
```

Once pushed, Railway will automatically detect and deploy.

---

## 🗄️ STEP 2: Database Migration

**Run this SQL in Railway PostgreSQL console:**

```sql
-- Add username and password_hash columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

**How to access Railway PostgreSQL console:**
1. Go to Railway dashboard: https://railway.app
2. Select your auth service project
3. Click "Data" tab
4. Click "Query" 
   OR
5. Use Railway CLI: `railway connect postgres`

---

## 🔧 STEP 3: Environment Variables

**Check these are set in Railway dashboard (Variables tab):**

```bash
# Server
PORT=3001
NODE_ENV=production

# Database (Railway auto-provides this from Supabase)
DATABASE_URL=postgresql://postgres.sonyiatltmqdyoezfbnj:PJcDmT4zfr9LRN1Q@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Redis (if you have Redis service in Railway)
REDIS_URL=redis://...

# JWT Secrets (MUST be secure random strings)
JWT_SECRET=78d203951792fdb35a1d2c3cae953a317cc2a7f3973bacc4181ccb3d52161510a8a615f9c8980ca808378b53e3615e50954efe2db4613f93d7afe3e38b115fbb
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# WebAuthn/RP Configuration (CRITICAL for production)
RP_NAME=United Unions
RP_ID=voterunions-production.up.railway.app
RP_ORIGIN=https://voterunions-production.up.railway.app

# CORS (your frontend URL)
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=15m
```

### ⚠️ Variables You May Need to Add/Update:

None of these are NEW for hybrid auth - they're all already required by your existing token auth system. But verify they're set correctly:

1. **RP_ID** - Your Railway domain (no https://)
   - Example: `voterunions-production.up.railway.app`
   - Find it in Railway dashboard under "Domains"

2. **RP_ORIGIN** - Full URL with https://
   - Example: `https://voterunions-production.up.railway.app`

3. **CORS_ORIGIN** - Your frontend URL (or `*` for testing)
   - Production: `https://your-frontend.com`
   - Testing: `*` (allows all)

---

## 📦 STEP 4: Verify Deployment

After Railway deploys (triggered by git push):

### Check Logs:

```bash
railway logs
```

**Look for:**
- ✅ "Server listening on port 3001"
- ✅ "Database connected"
- ✅ No "bcrypt" errors
- ✅ No TypeScript compilation errors
- ✅ No "EC is not a constructor" errors (this was the old elliptic bug)

### Expected Build Output:

```
Building...
Installing dependencies...
- @fastify/cors@10.0.1
- @fastify/rate-limit@10.1.1
- @noble/curves@1.4.2
- bcrypt@5.1.1  ← Should see this!
...
Running: npm run build
Compilation successful
Starting: npm start
Server listening on port 3001
```

---

## 🧪 STEP 5: Test Endpoints

### Test 1: Verify existing device token auth still works

```bash
# Get challenge (existing endpoint - should still work)
curl -X POST https://voterunions-production.up.railway.app/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"04abc123..."}'

# Expected: {"challenge": "random-string..."}
```

If this fails, **ROLLBACK IMMEDIATELY** - existing auth is broken.

### Test 2: Set password for existing user (new endpoint)

```bash
curl -X POST https://voterunions-production.up.railway.app/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_EXISTING_USER_ID",
    "username": "testuser",
    "password": "TestPass123!",
    "deviceId": "YOUR_DEVICE_ID"
  }'
```

**Expected success:**
```json
{"message":"Password set successfully","username":"testuser"}
```

**Possible errors:**
- `400` - Password doesn't meet requirements (need 8+ chars, upper, lower, number, special)
- `400` - Username invalid (need 3-30 chars, alphanumeric + underscore/hyphen)
- `409` - Username already taken
- `500` - Database error (check migration ran)

### Test 3: Hybrid login (new endpoint)

First, get a challenge for your device:
```bash
curl -X POST https://voterunions-production.up.railway.app/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"YOUR_PUBLIC_KEY"}'
```

Then, sign the challenge on your device and login:
```bash
curl -X POST https://voterunions-production.up.railway.app/auth/login-hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!",
    "publicKey": "YOUR_PUBLIC_KEY",
    "challenge": "CHALLENGE_FROM_ABOVE",
    "signature": "YOUR_SIGNATURE",
    "deviceId": "YOUR_DEVICE_ID"
  }'
```

**Expected success:**
```json
{
  "user": {
    "id": "...",
    "username": "testuser",
    "deviceId": "..."
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## 🚨 Troubleshooting

### Problem: Railway build fails with "bcrypt not found"

**Solution:**
```bash
# Verify package.json was committed:
git show HEAD:package.json | grep bcrypt

# Should show: "bcrypt": "^5.1.1"
# If not, you need to commit and push package.json again
```

### Problem: "EC is not a constructor" error

**Cause:** Old code using deprecated `elliptic` library is being deployed

**Solution:**
```bash
# Verify you're on the right branch:
git branch --show-current
# Should show: claude/code-investigation-011CULV8bQvr5aPNNVprVFu9

# Verify device-token.ts uses @noble/curves:
grep -n "@noble/curves" src/routes/device-token.ts
# Should see imports from @noble/curves, NOT from 'elliptic'
```

### Problem: Database error "column username does not exist"

**Cause:** Migration not applied

**Solution:** Run the SQL migration from Step 2 in Railway PostgreSQL console

### Problem: Existing device token auth broken

**Immediate action:** Rollback deployment in Railway dashboard

**Debug:**
1. Check device-token.ts lines 110-406 (existing endpoints) weren't modified
2. Compare with previous deployment
3. Contact support if issue persists

---

## ⚠️ Critical Safety Notes

### What Changed:
- ✅ Added password.ts utility file
- ✅ Added 2 new endpoints at END of device-token.ts
- ✅ Added bcrypt to dependencies
- ✅ Added 2 database columns (username, password_hash)

### What Did NOT Change:
- ❌ Existing device token registration (POST /auth/register-device)
- ❌ Existing challenge endpoint (POST /auth/challenge)
- ❌ Existing verify endpoint (POST /auth/verify-device)
- ❌ JWT token generation logic
- ❌ Database schema for existing tables
- ❌ Any existing user authentication flows

### Backwards Compatibility:
- ✅ All existing users can still login with device tokens
- ✅ No breaking API changes
- ✅ Hybrid auth is optional - users must call /auth/set-password to enable it
- ✅ Device-only auth continues to work as before

---

## 📊 Rollback Plan

If anything goes wrong:

### Immediate Rollback:
1. Go to Railway dashboard
2. Click "Deployments" tab
3. Find previous working deployment
4. Click "Redeploy"
5. Verify existing token auth works

### Database Rollback (if needed):
```sql
-- Remove columns if they cause issues:
ALTER TABLE users
DROP COLUMN IF EXISTS username,
DROP COLUMN IF EXISTS password_hash;

DROP INDEX IF EXISTS idx_users_username;
```

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ Railway logs show "Server listening on port 3001"
2. ✅ No bcrypt errors in logs
3. ✅ Existing device token auth works (test /auth/challenge)
4. ✅ New /auth/set-password endpoint returns 200
5. ✅ Database has username and password_hash columns
6. ✅ Can set password for a user
7. ✅ Can login with hybrid auth (device + password)

---

## 📝 Summary

**To deploy hybrid auth:**

```bash
# 1. Push code
cd /home/tupac-katari/Documents/VoterUnions/backend/services/auth
git push origin claude/code-investigation-011CULV8bQvr5aPNNVprVFu9

# 2. Apply migration in Railway PostgreSQL console
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE, ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

# 3. Verify environment variables in Railway dashboard
# (No new variables needed - bcrypt uses existing config)

# 4. Check deployment logs
railway logs

# 5. Test endpoints
curl https://voterunions-production.up.railway.app/auth/challenge -X POST -H "Content-Type: application/json" -d '{"publicKey":"..."}'
```

**That's it!** 🚀

Existing token auth is preserved. Hybrid auth is additive.
