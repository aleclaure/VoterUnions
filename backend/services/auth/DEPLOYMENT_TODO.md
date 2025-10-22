# Deployment & Setup TODO

**Last Updated:** 2025-10-21
**Project:** Voter Unions - Device Token Authentication
**Backend Service:** Auth Service (Fastify + PostgreSQL + Redis)

---

## ✅ Completed Tasks

- [x] Create Supabase PostgreSQL database
- [x] Run database schema (users, device_credentials, sessions, webauthn_credentials tables)
- [x] Configure local `.env` file with Supabase connection
- [x] Generate JWT secret
- [x] Update backend CORS to allow localhost:8080 (web app)
- [x] Fix elliptic library import for ECDSA P-256
- [x] Create web authentication support (IndexedDB + AES-GCM encryption)
- [x] Remove platform restrictions for web
- [x] Backend server running locally on port 3001
- [x] Create Railway configuration files (railway.json, nixpacks.toml)
- [x] Configure Railway environment variables
- [x] Deploy backend to Railway successfully

---

## 🚧 In Progress / Pending Tasks

### 1. Get Railway Backend URL

**Status:** IN PROGRESS
**Priority:** HIGH

#### Step-by-step:

1. **Add Environment Variables in Railway:**
   - Go to Railway project → Variables tab
   - Add these variables:

   ```env
   DATABASE_URL=postgresql://postgres.sonyiatltmqdyoezfbnj:PJcDmT4zfr9LRN1Q@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   JWT_SECRET=78d203951792fdb35a1d2c3cae953a317cc2a7f3973bacc4181ccb3d52161510a8a615f9c8980ca808378b53e3615e50954efe2db4613f93d7afe3e38b115fbb
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=*
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=30d
   RATE_LIMIT_MAX=10
   RATE_LIMIT_WINDOW=15 minutes
   ```

2. **Get Supabase Connection Pooling URL:**
   - Go to: https://supabase.com/dashboard/project/sonyiatltmqdyoezfbnj/settings/database
   - Click **"Connection string"** → **"Transaction pooler"** tab
   - Copy the URI (should end with `:6543/postgres`)
   - Use this for `DATABASE_URL` in Railway (NOT the direct connection port 5432!)

3. **Deploy to Railway:**
   - Push code to GitHub (if connected)
   - Or use Railway CLI: `railway up`
   - Railway will automatically build and deploy

4. **Verify Deployment:**
   - Check Railway logs for successful startup
   - Test health endpoint: `https://your-railway-url.railway.app/health`

---

### 2. Redis Setup

**Status:** NOT CONFIGURED
**Priority:** HIGH (Required for device login flow)

#### Local Development:

**Option A: Install Redis locally**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return PONG
```

**Option B: Use Docker**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Current Issue:**
- Backend is trying to connect to `redis://localhost:6379`
- Connection refused (Redis not running)
- Registration works without Redis, but login (challenge-response) requires it

#### Railway Production:

**Add Redis to Railway:**
1. In Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will provision Redis and add `REDIS_URL` env variable automatically
4. Backend will auto-connect to Railway Redis

---

### 3. Frontend Configuration Update

**Status:** PENDING
**Priority:** HIGH

**Issue:** Frontend has mismatched Supabase project IDs

**Current state:**
- Frontend Supabase URL: `yznjhfaeplbwozbhhull.supabase.co`
- Backend Database: `sonyiatltmqdyoezfbnj.supabase.co`

**Action Required:**
1. Decide which Supabase project to use (probably `sonyiatltmqdyoezfbnj`)
2. Update frontend config:
   ```bash
   # File: /home/tupac-katari/Documents/VoterUnions/voter-unions/src/services/supabase.ts
   # Change supabaseUrl to match backend database
   ```

3. Update frontend API URL after Railway deployment:
   ```bash
   # File: /home/tupac-katari/Documents/VoterUnions/voter-unions/src/config.ts
   # Change API_URL from http://localhost:3001 to Railway URL
   ```

---

### 4. Browser Storage Cleanup & Testing

**Status:** PENDING
**Priority:** MEDIUM

**Issue:**
- Old encrypted data may be cached in IndexedDB
- Need to clear and test fresh registration

