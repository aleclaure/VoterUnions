# Railway Deployment Guide - Hybrid Auth Backend

**Date**: October 21, 2025
**Purpose**: Deploy Phase 6 hybrid authentication backend to Railway

---

## Current Status

- **Railway URL**: https://voterunions-production.up.railway.app
- **Current Deployment**: Experiencing 500 error (needs update)
- **New Features**: `/auth/set-password` and `/auth/login-hybrid` endpoints
- **Database Migration**: `migrations/001_add_username_password.sql` ready to apply

---

## Prerequisites

1. Railway account with access to `voterunions-production` project
2. Railway CLI installed (`npm install -g @railway/cli` or use `npx @railway/cli`)
3. PostgreSQL database provisioned on Railway
4. Environment variables configured

---

## Step 1: Login to Railway

```bash
# Login to Railway (opens browser)
npx @railway/cli login

# Link to existing project
cd backend/services/auth
npx @railway/cli link
# Select: voterunions-production
```

---

## Step 2: Verify Current Environment Variables

Check that these environment variables are set on Railway:

### Required Variables

```bash
# Check current variables
npx @railway/cli variables

# Required variables:
# - DATABASE_URL (auto-provisioned by Railway PostgreSQL)
# - JWT_SECRET (must be 32+ characters)
# - REFRESH_SECRET (must be 32+ characters)
# - NODE_ENV=production
# - PORT (auto-provisioned by Railway)
# - CORS_ORIGIN (frontend URL)
```

### Set Missing Variables

```bash
# Set JWT secrets (CHANGE THESE IN PRODUCTION!)
npx @railway/cli variables set JWT_SECRET=<your-secure-32-char-secret>
npx @railway/cli variables set REFRESH_SECRET=<your-secure-32-char-refresh-secret>

# Set CORS origin
npx @railway/cli variables set CORS_ORIGIN=<your-frontend-url>

# Set Node environment
npx @railway/cli variables set NODE_ENV=production
```

**Security Note**: Generate strong secrets using:
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate refresh secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Apply Database Migration

The migration adds `username` and `password_hash` columns to the `users` table.

### Option A: Via Railway Dashboard

1. Go to Railway dashboard → your project → PostgreSQL service
2. Click "Data" tab
3. Click "Query" button
4. Copy contents of `migrations/001_add_username_password.sql`
5. Paste and execute

### Option B: Via Railway CLI

```bash
# Get database connection string
npx @railway/cli variables --json | grep DATABASE_URL

# Apply migration using psql
# (Replace $DATABASE_URL with actual URL from above)
psql $DATABASE_URL < migrations/001_add_username_password.sql
```

### Option C: Via Local psql

```bash
# Get DATABASE_URL from Railway dashboard
# Then run:
psql "postgresql://user:pass@host:port/dbname" < migrations/001_add_username_password.sql
```

### Verification

After applying migration, verify columns were added:

```sql
-- Run this query in Railway's PostgreSQL console
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Should show:
-- username      | text | YES
-- password_hash | text | YES
```

---

## Step 4: Build and Deploy

### Verify Code is Ready

```bash
# Ensure you're in backend/services/auth directory
cd backend/services/auth

# Install dependencies
npm install

# Build locally to verify no errors
npm run build

# Check dist directory was created
ls -la dist/
```

### Deploy to Railway

```bash
# Deploy current code
npx @railway/cli up

# Monitor deployment
npx @railway/cli logs
```

Railway will:
1. Install dependencies (`npm install`)
2. Build TypeScript (`npm run build`)
3. Start server (`npm start`)

### Expected Output

```
✓ Build completed
✓ Deployment live
✓ Auth Service listening on $PORT
```

---

## Step 5: Verify Deployment

### Test Health Endpoint

```bash
# Using curl
curl https://voterunions-production.up.railway.app/health

# Expected response:
# { "status": "ok", "timestamp": "..." }
```

### Test Existing Endpoints

```bash
# Test challenge endpoint (should work)
curl -X POST https://voterunions-production.up.railway.app/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-123",
    "platform": "ios"
  }'

# Expected response:
# { "challenge": "..." }
```

### Test New Hybrid Auth Endpoints

#### Test /auth/set-password

```bash
curl -X POST https://voterunions-production.up.railway.app/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<existing-user-id>",
    "username": "testuser",
    "password": "SecurePass123!",
    "deviceId": "<device-id>"
  }'

# Expected response (success):
# { "message": "Password set successfully" }

# Expected response (duplicate username):
# { "error": "Username already taken" }
```

#### Test /auth/login-hybrid

```bash
# First, register a device and set password (as above)
# Then test login:

curl -X POST https://voterunions-production.up.railway.app/auth/login-hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!",
    "publicKey": "<user-public-key>",
    "challenge": "<challenge-from-challenge-endpoint>",
    "signature": "<signed-challenge>",
    "deviceId": "<device-id>",
    "platform": "ios"
  }'

# Expected response (success):
# {
#   "user": { "id": "...", "username": "testuser", ... },
#   "accessToken": "...",
#   "refreshToken": "..."
# }

# Expected response (invalid password):
# { "error": "Invalid credentials" }

# Expected response (invalid signature):
# { "error": "Invalid signature" }
```

---

## Step 6: Monitor Deployment

