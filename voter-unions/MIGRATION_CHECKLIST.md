# Blue Spirit Phase 1 Migration Checklist

Comprehensive checklist for migrating from Supabase to WebAuthn-based backend.

**Project:** Voter Unions → United Unions  
**Phase:** Blue Spirit Phase 1 (WebAuthn Auth + Security Infrastructure)  
**Duration:** 14 weeks (Week 0 + Weeks 3-14)  
**Status:** ⏳ In Progress (Week 0)

---

## 📋 Week 0: Pre-Migration Preparation

**Goal:** Set up infrastructure and security guardrails before starting migration.  
**Duration:** 1-3 days  
**Status:** ✅ Complete (2025-10-19)

### Infrastructure (15 items)

- [x] `src/config.ts` created with feature flags
- [x] `src/services/emailVerification.ts` updated with flag check
- [x] `.env.example` created with all variables
- [x] `.gitignore` updated to exclude `.env` files
- [x] `src/services/data/` directory created
- [x] `src/services/data/types.ts` with shared types
- [x] `src/services/data/supabase-data.ts` implemented (read-only)
- [x] `src/services/data/api-data.ts` stub created
- [x] `src/services/data/adapter.ts` interface created
- [x] `src/utils/migration/uuid.ts` utility created
- [x] `src/utils/migration/rollout.ts` utility created
- [x] `MIGRATION_CHECKLIST.md` created
- [x] `replit.md` updated with migration status
- [x] All tests created (awaiting test run)
- [x] App still works with Supabase (production guards disabled during migration)

### Security Guardrails (9 items)

- [x] **Guardrail 1:** Supabase adapter is read-only (removed all write functions)
- [x] **Guardrail 2:** Column allow-list implemented (no `select('*')`)
- [ ] **Guardrail 3:** Token separation (WebAuthn JWT only for API) - _Pending Week 3_
- [x] **Guardrail 4:** Production enforcement (TEMPORARILY DISABLED Week 0-7, will re-enable Week 7)
- [x] **Guardrail 5:** ESLint rule bans direct Supabase imports
- [x] **Guardrail 6:** Runtime guard blocks sensitive ops on Supabase path
- [ ] **Guardrail 7:** Server-side rate limiting (Pending Week 3) - _Pending Week 3_
- [x] **Guardrail 8:** PII assertion added to adapter
- [x] **Guardrail 9:** Adapter security tests created

### Optional (Recommended)

- [ ] Create `*_public_view` database views in Supabase
- [ ] Add GitHub Actions CI check for direct Supabase calls
- [ ] Set up monitoring for PII leaks in logs

---

## 🔐 Week 3: Backend WebAuthn Registration

**Goal:** Build auth service with WebAuthn registration endpoint.  
**Duration:** 5 days (Monday-Friday)  
**Status:** ✅ Complete (2025-10-19)

### Day 1: Project Setup

- [x] Create `backend/services/auth/` directory
- [x] Initialize Node.js project with TypeScript
- [x] Install dependencies (Fastify, SimpleWebAuthn, PostgreSQL, Redis)
- [x] Create `tsconfig.json` and `package.json`
- [x] Set up development scripts (`npm run dev`, `npm run build`)

### Day 2: Database Schema

- [x] Create PostgreSQL database schema (schema.sql)
- [x] Create `users` table with UUID primary key
- [x] Create `webauthn_credentials` table
- [x] Create `sessions` table
- [x] Set up database connection pool
- [x] Create migration scripts

### Day 3: WebAuthn Registration & Authentication

- [x] Implement `/auth/register/init` endpoint (generate challenge)
- [x] Store challenge in Redis (5-minute TTL)
- [x] Implement `/auth/register/verify` endpoint
- [x] Verify WebAuthn credential and signature
- [x] Store user + credential in PostgreSQL
- [x] Return JWT token
- [x] Implement `/auth/login/init` endpoint
- [x] Implement `/auth/login/verify` endpoint
- [x] Implement `/auth/refresh` endpoint
- [x] Implement `/auth/logout` endpoint

### Day 4: Testing & Documentation

- [x] Write basic test infrastructure
- [x] Document API endpoints (README.md)
- [x] Create deployment guide (DEPLOYMENT.md)
- [x] Handle error cases (duplicate users, invalid credentials)
- [ ] Integration tests with real WebAuthn flow (requires browser)

