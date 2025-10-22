# Railway Deployment - Quick Start Checklist

**Status**: Ready to deploy
**Backend**: backend/services/auth
**Target**: https://voterunions-production.up.railway.app

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

**Ready to Deploy**: ✅ YES

**Next Command**: `npx @railway/cli login`
