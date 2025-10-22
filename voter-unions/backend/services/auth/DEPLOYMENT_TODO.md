# Railway Deployment - URGENT FIXES NEEDED

**Status**: 🔴 DEPLOYMENT STALLED - Backend running OLD code
**Backend**: backend/services/auth
**Target**: https://voterunions-production.up.railway.app
**Branch**: `claude/code-investigation-011CULV8bQvr5aPNNVprVFu9`
**Latest Commit**: `e30400c8` (NOT deployed yet)

---

## 🔴 Current Issues (Fix These First!)

### Issue 1: Railway Not Deploying Latest Code
**Evidence**: Backend still returns CORS header `localhost:5000` instead of `*`

**Your Action**:
1. Go to Railway dashboard: https://railway.app/dashboard
2. Click on your **auth service** project
3. Go to **Settings** → **Source**
4. Verify **Branch** is set to: `claude/code-investigation-011CULV8bQvr5aPNNVprVFu9`
5. Check **Auto-Deploy** is enabled
6. If branch is wrong, update it and click "Deploy"

### Issue 2: Database Connection Failing
**Error**: `password authentication failed for user "postgres"`

**Your Action**:
1. In Railway dashboard, go to your auth service
2. Click **Variables** tab
3. Find `DATABASE_URL` - it should look like:
   ```
   postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
   ```
4. If it doesn't match, update it to use Railway's Postgres service references
5. Click "Deploy" to trigger redeploy

### Issue 3: Manual Redeploy Needed
**Your Action**:
1. After fixing above issues, go to **Deployments** tab
2. Click **"Deploy"** button (top right)
3. Watch the build logs - should see:
   - ✅ `npm ci` (with bcrypt@6.0.0)
   - ✅ `npm run build`
   - ✅ Service starts successfully

---

## Quick Start (5 steps)

### 1. Login to Railway

```bash
cd backend/services/auth
npx @railway/cli login
```

This will open your browser for authentication.

---

### 2. Link to Project

```bash
npx @railway/cli link
```

Select: `voterunions-production` (or your Railway project name)

---

### 3. Set Environment Variables (if not already set)

Generate secrets:
```bash
# Generate JWT secret (copy output)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate refresh secret (copy output)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set variables:
```bash
npx @railway/cli variables set JWT_SECRET=<paste-secret-from-above>
npx @railway/cli variables set REFRESH_SECRET=<paste-secret-from-above>
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set CORS_ORIGIN=*
```

**Note**: Change CORS_ORIGIN to your actual frontend URL in production.

---

### 4. Apply Database Migration

#### Option A: Railway Dashboard (Recommended)

1. Go to https://railway.app/dashboard
2. Select your project → PostgreSQL service
3. Click "Data" tab → "Query"
4. Copy the contents of `migrations/001_add_username_password.sql`
5. Paste and click "Run Query"

#### Option B: Command Line

```bash
# Get DATABASE_URL from Railway
npx @railway/cli variables --json | grep DATABASE_URL

# Apply migration (replace $DATABASE_URL)
psql "$DATABASE_URL" < migrations/001_add_username_password.sql
```

#### Verify Migration

In Railway PostgreSQL console, run:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('username', 'password_hash');
```

Should return 2 rows:
- username
- password_hash

---

### 5. Deploy

#### Option A: Automated Script

```bash
./deploy.sh
```

This script will:
- ✓ Check Railway authentication
- ✓ Build code locally
- ✓ Verify environment variables
- ✓ Deploy to Railway
- ✓ Show next steps

#### Option B: Manual Deploy

```bash
# Build locally first
npm run build

# Deploy
npx @railway/cli up

# Watch logs
npx @railway/cli logs
```

---

## Verification

After deployment, test the endpoints:

### Test Health

```bash
# Should return: { "status": "ok", "timestamp": "..." }
curl https://voterunions-production.up.railway.app/health
```

### Test New Endpoints

#### /auth/set-password

```bash
curl -X POST https://voterunions-production.up.railway.app/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "username": "testuser",
    "password": "TestPass123!",
    "deviceId": "test-device"
  }'
```

Expected: `{ "message": "Password set successfully" }`

#### /auth/login-hybrid

First get a challenge, then test login with valid signature + password.

---

## Troubleshooting

### Issue: 500 Error