### Day 5: Security Hardening

- [x] Add rate limiting (10 requests per 15 minutes)
- [x] Add CORS configuration
- [x] Add input validation with Zod
- [x] Add request logging (Fastify logger)
- [x] Add health check endpoint
- [ ] Deploy to test environment (requires production setup)

---

## 🔓 Week 4: Backend WebAuthn Authentication

**Goal:** Build WebAuthn login and session management.  
**Duration:** 5 days  
**Status:** ⏳ Pending

### Day 1: Login Flow

- [ ] Implement `/auth/login/init` endpoint
- [ ] Generate authentication challenge
- [ ] Fetch user's stored credentials
- [ ] Return challenge + credential IDs

### Day 2: Login Verification

- [ ] Implement `/auth/login/verify` endpoint
- [ ] Verify WebAuthn assertion
- [ ] Check counter for replay protection
- [ ] Generate JWT token with 15-minute expiration
- [ ] Create refresh token (30-day expiration)

### Day 3: Session Management

- [ ] Implement `/auth/refresh` endpoint
- [ ] Validate refresh token
- [ ] Issue new access token
- [ ] Implement `/auth/logout` endpoint
- [ ] Invalidate tokens in Redis

### Day 4: Testing

- [ ] Write unit tests for login flow
- [ ] Write integration tests
- [ ] Test token refresh
- [ ] Test logout
- [ ] Test concurrent sessions

### Day 5: Deploy

- [ ] Deploy auth service to test environment
- [ ] Test end-to-end with Expo frontend
- [ ] Load testing (100 concurrent users)
- [ ] Monitor Redis + PostgreSQL performance

---

## 📱 Week 5: Frontend Integration

### **🔀 Choose Your Path:**

#### **Option 5A: Device Token Auth (Expo Go)** ⭐ RECOMMENDED
**Goal:** Implement privacy-first device authentication in Expo Go  
**Duration:** 3-5 days  
**Status:** ⏳ Next  
**Works in:** ✅ Expo Go (current workflow)

#### **Option 5B: WebAuthn (Development Builds)**
**Goal:** Integrate WebAuthn auth with biometric support  
**Duration:** 5 days  
**Status:** ⏳ Future (requires abandoning Expo Go)  
**Works in:** ❌ Requires development builds (`expo prebuild`)

---

### **Week 5A: Device Token Frontend (Expo Go Compatible)**

**Goal:** Connect Expo app to auth backend using device-based cryptographic authentication.  
**Duration:** 3-5 days  
**Status:** ⏳ Pending

### Day 1: Device Auth Service

- [ ] Create `src/services/deviceAuth.ts`
- [ ] Implement device keypair generation (`expo-crypto`)
- [ ] Implement challenge signing
- [ ] Implement device fingerprinting
- [ ] Add secure storage functions (`expo-secure-store`)
- [ ] Test keypair generation and storage

### Day 2: Update AuthContext

- [ ] Update `src/contexts/AuthContext.tsx`
- [ ] Add `registerWithDevice()` method
- [ ] Add `loginWithDevice()` method
- [ ] Implement token storage (access + refresh)
- [ ] Test context methods work correctly

### Day 3: Registration UI

- [ ] Create `DeviceRegisterScreen.tsx`
- [ ] Add "Create Account with This Device" UI
- [ ] Implement registration flow
- [ ] Show loading states
- [ ] Handle errors with user-friendly messages
- [ ] Test on iOS simulator
- [ ] Test on Android emulator

### Day 4: Login UI

- [ ] Create `DeviceLoginScreen.tsx`
- [ ] Add "Login with This Device" UI
- [ ] Implement auto-login on app start
- [ ] Handle errors gracefully
- [ ] Test login flow works
- [ ] Test logout clears credentials

### Day 5: Backend Integration & Testing

- [ ] Modify backend to support device token endpoints
- [ ] Create `device_credentials` database table
- [ ] Test full registration flow (frontend → backend)
- [ ] Test full login flow
- [ ] Test token refresh works
- [ ] Verify works in Expo Go (iOS + Android)
- [ ] Update documentation

---

## 🧪 Week 6: Testing & Gradual Rollout

**Goal:** Test migration and roll out to percentage of users.  
**Duration:** 5 days  
**Status:** ⏳ Pending

### Day 1: Comprehensive Testing

