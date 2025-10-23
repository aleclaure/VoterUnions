# Day 2 Audit Integration - Test Suite

## Overview

Comprehensive test suite for verifying the Day 2 audit service integration. Tests cover code validation, database setup, endpoint functionality, audit verification, and performance.

## Test Structure

```
tests/
├── run-all-tests.sh              # Master test runner
├── phase1-preflight.sh           # Pre-flight checks (no server needed)
├── phase2-database.sh            # Database verification (no server needed)
├── phase3-endpoints.ts           # Endpoint testing (server required)
├── phase5-audit-verification.ts  # Audit encryption/decryption (server required)
├── phase6-performance.ts         # Performance testing (server required)
└── README.md                     # This file
```

## Prerequisites

### 1. Environment Variables

```bash
# Database connection
export DATABASE_URL="postgresql://user:password@localhost:5432/voter_unions_auth"

# Audit encryption key (64 hex characters)
export AUDIT_ENCRYPTION_KEY="fc2d86bff6e40f8661f6e76288b2d5755568edf422bd2f54e462b13416e646f9"

# Optional: Auth service URL (defaults to http://localhost:3001)
export AUTH_SERVICE_URL="http://localhost:3001"
```

### 2. Database Setup

```bash
# Create database (if not exists)
createdb voter_unions_auth

# Run migrations (if needed)
psql $DATABASE_URL -f migrations/001_create_users_table.sql

# Initialize audit schema
psql $DATABASE_URL -f src/audit/schema.sql
```

### 3. Server Running

For Phase 3-6 tests, the auth service must be running:

```bash
# In a separate terminal
npm run dev
```

## Running Tests

### Quick Start (Run All Tests)

```bash
cd backend/services/auth

# Make scripts executable
chmod +x tests/*.sh

# Run all tests
./tests/run-all-tests.sh
```

### Run Individual Phases

#### Phase 1: Pre-flight Checks (No Server)
```bash
bash tests/phase1-preflight.sh
```

**Tests:**
- ✅ Audit service import exists
- ✅ 15 audit calls present
- ✅ TypeScript compiles
- ✅ All ActionType values valid

**Duration:** ~10 seconds

---

#### Phase 2: Database Checks (No Server)
```bash
bash tests/phase2-database.sh
```

**Tests:**
- ✅ `secure_audit_logs` table exists
- ✅ `AUDIT_ENCRYPTION_KEY` is set
- ✅ All required columns exist

**Duration:** ~5 seconds

---

#### Phase 3-4: Endpoint Testing (Server Required)
```bash
npx tsx tests/phase3-endpoints.ts
```

**Tests:**
- ✅ Test 8: Device Registration (signup_success)
- ✅ Test 9: Duplicate Device (signup_failed)
- ✅ Test 10: Device Authentication (login_success)
- ✅ Test 11: Expired Challenge (login_failed)
- ✅ Test 12: Set Password (password_changed)
- ✅ Test 13: Hybrid Login (login_success)
- ✅ Test 14: Invalid Password (login_failed)
- ✅ Test 15: Token Refresh (token_refreshed)

**Duration:** ~1-2 minutes

---

#### Phase 5: Audit Verification (Server Required)
```bash
npx tsx tests/phase5-audit-verification.ts
```

**Tests:**
- ✅ Test 17: Encryption verified (BYTEA data)
- ✅ Test 18: Decryption works correctly
- ✅ Test 19: Time bucketing (rounded to hour)
- ✅ Test 20: Device hashing (SHA-256)

**Duration:** ~30 seconds

---

#### Phase 6: Performance Testing (Server Required)
```bash
npx tsx tests/phase6-performance.ts
```

**Tests:**
- ✅ Test 21: Audit latency (100 iterations)
- ✅ Test 22: Concurrent requests (200 requests)

**Duration:** ~1-2 minutes

---

## Expected Results

### Phase 1: Pre-flight
```
✅ PASS: Audit service import found
✅ PASS: Found 15 audit calls (expected)
✅ PASS: No TypeScript errors
✅ PASS: All actionType values are valid

Phase 1: Pre-flight Checks Complete
All tests passed! ✅
```

### Phase 2: Database
```
✅ PASS: secure_audit_logs table exists
✅ PASS: AUDIT_ENCRYPTION_KEY is set (64 characters)
✅ PASS: All required columns exist

Phase 2: Database Checks Complete
All tests passed! ✅
```

### Phase 3-4: Endpoints
```
Tests Passed: 8/8
Audit Logs Found: 8/8

Detailed Results:
  1. Test 8: Device Registration: ✅ PASS (audit ✓)
  2. Test 9: Duplicate Device Registration: ✅ PASS (audit ✓)
  3. Test 10: Device Authentication: ✅ PASS (audit ✓)
  4. Test 11: Expired Challenge: ✅ PASS (audit ✓)
  5. Test 12: Set Password: ✅ PASS (audit ✓)
  6. Test 13: Hybrid Login: ✅ PASS (audit ✓)
  7. Test 14: Invalid Password: ✅ PASS (audit ✓)
  8. Test 15: Token Refresh: ✅ PASS (audit ✓)
```

