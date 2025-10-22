# Device Token Authentication Service

Platform-aware authentication service supporting both web and native (iOS/Android) device token authentication with P-256 ECDSA cryptography.

---

## 🔐 Features

### Platform Separation
- ✅ **Web**: @noble/curves for P-256 ECDSA
- ✅ **Native (iOS/Android)**: elliptic library (client-side)
- ✅ **Unified Backend**: Same endpoints work for both platforms
- ✅ **Auto-detection**: Platform identified from client metadata

### Security
- ✅ Challenge-response authentication
- ✅ P-256 ECDSA signature verification
- ✅ Short-lived access tokens (15 min)
- ✅ Long-lived refresh tokens (30 days)
- ✅ No passwords or emails required

### Error Handling
- ✅ Graceful failures (no crashes)
- ✅ Detailed error messages for debugging
- ✅ Automatic cleanup of expired challenges
- ✅ Database transaction safety

---

## 📋 API Endpoints

### `POST /auth/challenge`

Generate authentication challenge.

**Request:**
```json
{
  "deviceId": "web-uuid-or-native-hardware-id",
  "platform": "web" | "ios" | "android"
}
```

**Response:**
```json
{
  "challenge": "32-byte-hex-string",
  "expiresAt": "2025-10-22T12:30:00Z"
}
```

---

### `POST /auth/register-device`

Register new device with public key.

**Request:**
```json
{
  "publicKey": "hex-encoded-p256-public-key",
  "deviceId": "unique-device-identifier",
  "platform": "web" | "ios" | "android",
  "deviceName": "Optional device name",
  "deviceModel": "Optional device model",
  "osVersion": "Optional OS version"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "user-ulid",
    "displayName": "user_abc123",
    "platform": "web"
  },
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": 900
}
```

**Error Response:**
```json
{
  "error": "Device already registered",
  "message": "This device is already registered. Use login instead."
}
```

---

### `POST /auth/verify-device`

Authenticate device using challenge-response.

**Request:**
```json
{
  "challenge": "challenge-from-/auth/challenge",
  "signature": "hex-encoded-ecdsa-signature",
  "deviceId": "device-identifier",
  "publicKey": "hex-encoded-public-key"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "user-ulid",
    "displayName": "user_abc123",
    "platform": "web"
  },
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": 900
}
```

**Error Responses:**
```json
// Expired challenge
{
  "error": "Invalid or expired challenge",
  "message": "Please request a new challenge"
}

// Invalid signature
{
  "error": "Invalid signature",
  "message": "Authentication failed. Signature verification failed."
}

// Device not found
{
  "error": "Device not registered",
  "message": "Please register this device first"
}
```

---

### `POST /auth/refresh`

Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-token",
  "newRefreshToken": "new-jwt-refresh-token",
  "expiresIn": 900
}
```

---

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "auth",
  "timestamp": "2025-10-22T12:00:00Z"
}
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Install dependencies:**
```bash
cd backend/services/auth
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env

# Edit .env with your values:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (32+ character random string)
# - REFRESH_SECRET (32+ character random string)
```

3. **Start PostgreSQL (if not running):**
```bash
# macOS with Homebrew
brew services start postgresql@14

# Ubuntu/Debian
sudo systemctl start postgresql

# Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14
```

4. **Create database:**
```bash
createdb voter_unions_auth

# Or with psql:
psql -c "CREATE DATABASE voter_unions_auth;"
```

5. **Start development server:**
```bash
npm run dev
```

Server will start on `http://localhost:3001`

---

## 🧪 Testing

### Test Registration (Web)

```bash
# 1. Generate challenge
curl -X POST http://localhost:3001/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "web-test-device-123",
    "platform": "web"
  }'

# Response:
# {
#   "challenge": "abc123...",
#   "expiresAt": "2025-10-22T12:35:00Z"
# }

# 2. Register device (you need to generate keypair client-side)
curl -X POST http://localhost:3001/auth/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "04a1b2c3...",
    "deviceId": "web-test-device-123",
    "platform": "web",
    "deviceName": "Chrome Browser"
  }'

# Response:
# {
#   "success": true,
#   "user": { "userId": "...", "displayName": "..." },
#   "accessToken": "...",
#   "refreshToken": "...",
#   "expiresIn": 900
# }
```

### Test Login (Web)

```bash
# 1. Get challenge
curl -X POST http://localhost:3001/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "web-test-device-123",
    "platform": "web"
  }'

# 2. Sign challenge with private key (client-side)
# 3. Verify device
curl -X POST http://localhost:3001/auth/verify-device \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": "abc123...",
    "signature": "signature-hex...",
    "deviceId": "web-test-device-123",
    "publicKey": "04a1b2c3..."
  }'
```