### Check Logs

```bash
# View live logs
npx @railway/cli logs

# Look for:
# ✓ "Auth Service listening on port XXXX"
# ✓ "Database connected"
# ✓ No errors or warnings
```

### Check Metrics

```bash
# View deployment metrics
npx @railway/cli status

# Should show:
# - Deployment status: running
# - Health checks: passing
# - Memory usage: < 512MB
# - CPU usage: < 50%
```

---

## Troubleshooting

### Issue: 500 Internal Server Error

**Causes**:
- Missing DATABASE_URL
- Missing JWT_SECRET or REFRESH_SECRET
- Database connection failed
- Migration not applied

**Solutions**:
```bash
# Check logs for error details
npx @railway/cli logs

# Verify environment variables
npx @railway/cli variables

# Restart service
npx @railway/cli restart
```

### Issue: Database Connection Failed

**Causes**:
- DATABASE_URL not set
- PostgreSQL service not provisioned
- Network connectivity issues

**Solutions**:
1. Go to Railway dashboard → Add PostgreSQL service
2. Verify DATABASE_URL is automatically injected
3. Check database is running (Railway dashboard)

### Issue: Migration Already Applied

If you see `column "username" already exists`:

```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('username', 'password_hash');

-- If columns exist, migration is already applied ✓
```

### Issue: bcrypt Dependency Missing

If you see `Cannot find module 'bcrypt'`:

```bash
# Ensure bcrypt is in package.json dependencies
npm install bcrypt @types/bcrypt --save

# Redeploy
npx @railway/cli up
```

### Issue: CORS Errors from Frontend

If frontend gets CORS errors:

```bash
# Set CORS_ORIGIN to your frontend URL
npx @railway/cli variables set CORS_ORIGIN=https://your-frontend-url.com

# Or allow all origins (development only)
npx @railway/cli variables set CORS_ORIGIN=*
```

---

## Step 7: Update Frontend Configuration

Once backend is deployed and verified, update frontend .env:

```bash
# In voter-unions/.env
EXPO_PUBLIC_API_URL=https://voterunions-production.up.railway.app
EXPO_PUBLIC_USE_NEW_BACKEND=true
EXPO_PUBLIC_USE_HYBRID_AUTH=true
EXPO_PUBLIC_REQUIRE_USERNAME=true
```

---

## Rollback Plan

If deployment causes issues:

### Quick Rollback (Railway Dashboard)

1. Go to Railway dashboard → Deployments
2. Find previous working deployment
3. Click "Redeploy"

### CLI Rollback

```bash
# View deployment history
npx @railway/cli deployments

# Rollback to previous deployment
npx @railway/cli rollback <deployment-id>
```

### Emergency Rollback (Database)

If migration caused issues:

```sql
-- CAUTION: This will delete username/password data
ALTER TABLE users DROP COLUMN IF EXISTS username;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
```

**Note**: This is destructive and should only be used in emergency.

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Health endpoint returns 200 OK
- [ ] /auth/challenge endpoint works
- [ ] /auth/register-device endpoint works
- [ ] /auth/set-password endpoint works (new)
- [ ] /auth/login-hybrid endpoint works (new)
- [ ] Logs show no errors
- [ ] Memory usage < 512MB
- [ ] CPU usage < 50%
- [ ] Frontend can connect to backend
- [ ] Registration flow works end-to-end
- [ ] Login flow works end-to-end
- [ ] Database migration applied
- [ ] Environment variables configured

---

## Monitoring Queries

### Check Hybrid Auth Adoption

```sql
SELECT
  COUNT(*) as total_users,
  COUNT(username) as users_with_username,
  COUNT(password_hash) as users_with_password,
  ROUND(100.0 * COUNT(username) / COUNT(*), 2) as adoption_percentage
FROM users;
```

### Check Recent Registrations

```sql
SELECT
  username,
  created_at,
  platform,
  CASE WHEN password_hash IS NOT NULL THEN 'Hybrid' ELSE 'Device-Only' END as auth_type
FROM users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check Failed Login Attempts

```sql
-- If you have audit_logs table
SELECT
  username,
  action_type,
  created_at,
  metadata
FROM audit_logs
WHERE action_type = 'login_failed'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Support

**Documentation**:
- Backend README: `backend/services/auth/README.md`
- Hybrid Auth Guide: `HYBRID_AUTH_ROLLOUT_COMPLETE.md`
- Verification Report: `PHASE_6_VERIFICATION.md`

**Code Locations**:
- New endpoints: `src/routes/auth.ts` (lines 150-350)
- Password utils: `src/utils/password.ts`
- Database schema: `src/db.ts`
- Migration: `migrations/001_add_username_password.sql`

**Railway Resources**:
- Dashboard: https://railway.app/dashboard
- Docs: https://docs.railway.app
- CLI Docs: https://docs.railway.app/develop/cli

---

## Success Criteria

Deployment is successful when:

✅ All health checks passing
✅ All existing endpoints working
✅ New hybrid auth endpoints working
✅ Database migration applied
✅ No errors in logs
✅ Frontend can connect
✅ Registration flow works
✅ Login flow works
✅ Two-factor authentication active

---

**Deployment Ready**: ✅ YES
**Next Step**: Run `npx @railway/cli login` to begin deployment