### Phase 5: Audit Verification
```
Tests Passed: 4/4

Detailed Results:
  1. Test 17: Verify Encryption: ✅ PASS
     5 logs checked. Encryption verified.
  2. Test 18: Verify Decryption: ✅ PASS
     5 logs decrypted successfully
  3. Test 19: Verify Time Bucketing: ✅ PASS
     10 timestamps verified
  4. Test 20: Verify Device Hashing: ✅ PASS
     All device fingerprints are valid SHA-256 hashes
```

### Phase 6: Performance
```
Tests Passed: 2/2

Detailed Results:
  1. Test 21: Audit Latency: ✅ PASS
     Avg: 3.45ms, P95: 5.12ms, Max: 8.23ms, DB: 100/100
  2. Test 22: Concurrent Requests: ✅ PASS
     200 requests in 1243ms (160 req/s), 198 in DB
```

---

## Troubleshooting

### Error: "Database connection failed"

**Problem:** `DATABASE_URL` not set or incorrect

**Solution:**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT NOW()"

# Set if missing
export DATABASE_URL="postgresql://user:password@localhost:5432/voter_unions_auth"
```

---

### Error: "secure_audit_logs table not found"

**Problem:** Audit schema not initialized

**Solution:**
```bash
# Run audit schema
psql $DATABASE_URL -f src/audit/schema.sql

# Verify table exists
psql $DATABASE_URL -c "\d secure_audit_logs"
```

---

### Error: "AUDIT_ENCRYPTION_KEY not set"

**Problem:** Encryption key missing

**Solution:**
```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Export
export AUDIT_ENCRYPTION_KEY="your_generated_key_here"

# Add to .env
echo "AUDIT_ENCRYPTION_KEY=your_generated_key_here" >> .env
```

---

### Error: "Auth service not running"

**Problem:** Server not started for Phase 3-6 tests

**Solution:**
```bash
# Start server in separate terminal
npm run dev

# Verify server is running
curl http://localhost:3001/health
```

---

### Error: "Audit log not found"

**Problem:** Audit logging is async, may take a moment

**Solution:**
- Tests wait 2 seconds for audit logs
- If still failing, check:
  1. Encryption key is correct
  2. Database connection works
  3. No errors in server console

---

### Error: "TypeScript compilation failed"

**Problem:** Code errors in auth.ts

**Solution:**
```bash
# Check errors
npx tsc --noEmit

# Fix errors in src/routes/auth.ts
# Re-run Phase 1 tests
```

---

## Manual Verification

### Check Audit Log Count
```sql
SELECT COUNT(*) FROM secure_audit_logs;
-- Expected: > 0 after running Phase 3-4
```

### View Recent Logs (Encrypted)
```sql
SELECT
  id,
  action_type,
  platform,
  success,
  LENGTH(user_id_encrypted) as encrypted_length,
  device_fingerprint,
  timestamp_bucket
FROM secure_audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Decrypt Logs (Admin Only)
```typescript
// Create test-decrypt.ts
import { auditService } from './src/audit/AuditService';

async function test() {
  const logs = await auditService.queryLogs({ limit: 10 });
  logs.forEach(log => {
    console.log(`User: ${log.userId.substring(0, 8)}... | Action: ${log.actionType} | Success: ${log.success}`);
  });
}

test().catch(console.error);
```

```bash
npx tsx test-decrypt.ts
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Audit Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: voter_unions_auth
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: backend/services/auth

      - name: Generate encryption key
        run: echo "AUDIT_ENCRYPTION_KEY=$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" >> $GITHUB_ENV

      - name: Setup database
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/voter_unions_auth
        run: |
          psql $DATABASE_URL -f migrations/001_create_users_table.sql
          psql $DATABASE_URL -f src/audit/schema.sql
        working-directory: backend/services/auth

      - name: Run Phase 1-2 Tests
        run: |
          bash tests/phase1-preflight.sh
          bash tests/phase2-database.sh
        working-directory: backend/services/auth

      - name: Start auth service
        run: npm run dev &
        working-directory: backend/services/auth

      - name: Wait for service
        run: npx wait-on http://localhost:3001/health

      - name: Run Phase 3-6 Tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/voter_unions_auth
        run: |
          npx tsx tests/phase3-endpoints.ts
          npx tsx tests/phase5-audit-verification.ts
          npx tsx tests/phase6-performance.ts
        working-directory: backend/services/auth
```

---

## Test Coverage Summary

| Phase | Tests | Duration | Server Required |
|-------|-------|----------|-----------------|
| Phase 1 | 4 | 10s | No |
| Phase 2 | 3 | 5s | No |
| Phase 3-4 | 8 | 1-2m | Yes |
| Phase 5 | 4 | 30s | Yes |
| Phase 6 | 2 | 1-2m | Yes |
| **Total** | **21** | **~3-5m** | Phase 3-6 |

---

## Next Steps

After all tests pass:

1. ✅ **Day 2 Complete** - Audit integration verified
2. **Day 3**: Production testing with real traffic
3. **Day 4**: Code review and documentation
4. **Deployment**: Ready for production

---

## Support

If tests fail or you encounter issues:

1. Check the troubleshooting section above
2. Review `DAY_2_ERROR_ANALYSIS_AND_TESTING_PLAN.md`
3. Check server logs for errors
4. Verify database connection
5. Ensure all environment variables are set

---

**Created**: October 23, 2025
**Day 2 Status**: Testing Phase
**Next**: Run tests and verify all pass