```bash
# Check logs for details
npx @railway/cli logs

# Common causes:
# - Missing DATABASE_URL (check: npx @railway/cli variables)
# - Missing JWT_SECRET (check: npx @railway/cli variables)
# - Database connection failed (check PostgreSQL service is running)
```

### Issue: Migration Failed

If you see "column already exists":
- Migration was already applied ✓
- No action needed

### Issue: bcrypt Error

```bash
# Ensure bcrypt is installed
npm install bcrypt @types/bcrypt
npm run build
npx @railway/cli up
```

---

## Post-Deployment

After successful deployment:

1. **Update Frontend** (.env in root directory):
   ```bash
   EXPO_PUBLIC_API_URL=https://voterunions-production.up.railway.app
   EXPO_PUBLIC_USE_HYBRID_AUTH=true
   EXPO_PUBLIC_REQUIRE_USERNAME=true
   ```

2. **Test Registration Flow**:
   - Open app
   - Click "Create Account"
   - Should see username/password fields
   - Should see progress indicators

3. **Test Login Flow**:
   - Enter username/password
   - Should see two-factor authentication
   - Should log in successfully

4. **Monitor Metrics**:
   ```bash
   # View live logs
   npx @railway/cli logs

   # Check deployment status
   npx @railway/cli status
   ```

---

## Rollback (if needed)

```bash
# View deployment history
npx @railway/cli deployments

# Rollback to previous version
npx @railway/cli rollback <deployment-id>
```

---

## Files Created

- ✅ `DEPLOYMENT_GUIDE.md` - Comprehensive deployment documentation
- ✅ `deploy.sh` - Automated deployment script
- ✅ `DEPLOYMENT_TODO.md` - This quick-start checklist

---

## Support

**Detailed Guide**: See `DEPLOYMENT_GUIDE.md` for comprehensive instructions

**Railway Docs**: https://docs.railway.app

**CLI Help**: `npx @railway/cli help`

---

## ✅ Verification After Fixes

Once you've fixed the issues above and Railway shows "Active" deployment, run these tests:

### Test 1: Health Check

```bash
node -e "fetch('https://voterunions-production.up.railway.app/health').then(async r => { console.log('Status:', r.status); console.log('CORS:', r.headers.get('access-control-allow-origin')); console.log('Body:', JSON.stringify(await r.json(), null, 2)); })"
```

**Expected**:
- Status: `200`
- CORS: `*` (wildcard)
- Body: Contains `"status": "healthy"`

**If you still get `localhost:5000`**, Railway hasn't deployed the latest code yet!

### Test 2: Registration Flow

Once backend is healthy:

1. **Clear browser storage** (open browser console at `localhost:8081`):
   ```javascript
   localStorage.clear();
   const dbs = await indexedDB.databases();
   for (const db of dbs) { indexedDB.deleteDatabase(db.name); }
   location.reload();
   ```

2. **Try creating account**:
   - Fill in username and password
   - Click "Create Account"
   - Watch browser console for detailed logs (green checkmarks)
   - Should automatically log you in

3. **Expected logs**:
   ```
   🔐 [DeviceRegister] Step 1: Calling registerWithDevice...
   [registerWithDevice] ✅ Backend response received
   [registerWithDevice] ✅ Session stored successfully
   🔐 [AuthContext] setUser called: { hasUser: true, userId: '...', userEmail: '...' }
   ```

---

## 📋 What Was Fixed in Commit e30400c8

These fixes are ready to deploy (already committed):

1. **Web Crypto Fix** (`src/services/webDeviceAuth.ts:66`)
   - Fixed: `TypeError: p256.utils.randomPrivateKey is not a function`
   - Changed to: Native Web Crypto API `crypto.getRandomValues()`

2. **CORS Configuration** (`backend/services/auth/src/index.ts:46-50`)
   - Now defaults to `origin: '*'` when CORS_ORIGIN not set
   - No environment variable needed for development

3. **Package Lock** (`backend/services/auth/package-lock.json`)
   - Regenerated to sync with package.json (bcrypt@6.0.0)
   - Should fix previous `npm ci` errors

4. **Comprehensive Logging**
   - Added detailed logs throughout registration flow
   - Makes debugging much easier

---

**Current Status**: 🔴 Waiting for Railway fixes

**Next Steps**:
1. Fix Railway branch + DATABASE_URL (see top of this document)
2. Trigger manual redeploy
3. Run verification tests above
