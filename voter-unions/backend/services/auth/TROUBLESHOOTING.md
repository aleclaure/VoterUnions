# Railway Deployment Troubleshooting

**Issue**: Backend returns 500 error after deployment

---

## Step 1: Check Railway Logs

In your terminal, run:

```bash
cd /home/tupac-katari/Documents/VoterUnions/voter-unions/backend/services/auth
npx @railway/cli logs
```

**Look for**:
- ✅ "Auth Service listening on port XXXX" → Good, server started
- ❌ "Error: Missing environment variable" → Missing config
- ❌ "Database connection failed" → Database issue
- ❌ "Cannot find module 'bcrypt'" → Dependency issue
- ❌ Any other error messages

---

## Step 2: Check Environment Variables

```bash
npx @railway/cli variables
```

**Required variables**:
- ✅ `DATABASE_URL` (auto-set by Railway PostgreSQL)
- ✅ `JWT_SECRET` (must be 32+ characters)
- ✅ `REFRESH_SECRET` (must be 32+ characters)
- ✅ `NODE_ENV=production`
- ✅ `PORT` (auto-set by Railway)

**If missing JWT secrets**:

```bash
# Generate and set JWT_SECRET
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npx @railway/cli variables set JWT_SECRET=$JWT_SECRET

# Generate and set REFRESH_SECRET
REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npx @railway/cli variables set REFRESH_SECRET=$REFRESH_SECRET

# Redeploy
npx @railway/cli up
```

---

## Step 3: Verify Database Connection

**Check PostgreSQL service is running**:

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your project
3. Find PostgreSQL service
4. Check status is "Active" (green)

**Test database connection**:

In Railway dashboard → PostgreSQL → Data → Query:

```sql
-- Test connection
SELECT NOW();

-- Check users table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'users';

-- Check if migration was applied
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('username', 'password_hash');
```

**Expected results**:
- First query: Current timestamp
- Second query: 'users' (table exists)
- Third query: 2 rows ('username' and 'password_hash')

**If migration not applied**:

In Railway PostgreSQL Query console, run:

```sql
-- Add username and password columns for hybrid auth
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

---

## Step 4: Check Dependencies

**Verify bcrypt is installed**:

```bash
# Check package.json
cat package.json | grep bcrypt

# Should show:
# "bcrypt": "^5.1.1"
```

**If missing**:

```bash
npm install bcrypt @types/bcrypt --save
npm run build
npx @railway/cli up
```

---

## Step 5: Rebuild and Redeploy

```bash
# Clear dist directory
rm -rf dist/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Build
npm run build

# Verify build succeeded
ls -la dist/

# Redeploy
npx @railway/cli up

# Watch logs
npx @railway/cli logs
```

---

## Step 6: Check Build Logs

In Railway dashboard:
1. Go to project → Auth service
2. Click "Deployments" tab
3. Click latest deployment
4. Check "Build Logs" and "Deploy Logs"

**Look for**:
- ✅ "npm install" completed successfully
- ✅ "npm run build" completed successfully
- ✅ "npm start" started successfully
- ❌ Any TypeScript compilation errors
- ❌ Any dependency installation errors

---

## Common Issues

### Issue: "Cannot find module 'bcrypt'"

**Cause**: bcrypt not in package.json dependencies

**Fix**:
```bash
npm install bcrypt @types/bcrypt --save
git add package.json package-lock.json
git commit -m "Add bcrypt dependency"
git push
# Or redeploy: npx @railway/cli up
```

---

### Issue: "Database connection failed"

**Cause**: DATABASE_URL not set or PostgreSQL service not running

**Fix**:
1. Railway Dashboard → Add PostgreSQL service (if missing)
2. Verify DATABASE_URL is injected: `npx @railway/cli variables | grep DATABASE_URL`
3. Restart service: `npx @railway/cli restart`

---

### Issue: "Error: JWT_SECRET must be at least 32 characters"

**Cause**: JWT_SECRET not set or too short

**Fix**:
```bash
# Generate 32-byte secret (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set variable (copy output from above)
npx @railway/cli variables set JWT_SECRET=<paste-secret>

# Restart
npx @railway/cli restart
```

---

### Issue: Column "username" already exists

**Cause**: Migration already applied (not an error)

**Fix**: No action needed - migration is already applied ✓

---

### Issue: TypeScript compilation errors

**Cause**: Code changes not compatible

**Fix**:
```bash
# Test build locally first
npm run build

# Fix any TypeScript errors
# Then redeploy
npx @railway/cli up
```

---

## Step 7: Manual Health Check

If Railway CLI is problematic, check logs via dashboard:

1. Railway Dashboard → Project → Auth Service
2. Click "Deployments" → Latest deployment
3. Click "View Logs"

**Look for success messages**:
```
✓ Auth Service listening on port 3001
✓ Database connected
```

---

## Step 8: Test Locally First

Before deploying to Railway, test locally:

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with real values:
# - DATABASE_URL (local or Railway PostgreSQL)
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - REFRESH_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start

# Test health endpoint (in another terminal)
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

If local works but Railway doesn't, it's an environment variable issue.

---

## Step 9: Check Railway Service Configuration

In Railway dashboard:
1. Project → Auth Service → Settings
2. Verify:
   - **Root Directory**: `backend/services/auth` (if using monorepo)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: Auto-detected (should be 3001 or $PORT)

---

## Step 10: Enable Debug Logging

Add debug logging to see more details:

```bash
npx @railway/cli variables set LOG_LEVEL=debug
npx @railway/cli restart
npx @railway/cli logs
```

---

## Quick Diagnostic Commands

```bash
# Check deployment status
npx @railway/cli status

# Check environment variables
npx @railway/cli variables

# Check recent logs
npx @railway/cli logs

# Restart service
npx @railway/cli restart

# Check deployment history
npx @railway/cli deployments

# Rollback to previous deployment (if needed)
npx @railway/cli rollback <deployment-id>
```

---

## Get Help

**Share these details**:
1. Railway logs: `npx @railway/cli logs > railway-logs.txt`
2. Environment variables: `npx @railway/cli variables` (redact secrets!)
3. Build logs from Railway dashboard
4. Error message from health endpoint

**Most common fixes**:
1. Set JWT_SECRET and REFRESH_SECRET (90% of issues)
2. Apply database migration (5% of issues)
3. Install bcrypt dependency (3% of issues)
4. Check DATABASE_URL is set (2% of issues)

---

## Success Indicators

When deployment is successful, you should see:

✅ **Logs show**:
```
Auth Service listening on port 3001
Database connected
```

✅ **Health endpoint works**:
```bash
curl https://voterunions-production.up.railway.app/health
# {"status":"ok","timestamp":"2025-10-21T..."}
```

✅ **Railway dashboard shows**:
- Status: Active (green)
- Deployment: Successful
- No errors in logs

✅ **Environment variables set**:
```
DATABASE_URL=postgresql://...
JWT_SECRET=64-character-hex-string
REFRESH_SECRET=64-character-hex-string
NODE_ENV=production
PORT=3001
```

---

**Next Step**: Share the Railway logs output so we can diagnose the specific issue.

Run: `npx @railway/cli logs > railway-logs.txt` and share the contents.