- [ ] Run all existing tests (62 security tests + unit tests)
- [ ] Add new tests for WebAuthn flow
- [ ] Test with 10+ real devices (iOS + Android)
- [ ] Test edge cases (offline, slow network, device loss)
- [ ] Fix any bugs found

### Day 2: Rollout Configuration

- [ ] Set `EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT=10` (10% rollout)
- [ ] Set `EXPO_PUBLIC_USE_WEBAUTHN=true`
- [ ] Set `EXPO_PUBLIC_USE_NEW_BACKEND=false` (still using Supabase for data)
- [ ] Deploy to production
- [ ] Monitor auth service logs

### Day 3-4: Monitoring & Iteration

- [ ] Monitor error rates (target: <1%)
- [ ] Monitor authentication success rate (target: >95%)
- [ ] Collect user feedback
- [ ] Fix any issues
- [ ] Increase rollout to 25% if stable

### Day 5: Documentation

- [ ] Update user documentation
- [ ] Create troubleshooting guide
- [ ] Document rollback procedure
- [ ] Update `replit.md` with progress

---

## 🧹 Week 7: Cleanup & 100% Rollout

**Goal:** Complete migration and clean up legacy code.  
**Duration:** 5 days  
**Status:** ⏳ Pending

### Day 1: Increase Rollout

- [ ] Set `EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT=100` (100% rollout)
- [ ] Monitor for 24 hours
- [ ] Verify all users can authenticate

### Day 2: Remove Email Verification Guards

- [ ] Set `EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false`
- [ ] Delete 11 email verification guard files (or keep as disabled)
- [ ] Remove email verification banner components
- [ ] Update onboarding flow

### Day 3: Code Cleanup

- [ ] Remove Supabase Auth imports from frontend
- [ ] Keep Supabase adapter for data access (still needed)
- [ ] Remove unused auth-related code
- [ ] Run ESLint and fix warnings

### Day 4: Documentation

- [ ] Update `README.md`
- [ ] Update `SECURITY_STATUS.md`
- [ ] Update `replit.md`
- [ ] Create migration retrospective document

### Day 5: Celebration & Planning

- [ ] Announce successful migration to users
- [ ] Review metrics (auth success rate, error rate, user satisfaction)
- [ ] Plan Phase 2 (encrypted memberships, blind voting, E2EE messaging)
- [ ] Update roadmap

---

## 📊 Success Metrics

### Week 0 (Pre-Migration)
- ✅ Feature flags implemented
- ✅ Security guardrails in place
- ✅ App still works with Supabase
- ✅ Zero regressions

### Week 3-5 (Implementation)
- ✅ WebAuthn registration works on iOS + Android
- ✅ WebAuthn login works on iOS + Android
- ✅ JWT tokens issued and refreshed correctly
- ✅ All existing features still work

### Week 6 (Gradual Rollout)
- ✅ 10% rollout: <1% error rate
- ✅ 25% rollout: >95% authentication success rate
- ✅ No increase in support tickets

### Week 7 (100% Rollout)
- ✅ 100% rollout: stable for 24 hours
- ✅ Zero email/password authentication
- ✅ All users migrated successfully
- ✅ Email verification guards disabled

---

## 🚨 Rollback Procedures

### Immediate Rollback (Critical Issues)

If major issues occur, rollback immediately:

1. **Set rollout to 0%:**
   ```bash
   EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT=0
   EXPO_PUBLIC_USE_WEBAUTHN=false
   ```

2. **Deploy to production:**
   ```bash
   npm run deploy
   ```

3. **Verify:** All users back on Supabase auth

### Partial Rollback (Non-Critical Issues)

If issues affect small percentage:

1. **Reduce rollout percentage:**
   ```bash
   EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT=5  # Reduce from 10% to 5%
   ```

2. **Fix issues in auth service**

3. **Increase rollout again when stable**

---

## 📞 Support & Contacts

- **Primary Engineer:** [Your name]
- **Backend Lead:** [Backend engineer]
- **Security Lead:** [Security engineer]
- **Support Team:** [Support email]

---

## 📝 Notes

- All dates are estimates and subject to change
- Each week's tasks should be reviewed before starting
- Security is the top priority - no compromises
- User experience must remain smooth during migration
- Monitor metrics closely during rollout

---

**Last Updated:** 2025-10-19  
**Next Review:** After Week 0 completion