### Test Health Check

```bash
curl http://localhost:3001/health

# Response:
# {
#   "status": "healthy",
#   "service": "auth",
#   "timestamp": "2025-10-22T12:00:00Z"
# }
```

---

## 🌐 Railway Deployment

### Prerequisites
- Railway account (https://railway.app)
- Railway CLI installed (optional)

### Method 1: Railway CLI

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project (from this directory)
railway init

# 4. Add PostgreSQL
railway add --plugin postgresql

# 5. Set environment variables
railway variables set JWT_SECRET="your-secret-32-chars-min"
railway variables set REFRESH_SECRET="your-refresh-secret-32-chars-min"
railway variables set CORS_ORIGIN="https://yourapp.com"

# 6. Deploy
railway up
```

### Method 2: GitHub Integration

1. **Push code to GitHub:**
```bash
git add backend/services/auth
git commit -m "Add auth service"
git push origin main
```

2. **Connect to Railway:**
- Go to https://railway.app
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your repository
- Set root directory: `backend/services/auth`

3. **Add PostgreSQL:**
- Click "New" → "Database" → "Add PostgreSQL"
- Railway will auto-inject `DATABASE_URL`

4. **Set Environment Variables:**
```
JWT_SECRET=your-secret-32-chars-minimum-length
REFRESH_SECRET=your-refresh-secret-32-chars-minimum
CORS_ORIGIN=https://yourapp.com
NODE_ENV=production
```

5. **Deploy:**
- Railway will auto-deploy on git push
- Get service URL from Railway dashboard

### Environment Variables (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-injected by Railway) |
| `JWT_SECRET` | Yes | Secret for access tokens (32+ chars) |
| `REFRESH_SECRET` | Yes | Secret for refresh tokens (32+ chars) |
| `CORS_ORIGIN` | Yes | Frontend URL (e.g., https://yourapp.com) |
| `NODE_ENV` | No | Set to `production` |
| `PORT` | No | Auto-set by Railway (default: 3001) |

---

## 🔧 Configuration

### CORS

By default, CORS is set to allow all origins (`*`) in development.

**Production:**
```env
CORS_ORIGIN=https://yourapp.com,https://www.yourapp.com
```

### Token Expiry

**Access Token:** 15 minutes (configured in `src/tokens.ts`)
**Refresh Token:** 30 days (configured in `src/tokens.ts`)

To change:
```typescript
// src/tokens.ts
const accessToken = jwt.sign(
  { userId, deviceId },
  JWT_SECRET,
  { expiresIn: '30m' } // Change to 30 minutes
);
```

### Challenge Expiry

Challenges expire after 5 minutes (configured in `src/routes/auth.ts`)

---

## 🛡️ Security Features

### No Crashes
- ✅ All endpoints wrapped in try-catch
- ✅ Database errors handled gracefully
- ✅ Invalid input returns 400, not 500
- ✅ Expired challenges cleaned up automatically

### Platform Isolation
- ✅ Web and native use same crypto (P-256)
- ✅ Signature verification works for both
- ✅ Platform stored in user record
- ✅ No cross-platform key reuse issues

### Token Security
- ✅ Separate secrets for access/refresh tokens
- ✅ Short-lived access tokens (15 min)
- ✅ Refresh token rotation on use
- ✅ Tokens bound to device ID

---

## 📊 Database Schema

```sql
-- Users table
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  device_id TEXT UNIQUE,
  public_key TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'web' | 'ios' | 'android'
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Sessions table
CREATE TABLE device_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenges table
CREATE TABLE auth_challenges (
  challenge TEXT PRIMARY KEY,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

---

## 🔍 Troubleshooting

### "Database initialization failed"

**Cause:** PostgreSQL not running or wrong connection string

**Fix:**
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL
```

### "Signature verification failed"

**Cause:** Client and server using different crypto libraries or formats

**Fix:**
- Ensure client uses P-256 curve (not secp256k1 or ed25519)
- Ensure signature is in compact format (64 bytes for P-256)
- Check public key is uncompressed format (65 bytes, starts with 0x04)

### "CORS error in browser"

**Cause:** Frontend URL not in CORS_ORIGIN

**Fix:**
```env
# Add your frontend URL
CORS_ORIGIN=http://localhost:8081
```

Restart server after changing .env

---

## 📚 Related Documentation

- [Frontend Device Auth](../../../src/services/platformDeviceAuth.ts)
- [Web Device Auth](../../../src/services/webDeviceAuth.ts)
- [Native Device Auth](../../../src/services/deviceAuth.ts)
- [Security Architecture](../../../SECURITY_ENHANCEMENTS_ADDENDUM.md)

---

## 📝 License

MIT

---

**Last Updated:** October 22, 2025