**Steps:**
1. Open http://localhost:8081 in browser
2. Open Developer Console (F12)
3. Run these commands:
   ```javascript
   indexedDB.deleteDatabase('voter_unions_secure_store');
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
4. Click **"Create Account"** button
5. Monitor console logs and network requests
6. Verify registration succeeds and user is logged in

**Expected Flow:**
1. Device generates ECDSA P-256 keypair
2. Public key sent to backend `/auth/register-device`
3. Backend creates user and returns JWT tokens
4. Frontend stores keypair + session in encrypted IndexedDB
5. User automatically logged in

---

### 5. CORS Configuration (After Railway Deployment)

**Status:** PENDING
**Priority:** MEDIUM

**Current:** CORS allows `*` (all origins)

**Production:** Restrict to specific domains
```env
CORS_ORIGIN=https://voterunions.app,https://www.voterunions.app,https://your-frontend-domain.vercel.app
```

Update this in Railway environment variables after frontend is deployed.

---

### 6. Rate Limiting Review

**Status:** CONFIGURED
**Priority:** LOW

**Current settings:**
- Max: 10 requests per IP
- Window: 15 minutes

**Consider adjusting for production:**
- Might be too strict for registration/login flows
- Could increase to 20-30 requests per 15 minutes

---

## 🔍 Testing Checklist

### Local Testing (Before Railway)

- [ ] Redis running locally
- [ ] Backend starts without errors
- [ ] Can access http://localhost:3001/health
- [ ] Clear browser storage
- [ ] Registration flow works (POST /auth/register-device)
- [ ] Device keypair stored in IndexedDB (encrypted)
- [ ] Login flow works (POST /auth/challenge, POST /auth/verify-device)
- [ ] JWT tokens returned and stored
- [ ] User stays logged in after page refresh

### Railway Testing (After Deployment)

- [ ] Railway deployment succeeds
- [ ] Health check returns 200 OK
- [ ] Database tables accessible from Railway
- [ ] Redis connection works in Railway
- [ ] Update frontend API_URL to Railway URL
- [ ] Test registration from deployed frontend
- [ ] Test login from deployed frontend
- [ ] Verify CORS works from frontend domain

---

## 📝 Important URLs & Credentials

### Supabase (Database)
- **Dashboard:** https://supabase.com/dashboard/project/sonyiatltmqdyoezfbnj
- **Database Settings:** https://supabase.com/dashboard/project/sonyiatltmqdyoezfbnj/settings/database
- **SQL Editor:** https://supabase.com/dashboard/project/sonyiatltmqdyoezfbnj/sql/new
- **Password:** `PJcDmT4zfr9LRN1Q`
- **Direct Connection (local):** Port 5432
- **Transaction Pooler (Railway):** Port 6543

### Backend (Local)
- **Server:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Register Device:** http://localhost:3001/auth/register-device
- **Challenge:** http://localhost:3001/auth/challenge
- **Verify Device:** http://localhost:3001/auth/verify-device

### Frontend (Local)
- **Web App:** http://localhost:8081
- **Metro Bundler:** http://localhost:8081

### JWT Secret (Production)
```
78d203951792fdb35a1d2c3cae953a317cc2a7f3973bacc4181ccb3d52161510a8a615f9c8980ca808378b53e3615e50954efe2db4613f93d7afe3e38b115fbb
```
*(Already configured in both local .env and ready for Railway)*

---

## 🐛 Known Issues

### Issue 1: Redis Connection Refused (Local)
**Error:** `connect ECONNREFUSED 127.0.0.1:6379`
**Impact:** Login flow (challenge-response) won't work
**Solution:** Install and start Redis (see "Redis Setup" section above)

### Issue 2: Mismatched Supabase Projects
**Issue:** Frontend and backend using different Supabase projects
**Impact:** Could cause confusion, unnecessary costs
**Solution:** Consolidate to single project (sonyiatltmqdyoezfbnj)

### Issue 3: Old Encrypted Data in Browser
**Issue:** Previous device keypairs may cause "Already registered" errors
**Impact:** Testing registration fails
**Solution:** Clear IndexedDB before testing (see "Browser Storage Cleanup" above)

---

## 🎯 Next Immediate Steps

1. **Fix Redis locally:**
   ```bash
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Test registration locally:**
   - Clear browser storage
   - Click "Create Account"
   - Verify success

3. **Deploy to Railway:**
   - Add environment variables
   - Deploy backend
   - Add Redis database

4. **Update frontend with Railway URL:**
   ```typescript
   // config.ts
   API_URL: 'https://your-railway-url.railway.app'
   ```

5. **Test end-to-end with Railway backend**

---

## 📚 Architecture Reference

### Device Token Authentication Flow

**Registration:**
```
1. User clicks "Create Account"
2. Frontend generates ECDSA P-256 keypair
3. Frontend sends publicKey + deviceInfo to backend
4. Backend creates user in PostgreSQL
5. Backend returns JWT access/refresh tokens
6. Frontend stores privateKey + publicKey in encrypted IndexedDB
7. Frontend stores session (user + tokens)
8. User is logged in
```

**Login (Challenge-Response):**
```
1. User opens app (has stored keypair)
2. Frontend sends publicKey to backend
3. Backend generates random challenge (stored in Redis with 5min TTL)
4. Backend returns challenge
5. Frontend signs challenge with privateKey
6. Frontend sends signature to backend
7. Backend verifies signature with publicKey
8. Backend deletes challenge from Redis (one-time use)
9. Backend returns new JWT tokens
10. User is logged in
```

### Security Features
- **NIST P-256** elliptic curve cryptography
- **Hardware-backed storage** (iOS Keychain, Android Keystore, Web Crypto API)
- **AES-GCM 256-bit encryption** for web (IndexedDB)
- **Deterministic ECDSA signatures** (RFC 6979)
- **Challenge expires in 5 minutes** (prevents replay attacks)
- **One-time challenge use** (deleted after verification)
- **JWT with refresh tokens** (access: 15min, refresh: 30 days)

---

## 🤝 Need Help?

- Railway docs: https://docs.railway.app
- Supabase docs: https://supabase.com/docs
- Redis docs: https://redis.io/docs
- Auth service code: `/home/tupac-katari/Documents/VoterUnions/backend/services/auth`
