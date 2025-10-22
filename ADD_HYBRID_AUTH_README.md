# Add Hybrid Auth to Working System

## What This Does

Adds username/password authentication ON TOP of your existing working device token system.

**Result**: Two-factor authentication (device token + password)

---

## Files Created ✅

1. **src/utils/password.ts** - Password hashing & validation utilities
2. **migrations/001_add_username_password.sql** - Database migration (already exists)
3. **HYBRID_AUTH_ENDPOINTS_TO_ADD.ts** - 2 endpoints to add to your routes

---

## Step-by-Step Deployment

### Step 1: Run Database Migration (ONE TIME)

In Railway PostgreSQL console:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

**Verify it worked**:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('username', 'password_hash');
```

Should return 2 rows.

---

### Step 2: Add Import to device-token.ts

At the top of `src/routes/device-token.ts`, add:

```typescript
import { hashPassword, verifyPassword, validatePasswordStrength, validateUsername } from '../utils/password.js';
```

---

### Step 3: Add 2 Endpoints

Open `HYBRID_AUTH_ENDPOINTS_TO_ADD.ts` and copy both endpoints:
1. `POST /auth/set-password`
2. `POST /auth/login-hybrid`

Paste them at the END of your `device-token.ts` file (before the final export).

---

### Step 4: Deploy

```bash
# Make sure bcrypt is in package.json (check: it already is ✅)

# Build
npm run build

# Deploy to Railway
npx @railway/cli up
```

---

## What You Get

### Existing Endpoints (Unchanged) ✅
- `POST /auth/challenge`
- `POST /auth/register-device`
- `POST /auth/verify-device`
- `POST /auth/refresh`

### New Endpoints (Added) ⭐
- `POST /auth/set-password` - Set username/password for existing user
- `POST /auth/login-hybrid` - Login with device + password

---

## Testing

### Test set-password:
```bash
curl -X POST https://voterunions-production.up.railway.app/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "existing-user-id",
    "username": "testuser",
    "password": "TestPass123!",
    "deviceId": "device-id"
  }'
```

**Expected**: `{"message": "Password set successfully", "username": "testuser"}`

### Test login-hybrid:
```bash
curl -X POST https://voterunions-production.up.railway.app/auth/login-hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!",
    "publicKey": "...",
    "challenge": "...",
    "signature": "...",
    "deviceId": "...",
    "platform": "ios"
  }'
```

**Expected**: `{"user": {...}, "accessToken": "...", "refreshToken": "..."}`

---

## Safety

✅ **Zero breaking changes**  
✅ **Existing token auth untouched**  
✅ **Columns are nullable (backward compatible)**  
✅ **Old users can still login with device-only**  
✅ **New users can use two-factor**

---

## Rollback

If anything goes wrong:

```bash
# Via Railway CLI
npx @railway/cli rollback <previous-deployment-id>
```

Or just remove the 2 new endpoints and redeploy.

---

## Summary

- ✅ **File 1**: `password.ts` utility (created)
- ✅ **File 2**: Migration SQL (already exists)
- ✅ **File 3**: 2 endpoints to copy/paste (created)
- 📝 **Action needed**: Add endpoints to device-token.ts + deploy
- 🎯 **Result**: Hybrid auth working alongside existing system

**Ready to deploy!**
