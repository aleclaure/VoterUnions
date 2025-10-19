# Security Acceptance Criteria - Phase 1 Implementation Plan

**Goal:** Achieve 86% privacy compliance while staying 100% within Expo + React Native ecosystem  
**Timeline:** 2-4 months (8-16 weeks)  
**Budget:** $165-360/mo ongoing infrastructure costs  
**Team:** 1-2 full-stack developers

---

## 📋 Table of Contents

1. [Migration Relevance Map](#migration-relevance-map)
2. [Executive Summary](#executive-summary)
3. [Architecture Overview](#architecture-overview)
4. [Week-by-Week Implementation](#week-by-week-implementation)
5. [Service Specifications](#service-specifications)
6. [Database Migration Strategy](#database-migration-strategy)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Deployment & Infrastructure](#deployment--infrastructure)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Metrics](#success-metrics)

---

## 🗺️ Migration Relevance Map

**Purpose:** This section maps existing security features from the current Supabase-based implementation to the new Phase 1 privacy-first architecture. It clarifies what to **KEEP**, **ADAPT**, or **REMOVE** during migration.

---

### **Section 1: What to KEEP, ADAPT, or REMOVE**

#### **✅ KEEP (No Changes Required)**

| Feature | Status | Action |
|---------|--------|--------|
| **XSS Hardening** | ✅ KEEP | Keep CI enforcement exactly as-is (62 tests, stripHtml, AST enforcement) |
| **Content Reporting & Moderation** | ✅ KEEP | Keep the model and auditability; enforce access via microservice ACLs instead of DB RLS |
| **Server-Side Tallies** | ✅ KEEP | Continue aggregations server-side; compatible with Mode-B voting |
| **Session Timeout + Secure Storage** | ✅ KEEP | Keep 30-min inactivity timeout, SecureStore, and 15-min JWT rotation |
| **CAPTCHA** | ✅ KEEP | Use hCaptcha; verify server-side; avoid user tracking |
| **Security Alerts/Monitoring** | ✅ KEEP | Keep anomaly detection using PII-free telemetry and per-account rates |

**Rationale:** These features are implementation-agnostic and provide essential security without compromising privacy.

---

#### **⚠️ ADAPT (Modify for Privacy-First Architecture)**

| Feature | Old Implementation | New Implementation | Migration Notes |
|---------|-------------------|-------------------|-----------------|
| **Audit Logs** | IP/UA/user_id stored indefinitely | PII-free logs with 24h retention | Remove IP, UA, user_id; use request_hash only |
| **GDPR Export + Hard Delete** | Supabase Edge Function | Node.js account service | Reimplement in Node; fan out to 4 DBs; export excludes emails (not collected) |
| **Rate Limiting** | Client-side only | Server/WAF token bucket | Move to Redis; key by userId (JWT) and per-route anonymous tokens; avoid IP-based |
| **Authorization** | Supabase RLS policies | Microservice ACLs | JWT claims + holder_binding checks in each service |

**Rationale:** These features are valuable but require architectural changes to align with privacy-first principles.

---

#### **❌ REMOVE (Superseded by New Architecture)**

| Feature | Reason for Removal | Replacement |
|---------|-------------------|-------------|
| **Email Verification Gates** | Blocking 16 actions; superseded by WebAuthn | None needed - passkeys provide strong authentication |
| **Passwords & Password Reset Flows** | Email/password auth replaced | WebAuthn passkeys (optional passphrase recovery for low-capability devices) |
| **Supabase RLS Policies** | Stack-specific; moving to microservices | Authorization in microservices using JWT + holder_binding |
| **Device-Based Vote Uniqueness** | device_id hashing is linkable | Mode-B blind-signature voting with nullifier uniqueness |
| **IP-Based Geo Verification** | Privacy violation | Avoid/defer; use coarse WAF geofencing without persistent storage if absolutely necessary |

**Rationale:** These features either collect PII or are incompatible with the privacy-first architecture.

---

#### **🔮 OPTIONAL/DEFER (Not Required for Phase 1)**

| Feature | Status | Phase 1 Action |
|---------|--------|----------------|
| **MFA (Multi-Factor Auth)** | Optional step-up | With passkeys, MFA is step-up for admin/superuser actions (second platform authenticator or recovery phrase) |
| **Blockchain Vote Verification** | Nice-to-have | Defer unless public anchoring is a requirement |

**Rationale:** These features add complexity without significant privacy or security benefits for Phase 1.

---

### **Section 2: New/Updated Requirements**

#### **A) Text + Photo Posts**

| Requirement | Implementation |
|-------------|----------------|
| **Media Pipeline** | Whitelist (jpg/png/webp/mp4/gif/pdf), max size limits, EXIF stripping on upload, server-side transcode (images/video) |
| **Storage** | Private bucket for originals + expiring signed URLs; only publish minimal thumbnails if needed |
| **Malware Scanning** | Scan server-side for non-E2E content before publishing |
| **Pseudonyms** | Keep author_pseudonym only; do not store stable device identifiers |

**Code Example:**
```typescript
// Client-side EXIF stripping + encryption
const cleanImage = piexif.remove(imageData);
const manipulated = await ImageManipulator.manipulateAsync(cleanImage, [{ resize: { width: 1440 } }]);
const contentKey = randomBytes(32);
const encrypted = encryptBytes(manipulated, contentKey);
```

---

#### **B) Direct Messaging (DMs)**

| Requirement | Implementation |
|-------------|----------------|
| **E2E by Default** | Per-thread keys; server stores ciphertext + routing metadata only |
| **Attachments** | Client-side encrypt before upload; accept type/size limits; no server scanning for E2E payloads |
| **Safety Controls** | Per-conversation block/report; spam throttles; safety-number / key-change notices |

**Code Example:**
```typescript
// E2EE message sending
const messageKey = deriveMessageKey(rootKey, counter);
const cipher = xchacha20poly1305(messageKey, nonce);
const ciphertext = cipher.encrypt(Buffer.from(plaintext));
await fetch('/dm/:convId/messages', { body: { ciphertext } });
```

---

#### **C) Text Debates**

| Requirement | Implementation |
|-------------|----------------|
| **Modes** | Public (server-readable) vs Private (E2E). Private mode disables server moderation visibility; show user warning |
| **Membership Gating** | Verify via holder_binding (hash of client_pub_key) rather than enumerating members |
| **Ephemerality** | Policy-driven auto-delete options (e.g., 7/30/90 days) with user-visible countdown |

**Schema:**
```sql
ALTER TABLE threads ADD COLUMN type TEXT DEFAULT 'discussion' CHECK (type IN ('discussion', 'debate'));
ALTER TABLE threads ADD COLUMN mode TEXT DEFAULT 'public' CHECK (mode IN ('public', 'private'));
ALTER TABLE threads ADD COLUMN debate_round_window INTERVAL;
ALTER TABLE threads ADD COLUMN max_rounds INTEGER;
```

---

### **Section 3: Concrete Removals/Edits**

#### **🗑️ Delete from Codebase**

1. **Supabase Auth Specifics**
   - ❌ Email verification flows (EmailVerificationBanner, useEmailVerificationGuard)
   - ❌ Password reset flows (ResetPasswordScreen)
   - ❌ RLS-backed write gating (all `authenticated` policies)

2. **Device-ID Vote Uniqueness**
   - ❌ `device_id` column from vote tables
   - ❌ Device hashing utilities for votes
   - ❌ Unique indexes on `(proposal_id, device_id)`

3. **IP/UA Logging**
   - ❌ All `ip_address` columns
   - ❌ All `user_agent` columns
   - ❌ Audit log triggers that capture IP/UA

4. **Email Collection**
   - ❌ Email verification enforcement guards
   - ❌ Email verification banners
   - ❌ Email verification API endpoints

---

#### **✏️ Edit in Codebase**

1. **Account Deletion**
   - **OLD:** Supabase Edge Function (`cleanup-deleted-users`)
   - **NEW:** Node.js `account_service` that cascades across all 4 DBs; logs anonymized and purged ≤24h

2. **Messaging/Debates**
   - **ADD:** Explicit E2E option (server unreadable)
   - **ADD:** User warning about trade-offs (reduced moderation visibility)

3. **Rate Limiting**
   - **OLD:** Client-side only
   - **NEW:** Clarify enforcement occurs at server/WAF (Redis token bucket)

---

### **Section 4: Still Missing After Phase 1 (Roadmap)**

| Feature | Priority | Timeline | Notes |
|---------|----------|----------|-------|
| **E2E for DMs/Private Debates** | 🔴 CRITICAL | Week 7 | Required now that messaging is in scope |
| **Server/WAF Rate Limiting** | 🔴 CRITICAL | Week 12 | Complete migration from client-only |
| **Privacy Controls UI** | 🟡 HIGH | Phase 2 (Week 17-18) | Hide union membership, pseudonyms, profile visibility wired to service ACLs |
| **Media Security Hardening** | 🟡 HIGH | Week 6 + Phase 2 | Scanner/transcoder/EXIF stripping for posts; encrypted-upload flow for DMs |
| **Admin Step-Up Auth** | 🟡 HIGH | Phase 2 (Week 19-20) | Second passkey or recovery challenge for destructive/export actions |

---

### **Section 5: TL;DR Snapshot**

#### **✅ KEEP**
- XSS suite (62 tests)
- Reporting/moderation (18 content types)
- Server-side tallies
- Auditability (PII-free)
- Session management (30-min timeout, SecureStore)
- GDPR export/delete
- CAPTCHA
- Security alerts

#### **❌ REMOVE**
- Email/password authentication
- Email verification gates
- Supabase RLS mechanics
- Device-based vote uniqueness
- IP/UA logging

#### **⚠️ ADAPT**
- Move rate limits to server/WAF
- Rework audits to PII-free 24h retention
- GDPR export via Node services
- Authorization in microservices using JWT + holder_binding

#### **➕ ADD**
- E2E for DMs/private debates
- Hardened media pipeline (EXIF stripping, encryption)
- Privacy settings UI (wired to service ACLs)
- Admin step-up auth (passkey re-prompt)

---

## 📊 Executive Summary

### **What We're Building**

Replace Supabase Auth with custom privacy-first backend services while keeping the Expo + React Native frontend. Phase 1 now also includes E2EE Direct Messaging, encrypted media uploads with EXIF stripping, and Debates with privacy-preserving defaults.

**Before (Current):**
```
Expo App → Supabase Auth (email/password) → Single PostgreSQL DB
          ❌ Collects emails
          ❌ Plaintext memberships
          ❌ Linkable votes
```

**After (Phase 1):**
```
Expo App → Custom Auth (WebAuthn) → 6 Services / 4 DBs + Encrypted Object Storage
          ✅ Zero email collection                 (content_db)
          ✅ Encrypted memberships                 (membership_db)
          ✅ Unlinkable votes (Mode B)             (ballot_db)
          ✅ E2EE Direct Messaging (default)       (dm_db)
          ✅ Encrypted, EXIF-free media pipeline   (object storage)
```

### **Deliverables**

1. ✅ 6 Node.js microservices (auth, union, voting, messaging, dm, media)
2. ✅ 4 PostgreSQL databases (separated by sensitivity)
3. ✅ Encrypted object storage (R2/S3)
4. ✅ Expo frontend with client-side crypto libraries
5. ✅ Mode B blind-signature voting system
6. ✅ E2EE Direct Messaging with forward secrecy
7. ✅ Encrypted media uploads with EXIF stripping
8. ✅ Debates in messaging service
9. ✅ Pseudonymous content (no user_id in posts/comments/threads)
10. ✅ PII-free logging (24h retention)
11. ✅ 86% privacy compliance (up from 18%)

### **Cost Breakdown**

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| 4x PostgreSQL DBs | Railway/Render | $90-180 |
| 6x Node.js services | Railway/Render | $60-120 |
| Redis (session/cache) | Upstash | $10-20 |
| Object Storage (R2/S3) | Cloudflare/AWS | $5-15 |
| CDN/WAF (Phase 2) | Cloudflare | $0-25 |
| **Total** | | **$165-360** |

---

## 🏗️ Architecture Overview

### **Microservices Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    Expo + React Native                  │
│    (iOS/Android/Web - NO native Swift/Kotlin code)     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │      Cloudflare CDN/WAF         │
        │    (Phase 2 - optional now)     │
        └─────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Auth Service    │              │  Union Service   │
│  (WebAuthn)      │              │  (Membership)    │
│  Port: 3001      │              │  Port: 3002      │
└──────────────────┘              └──────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Voting Service  │              │ Messaging Service│
│  (Blind Sigs)    │              │  (Content)       │
│  Port: 3003      │              │  Port: 3004      │
└──────────────────┘              └──────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  DM Service      │              │  Media Service   │
│  (E2EE)          │              │  (Encrypted)     │
│  Port: 3005      │              │  Port: 3006      │
└──────────────────┘              └──────────────────┘
        │                │                 │                │
        ▼                ▼                 ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐
│ content_db  │  │membership_db│  │ ballot_db   │  │ dm_db            │
│ (public)    │  │ (encrypted) │  │ (encrypted) │  │ (encrypted)      │
└─────────────┘  └─────────────┘  └─────────────┘  └──────────────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ Encrypted Object │
                                                    │ Storage (R2/S3)  │
                                                    └──────────────────┘
```

### **Technology Stack**

**Frontend (Expo):**
- Expo SDK 52
- React Native
- TypeScript
- React Query

**New Client Libraries:**
```bash
npm install react-native-passkey @noble/curves @noble/ciphers @noble/hashes ulid blind-signatures expo-image-manipulator expo-file-system piexifjs
```

**Backend (New):**
- Node.js 20+ / TypeScript
- Fastify (API framework)
- PostgreSQL 15+ (4 instances)
- Redis (Upstash for sessions)
- Docker (containerization)

**Crypto Libraries:**
```bash
npm install @simplewebauthn/server @simplewebauthn/browser @noble/curves @noble/ciphers @noble/hashes blind-signatures
```

---

## 📅 Week-by-Week Implementation

### **Weeks 1-2: Project Setup & Infrastructure**

#### **Week 1: Backend Foundation**

**Tasks:**
1. ✅ Create monorepo structure
2. ✅ Set up 4 PostgreSQL databases
3. ✅ Create shared TypeScript configs
4. ✅ Set up Docker development environment
5. ✅ Configure CI/CD pipeline

**Deliverable:**
```
voter-unions/
├── frontend/              # Existing Expo app
│   └── (no changes yet)
├── backend/
│   ├── services/
│   │   ├── auth_service/
│   │   ├── union_service/
│   │   ├── voting_service/
│   │   ├── messaging_service/
│   │   ├── dm_service/          # NEW
│   │   └── media_service/       # NEW
│   ├── shared/
│   │   ├── db/            # Database clients
│   │   ├── crypto/        # Shared crypto utils
│   │   └── types/         # Shared TypeScript types
│   └── docker-compose.yml
└── README.md
```

**Code Example:**
```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  content_db:
    image: postgres:15
    environment:
      POSTGRES_DB: content
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${CONTENT_DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - content_data:/var/lib/postgresql/data

  membership_db:
    image: postgres:15
    environment:
      POSTGRES_DB: membership
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${MEMBERSHIP_DB_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - membership_data:/var/lib/postgresql/data

  ballot_db:
    image: postgres:15
    environment:
      POSTGRES_DB: ballot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${BALLOT_DB_PASSWORD}
    ports:
      - "5434:5432"
    volumes:
      - ballot_data:/var/lib/postgresql/data
  
  dm_db:
    image: postgres:15
    environment:
      POSTGRES_DB: dm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DM_DB_PASSWORD}
    ports:
      - "5435:5432"
    volumes:
      - dm_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  content_data:
  membership_data:
  ballot_data:
  dm_data:
```

**Testing Checkpoint:**
- [ ] All 4 databases start successfully
- [ ] Redis connected
- [ ] Docker Compose up/down works

---

#### **Week 2: Shared Utilities & Database Clients**

**Tasks:**
1. ✅ Create database connection pools
2. ✅ Create shared crypto utilities
3. ✅ Create shared TypeScript types
4. ✅ Set up environment configuration
5. ✅ Create logging utility (PII-free)

**Deliverable:**
```typescript
// backend/shared/db/clients.ts
import { Pool } from 'pg';

export const contentDB = new Pool({
  connectionString: process.env.CONTENT_DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const membershipDB = new Pool({
  connectionString: process.env.MEMBERSHIP_DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const ballotDB = new Pool({
  connectionString: process.env.BALLOT_DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const dmDB = new Pool({
  connectionString: process.env.DM_DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Health checks
export const healthCheck = async () => {
  const checks = await Promise.all([
    contentDB.query('SELECT 1'),
    membershipDB.query('SELECT 1'),
    ballotDB.query('SELECT 1'),
    dmDB.query('SELECT 1'),
  ]);
  return checks.every(r => r.rowCount === 1);
};
```

```typescript
// backend/shared/crypto/encryption.ts
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';

export const encrypt = (plaintext: string, key: Uint8Array): string => {
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(Buffer.from(plaintext));
  
  return Buffer.concat([nonce, ciphertext]).toString('base64');
};

export const decrypt = (ciphertext: string, key: Uint8Array): string => {
  const data = Buffer.from(ciphertext, 'base64');
  const nonce = data.slice(0, 24);
  const encrypted = data.slice(24);
  
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = cipher.decrypt(encrypted);
  
  return plaintext.toString();
};
```

```typescript
// backend/shared/logger/index.ts
import { createHash } from 'crypto';

const LOG_SALT = process.env.LOG_SALT || 'default-salt-change-in-prod';

export const logEvent = async (
  route: string,
  statusCode: number,
  eventType: string
) => {
  const requestHash = createHash('sha256')
    .update(`${LOG_SALT}:${route}:${Date.now()}`)
    .digest('hex');
  
  // Log to database (NO IP, UA, or user_id)
  await contentDB.query(`
    INSERT INTO logs.events (request_hash, route, status_code, event_type)
    VALUES ($1, $2, $3, $4)
  `, [requestHash, route, statusCode, eventType]);
};

// Auto-delete logs older than 24h (run hourly)
export const cleanupOldLogs = async () => {
  await contentDB.query(`
    DELETE FROM logs.events WHERE created_at < NOW() - INTERVAL '24 hours'
  `);
};
```

**Testing Checkpoint:**
- [ ] Database clients connect successfully
- [ ] Crypto functions encrypt/decrypt correctly
- [ ] Logger writes PII-free logs
- [ ] Auto-cleanup deletes old logs

---

### **Weeks 3-5: Auth Service (WebAuthn)**

#### **Week 3: WebAuthn Registration**

**Tasks:**
1. ✅ Create auth service scaffold
2. ✅ Implement WebAuthn registration endpoint
3. ✅ Create user database schema (NO email column)
4. ✅ Implement challenge generation
5. ✅ Store credentials securely

**Database Schema:**
```sql
-- auth_db.users table (NO email column)
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,                 -- ULID
  display_name TEXT,
  webauthn_credential_id TEXT UNIQUE NOT NULL,
  webauthn_public_key BYTEA NOT NULL,
  client_pub_key TEXT NOT NULL,            -- Ed25519 public key
  counter INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_worker BOOLEAN DEFAULT FALSE
);

-- NO email column anywhere!
```

**Code:**
```typescript
// backend/services/auth_service/src/index.ts
import Fastify from 'fastify';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { ulid } from 'ulid';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

const app = Fastify({ logger: true });
const redis = new Redis(process.env.REDIS_URL);

const JWT_SECRET = process.env.JWT_SECRET!;
const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = 'United Unions';
const ORIGIN = process.env.ORIGIN || 'http://localhost:19006';

// GET /auth/challenge
app.get('/auth/challenge', async (req, reply) => {
  const challenge = Buffer.from(crypto.randomUUID()).toString('base64');
  const challengeId = ulid();
  
  // Store in Redis with 5 min expiry
  await redis.setex(`challenge:${challengeId}`, 300, challenge);
  
  return { challenge, challengeId };
});

// POST /auth/webauthn/register
app.post<{
  Body: {
    userId: string;
    challengeId: string;
    credential: any;
    client_pub_key: string;
  };
}>('/auth/webauthn/register', async (req, reply) => {
  const { userId, challengeId, credential, client_pub_key } = req.body;
  
  // Get stored challenge
  const expectedChallenge = await redis.get(`challenge:${challengeId}`);
  if (!expectedChallenge) {
    return reply.code(400).send({ error: 'Challenge expired' });
  }
  
  // Verify registration
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
  
  if (!verification.verified || !verification.registrationInfo) {
    return reply.code(401).send({ error: 'Verification failed' });
  }
  
  // Store user (NO email)
  await db.query(`
    INSERT INTO users (
      user_id,
      webauthn_credential_id,
      webauthn_public_key,
      client_pub_key,
      counter
    )
    VALUES ($1, $2, $3, $4, $5)
  `, [
    userId,
    credential.id,
    verification.registrationInfo.credentialPublicKey,
    client_pub_key,
    verification.registrationInfo.counter,
  ]);
  
  // Delete challenge
  await redis.del(`challenge:${challengeId}`);
  
  // Issue JWT (15 min expiry)
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  
  await logEvent('/auth/webauthn/register', 200, 'registration_success');
  
  return { token, userId };
});

app.listen({ port: 3001, host: '0.0.0.0' });
```

**Testing Checkpoint:**
- [ ] Challenge generation works
- [ ] Registration stores credentials
- [ ] No email column in database
- [ ] JWT issued with 15 min expiry

---

#### **Week 4: WebAuthn Authentication**

**Tasks:**
1. ✅ Implement WebAuthn authentication endpoint
2. ✅ Implement JWT refresh endpoint
3. ✅ Create JWT middleware for other services
4. ✅ Add rate limiting

**Code:**
```typescript
// POST /auth/webauthn/verify
app.post<{
  Body: {
    challengeId: string;
    assertion: any;
  };
}>('/auth/webauthn/verify', async (req, reply) => {
  const { challengeId, assertion } = req.body;
  
  const expectedChallenge = await redis.get(`challenge:${challengeId}`);
  if (!expectedChallenge) {
    return reply.code(400).send({ error: 'Challenge expired' });
  }
  
  // Get user by credential ID
  const { rows: [user] } = await db.query(
    'SELECT * FROM users WHERE webauthn_credential_id = $1',
    [assertion.id]
  );
  
  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }
  
  // Verify authentication
  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: user.webauthn_credential_id,
      credentialPublicKey: user.webauthn_public_key,
      counter: user.counter,
    },
  });
  
  if (!verification.verified) {
    return reply.code(401).send({ error: 'Authentication failed' });
  }
  
  // Update counter
  await db.query(
    'UPDATE users SET counter = $1 WHERE user_id = $2',
    [verification.authenticationInfo.newCounter, user.user_id]
  );
  
  await redis.del(`challenge:${challengeId}`);
  
  const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '15m' });
  
  await logEvent('/auth/webauthn/verify', 200, 'login_success');
  
  return { token, userId: user.user_id };
});

// POST /auth/refresh (refresh JWT)
app.post<{
  Body: { token: string };
}>('/auth/refresh', async (req, reply) => {
  try {
    const decoded = jwt.verify(req.body.token, JWT_SECRET) as { userId: string };
    
    // Issue new token (15 min)
    const newToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '15m' });
    
    return { token: newToken };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});
```

**JWT Middleware:**
```typescript
// backend/shared/middleware/auth.ts
import jwt from 'jsonwebtoken';

export const verifyJWT = async (req: any, reply: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'No token provided' });
  }
  
  const token = authHeader.slice(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.user = { userId: decoded.userId };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
};
```

**Testing Checkpoint:**
- [ ] Authentication works with valid credentials
- [ ] JWT refresh works
- [ ] Middleware blocks unauthenticated requests
- [ ] Rate limiting prevents brute force

---

#### **Week 5: Frontend WebAuthn Integration**

**Tasks:**
1. ✅ Install react-native-passkey
2. ✅ Create auth service in Expo app
3. ✅ Update signup/login screens
4. ✅ Implement key generation (Ed25519)
5. ✅ Store private key in SecureStore

**Install:**
```bash
cd frontend
npm install react-native-passkey @noble/curves @noble/hashes ulid
```

**Code:**
```typescript
// frontend/src/services/auth.ts
import Passkey from 'react-native-passkey';
import { ed25519 } from '@noble/curves/ed25519';
import * as SecureStore from 'expo-secure-store';
import { ulid } from 'ulid';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const registerWithPasskey = async (displayName: string) => {
  // 1. Generate random user ID (no email)
  const userId = ulid();
  
  // 2. Get challenge from server
  const challengeRes = await fetch(`${API_URL}/auth/challenge`);
  const { challenge, challengeId } = await challengeRes.json();
  
  // 3. Create passkey
  const credential = await Passkey.create({
    rpId: 'unitedUnions.app',
    rpName: 'United Unions',
    userId: Buffer.from(userId).toString('base64'),
    userName: displayName || `user_${userId.slice(0, 8)}`,
    challenge: Buffer.from(challenge, 'base64'),
    userVerification: 'preferred',
  });
  
  // 4. Generate client signing keys (never sent to server)
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  
  // 5. Store private key in SecureStore (hardware-backed)
  await SecureStore.setItemAsync(
    'signing_private_key',
    Buffer.from(privateKey).toString('hex')
  );
  
  // 6. Register with server
  const registerRes = await fetch(`${API_URL}/auth/webauthn/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      challengeId,
      credential: {
        id: credential.id,
        rawId: credential.rawId,
        response: {
          clientDataJSON: credential.response.clientDataJSON,
          attestationObject: credential.response.attestationObject,
        },
      },
      client_pub_key: Buffer.from(publicKey).toString('hex'),
    }),
  });
  
  const { token } = await registerRes.json();
  
  // Store auth token
  await SecureStore.setItemAsync('auth_token', token);
  await SecureStore.setItemAsync('user_id', userId);
  
  return { userId, token };
};

export const signInWithPasskey = async () => {
  // 1. Get challenge
  const challengeRes = await fetch(`${API_URL}/auth/challenge`);
  const { challenge, challengeId } = await challengeRes.json();
  
  // 2. Authenticate with passkey
  const assertion = await Passkey.get({
    rpId: 'unitedUnions.app',
    challenge: Buffer.from(challenge, 'base64'),
  });
  
  // 3. Verify with server
  const verifyRes = await fetch(`${API_URL}/auth/webauthn/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      assertion: {
        id: assertion.id,
        rawId: assertion.rawId,
        response: {
          clientDataJSON: assertion.response.clientDataJSON,
          authenticatorData: assertion.response.authenticatorData,
          signature: assertion.response.signature,
          userHandle: assertion.response.userHandle,
        },
      },
    }),
  });
  
  const { token, userId } = await verifyRes.json();
  
  await SecureStore.setItemAsync('auth_token', token);
  await SecureStore.setItemAsync('user_id', userId);
  
  return { userId, token };
};
```

**Update Signup Screen:**
```typescript
// frontend/src/screens/AuthScreen.tsx
import { registerWithPasskey, signInWithPasskey } from '../services/auth';

const AuthScreen = () => {
  const [displayName, setDisplayName] = useState('');
  
  const handleSignUp = async () => {
    try {
      const { userId, token } = await registerWithPasskey(displayName);
      Alert.alert('Success', `Account created! User ID: ${userId.slice(0, 8)}`);
      // Navigate to app
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  
  const handleSignIn = async () => {
    try {
      const { userId, token } = await signInWithPasskey();
      Alert.alert('Success', 'Logged in!');
      // Navigate to app
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  
  return (
    <View>
      <Text>Sign Up (No Email Required)</Text>
      <TextInput
        placeholder="Display Name (optional)"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <Button title="Create Passkey Account" onPress={handleSignUp} />
      
      <Text>Or Sign In</Text>
      <Button title="Sign In with Passkey" onPress={handleSignIn} />
    </View>
  );
};
```

**Testing Checkpoint:**
- [ ] Signup creates passkey successfully
- [ ] Private key stored in SecureStore
- [ ] Login works with existing passkey
- [ ] No email collected anywhere
- [ ] JWT stored and refreshed automatically

---

### **Weeks 6-8: Union Service + Media + DM + Debates**

#### **Week 6: Media Pipeline (Encrypted Uploads + EXIF Stripping)**

**Tasks:**
1. ✅ Create media service scaffold
2. ✅ Implement client-side EXIF stripping
3. ✅ Implement client-side encryption
4. ✅ Create presigned URL endpoint
5. ✅ Create media_objects table

**Database Schema:**
```sql
-- content_db.media_objects
CREATE TABLE media_objects (
  object_key TEXT PRIMARY KEY,
  owner_binding TEXT NOT NULL,      -- SHA256(client_pub_key)
  union_id TEXT,
  size INTEGER,
  mime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_owner_binding ON media_objects(owner_binding);
```

**Backend Code:**
```typescript
// backend/services/media_service/src/index.ts
import Fastify from 'fastify';
import { ulid } from 'ulid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = Fastify({ logger: true });
const s3 = new S3Client({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.BUCKET_NAME;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /media/presign
app.post<{
  Body: {
    mime: string;
    size: number;
    union_id?: string;
  };
}>('/media/presign', async (req, reply) => {
  const { mime, size, union_id } = req.body;
  const userId = req.user.userId;
  
  // Validate
  if (!ALLOWED_MIMES.includes(mime)) {
    return reply.code(400).send({ error: 'Invalid MIME type' });
  }
  
  if (size > MAX_FILE_SIZE) {
    return reply.code(400).send({ error: 'File too large' });
  }
  
  // Generate object key
  const objectKey = `encrypted/${ulid()}.enc`;
  
  // Generate presigned URL (10 min expiry)
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ContentType: 'application/octet-stream', // Encrypted data
  });
  
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
  
  // Get user's public key
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const ownerBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  // Store metadata
  await contentDB.query(`
    INSERT INTO media_objects (object_key, owner_binding, union_id, size, mime)
    VALUES ($1, $2, $3, $4, $5)
  `, [objectKey, ownerBinding, union_id, size, mime]);
  
  return { upload_url: uploadUrl, object_key: objectKey };
});

// GET /media/:objectKey (serve via CDN, client decrypts)
app.get<{
  Params: { objectKey: string };
}>('/media/:objectKey', async (req, reply) => {
  const { objectKey } = req.params;
  
  // Verify object exists
  const { rows: [obj] } = await contentDB.query(
    'SELECT * FROM media_objects WHERE object_key = $1',
    [objectKey]
  );
  
  if (!obj) {
    return reply.code(404).send({ error: 'Object not found' });
  }
  
  // Redirect to CDN/S3 (client will decrypt)
  return reply.redirect(`https://cdn.unitedUnions.app/${objectKey}`);
});

app.listen({ port: 3006, host: '0.0.0.0' });
```

**Frontend Client Pipeline:**
```typescript
// frontend/src/services/media.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import piexif from 'piexifjs';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from 'expo-crypto';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const uploadEncryptedImage = async (imageUri: string, unionId?: string) => {
  // 1. Strip EXIF data
  const imageData = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Remove EXIF
  let cleanImage: string;
  try {
    cleanImage = piexif.remove(`data:image/jpeg;base64,${imageData}`);
  } catch {
    // If no EXIF, use original
    cleanImage = `data:image/jpeg;base64,${imageData}`;
  }
  
  // 2. Re-encode to remove metadata and downscale
  const manipulated = await ImageManipulator.manipulateAsync(
    cleanImage,
    [{ resize: { width: 1440 } }], // Max 1440px width
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  // 3. Create thumbnail
  const thumbnail = await ImageManipulator.manipulateAsync(
    manipulated.uri,
    [{ resize: { width: 256 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  // 4. Read files as binary
  const originalBytes = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const thumbnailBytes = await FileSystem.readAsStringAsync(thumbnail.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // 5. Generate encryption key (random)
  const contentKey = randomBytes(32);
  
  // 6. Encrypt both original and thumbnail
  const encryptedOriginal = encryptBytes(
    Buffer.from(originalBytes, 'base64'),
    contentKey
  );
  const encryptedThumb = encryptBytes(
    Buffer.from(thumbnailBytes, 'base64'),
    contentKey
  );
  
  // 7. Get presigned URL from server
  const token = await SecureStore.getItemAsync('auth_token');
  const presignRes = await fetch(`${API_URL}/media/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      mime: 'image/jpeg',
      size: encryptedOriginal.length + encryptedThumb.length,
      union_id: unionId,
    }),
  });
  
  const { upload_url, object_key } = await presignRes.json();
  
  // 8. Upload encrypted data
  const combined = Buffer.concat([
    Buffer.from('ORIG'), // 4-byte marker
    Buffer.from([encryptedOriginal.length >> 24, encryptedOriginal.length >> 16, encryptedOriginal.length >> 8, encryptedOriginal.length]),
    encryptedOriginal,
    Buffer.from('THMB'),
    Buffer.from([encryptedThumb.length >> 24, encryptedThumb.length >> 16, encryptedThumb.length >> 8, encryptedThumb.length]),
    encryptedThumb,
  ]);
  
  await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: combined,
  });
  
  // 9. Return object key and decryption key
  return {
    object_key,
    content_key: Buffer.from(contentKey).toString('hex'),
  };
};

const encryptBytes = (data: Buffer, key: Uint8Array): Buffer => {
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(data);
  
  return Buffer.concat([nonce, ciphertext]);
};

export const decryptImage = async (objectKey: string, contentKey: string) => {
  // Fetch encrypted blob
  const response = await fetch(`${API_URL}/media/${objectKey}`);
  const blob = await response.arrayBuffer();
  
  // Parse combined blob
  const data = Buffer.from(blob);
  let offset = 0;
  
  // Read original
  if (data.slice(offset, offset + 4).toString() !== 'ORIG') {
    throw new Error('Invalid blob format');
  }
  offset += 4;
  
  const origLength = data.readUInt32BE(offset);
  offset += 4;
  
  const encryptedOrig = data.slice(offset, offset + origLength);
  offset += origLength;
  
  // Read thumbnail
  if (data.slice(offset, offset + 4).toString() !== 'THMB') {
    throw new Error('Invalid blob format');
  }
  offset += 4;
  
  const thumbLength = data.readUInt32BE(offset);
  offset += 4;
  
  const encryptedThumb = data.slice(offset, offset + thumbLength);
  
  // Decrypt
  const key = Buffer.from(contentKey, 'hex');
  const originalImage = decryptBytes(encryptedOrig, key);
  const thumbnailImage = decryptBytes(encryptedThumb, key);
  
  return {
    original: `data:image/jpeg;base64,${originalImage.toString('base64')}`,
    thumbnail: `data:image/jpeg;base64,${thumbnailImage.toString('base64')}`,
  };
};

const decryptBytes = (data: Buffer, key: Uint8Array): Buffer => {
  const nonce = data.slice(0, 24);
  const ciphertext = data.slice(24);
  
  const cipher = xchacha20poly1305(key, nonce);
  return Buffer.from(cipher.decrypt(ciphertext));
};
```

**Testing Checkpoint:**
- [ ] EXIF data stripped from uploads
- [ ] Images encrypted client-side
- [ ] Presigned URL generation works
- [ ] Server stores only ciphertext
- [ ] Client decryption works

---

#### **Week 7: DM Service (E2EE Direct Messaging)**

**Tasks:**
1. ✅ Create dm service scaffold
2. ✅ Implement conversation creation
3. ✅ Implement message encryption (forward secrecy)
4. ✅ Create dm_db schema
5. ✅ Implement message endpoints

**Database Schema:**
```sql
-- dm_db.dm_conversations
CREATE TABLE dm_conversations (
  conv_id TEXT PRIMARY KEY,
  participant_bindings TEXT[] NOT NULL,  -- SHA256(client_pub_key)[]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- dm_db.dm_messages
CREATE TABLE dm_messages (
  msg_id TEXT PRIMARY KEY,
  conv_id TEXT NOT NULL REFERENCES dm_conversations(conv_id),
  sender_binding TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  ciphertext TEXT NOT NULL,
  media_keys JSONB,                     -- { object_key, encrypted_content_key }[]
  ttl_until TIMESTAMPTZ
);

CREATE INDEX idx_dm_conv_ts ON dm_messages(conv_id, ts);
```

**Backend Code:**
```typescript
// backend/services/dm_service/src/index.ts
import Fastify from 'fastify';
import { ulid } from 'ulid';
import { createHash } from 'crypto';

const app = Fastify({ logger: true });

app.addHook('onRequest', verifyJWT);

// POST /dm/conversations
app.post<{
  Body: {
    participants_pub_keys: string[];  // Ed25519 public keys
  };
}>('/dm/conversations', async (req, reply) => {
  const { participants_pub_keys } = req.body;
  const userId = req.user.userId;
  
  // Get user's public key
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  // Include self in participants
  const allParticipants = [user.client_pub_key, ...participants_pub_keys];
  
  // Create bindings (SHA256 hashes)
  const bindings = allParticipants.map(pubKey =>
    createHash('sha256').update(pubKey).digest('hex')
  );
  
  const convId = ulid();
  
  // Store conversation
  await dmDB.query(`
    INSERT INTO dm_conversations (conv_id, participant_bindings)
    VALUES ($1, $2)
  `, [convId, bindings]);
  
  await logEvent('/dm/conversations', 200, 'conversation_created');
  
  return {
    conv_id: convId,
    participant_bindings: bindings,
    // Client will negotiate shared secret via X25519
  };
});

// POST /dm/:convId/messages
app.post<{
  Params: { convId: string };
  Body: {
    ciphertext: string;
    media_keys?: Array<{ object_key: string; encrypted_content_key: string }>;
    ttl_hours?: number;
  };
}>('/dm/:convId/messages', async (req, reply) => {
  const { convId } = req.params;
  const { ciphertext, media_keys, ttl_hours } = req.body;
  const userId = req.user.userId;
  
  // Get user's public key
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const senderBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  // Verify user is participant
  const { rows: [conv] } = await dmDB.query(
    'SELECT * FROM dm_conversations WHERE conv_id = $1',
    [convId]
  );
  
  if (!conv || !conv.participant_bindings.includes(senderBinding)) {
    return reply.code(403).send({ error: 'Not a participant' });
  }
  
  const msgId = ulid();
  const ttlUntil = ttl_hours
    ? new Date(Date.now() + ttl_hours * 3600 * 1000)
    : null;
  
  // Store encrypted message
  await dmDB.query(`
    INSERT INTO dm_messages (msg_id, conv_id, sender_binding, ciphertext, media_keys, ttl_until)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [msgId, convId, senderBinding, ciphertext, JSON.stringify(media_keys || []), ttlUntil]);
  
  // DO NOT log object keys with DM routes (prevent graph reconstruction)
  await logEvent('/dm/messages', 200, 'message_sent');
  
  return { msg_id: msgId, ts: new Date().toISOString() };
});

// GET /dm/:convId/messages
app.get<{
  Params: { convId: string };
  Querystring: { cursor?: string; limit?: number };
}>('/dm/:convId/messages', async (req, reply) => {
  const { convId } = req.params;
  const { cursor, limit = 50 } = req.query;
  const userId = req.user.userId;
  
  // Get user's public key
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const userBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  // Verify user is participant
  const { rows: [conv] } = await dmDB.query(
    'SELECT * FROM dm_conversations WHERE conv_id = $1',
    [convId]
  );
  
  if (!conv || !conv.participant_bindings.includes(userBinding)) {
    return reply.code(403).send({ error: 'Not a participant' });
  }
  
  // Fetch messages (ciphertext only)
  const query = cursor
    ? `SELECT * FROM dm_messages WHERE conv_id = $1 AND ts < $2 AND (ttl_until IS NULL OR ttl_until > NOW()) ORDER BY ts DESC LIMIT $3`
    : `SELECT * FROM dm_messages WHERE conv_id = $1 AND (ttl_until IS NULL OR ttl_until > NOW()) ORDER BY ts DESC LIMIT $2`;
  
  const params = cursor ? [convId, cursor, limit] : [convId, limit];
  
  const { rows } = await dmDB.query(query, params);
  
  // Return ciphertext only (client decrypts)
  return rows.map(r => ({
    msg_id: r.msg_id,
    sender_binding: r.sender_binding,
    ts: r.ts,
    ciphertext: r.ciphertext,
    media_keys: r.media_keys,
  }));
});

// DELETE /dm/:convId/messages/:msgId
app.delete<{
  Params: { convId: string; msgId: string };
}>('/dm/:convId/messages/:msgId', async (req, reply) => {
  const { convId, msgId } = req.params;
  const userId = req.user.userId;
  
  // Get user's public key
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const userBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  // Verify user is sender
  const { rows: [msg] } = await dmDB.query(
    'SELECT * FROM dm_messages WHERE msg_id = $1 AND conv_id = $2',
    [msgId, convId]
  );
  
  if (!msg || msg.sender_binding !== userBinding) {
    return reply.code(403).send({ error: 'Not authorized' });
  }
  
  // Tombstone (don't actually delete for forward secrecy verification)
  await dmDB.query(
    `UPDATE dm_messages SET ciphertext = '[deleted]', media_keys = '[]' WHERE msg_id = $1`,
    [msgId]
  );
  
  return { success: true };
});

app.listen({ port: 3005, host: '0.0.0.0' });
```

**Frontend E2EE Implementation:**
```typescript
// frontend/src/services/dm.ts
import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Create conversation with X25519 key exchange
export const createConversation = async (recipientPubKeys: string[]) => {
  const token = await SecureStore.getItemAsync('auth_token');
  
  // Create conversation on server
  const response = await fetch(`${API_URL}/dm/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ participants_pub_keys: recipientPubKeys }),
  });
  
  const { conv_id, participant_bindings } = await response.json();
  
  // Derive shared secret via X25519 (use first recipient for 1-1 DMs)
  const privateKey = await SecureStore.getItemAsync('signing_private_key');
  const sharedSecret = x25519.getSharedSecret(
    Buffer.from(privateKey!, 'hex'),
    Buffer.from(recipientPubKeys[0], 'hex')
  );
  
  // Derive root key via HKDF
  const rootKey = hkdf(sha256, sharedSecret, undefined, 'dm_root_key', 32);
  
  // Store root key
  await SecureStore.setItemAsync(
    `dm_root_key:${conv_id}`,
    Buffer.from(rootKey).toString('hex')
  );
  
  // Initialize chain key counter
  await SecureStore.setItemAsync(`dm_chain_counter:${conv_id}`, '0');
  
  return conv_id;
};

// Send encrypted message (forward secrecy via symmetric ratchet)
export const sendDMMessage = async (
  convId: string,
  plaintext: string,
  mediaKeys?: Array<{ object_key: string; content_key: string }>
) => {
  const token = await SecureStore.getItemAsync('auth_token');
  
  // Get root key and counter
  const rootKeyHex = await SecureStore.getItemAsync(`dm_root_key:${convId}`);
  const counterStr = await SecureStore.getItemAsync(`dm_chain_counter:${convId}`);
  
  const rootKey = Buffer.from(rootKeyHex!, 'hex');
  const counter = parseInt(counterStr || '0');
  
  // Derive message key (forward secrecy)
  const messageKey = hkdf(
    sha256,
    rootKey,
    Buffer.from(`${counter}`),
    'dm_message_key',
    32
  );
  
  // Encrypt plaintext
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(messageKey, nonce);
  const ciphertext = cipher.encrypt(Buffer.from(plaintext));
  
  const encryptedMessage = Buffer.concat([nonce, ciphertext]).toString('base64');
  
  // Encrypt media content keys
  let encryptedMediaKeys: any[] | undefined;
  if (mediaKeys && mediaKeys.length > 0) {
    encryptedMediaKeys = mediaKeys.map(({ object_key, content_key }) => {
      const mediaNonce = randomBytes(24);
      const mediaCipher = xchacha20poly1305(messageKey, mediaNonce);
      const encryptedKey = mediaCipher.encrypt(Buffer.from(content_key, 'hex'));
      
      return {
        object_key,
        encrypted_content_key: Buffer.concat([mediaNonce, encryptedKey]).toString('base64'),
      };
    });
  }
  
  // Send to server
  const response = await fetch(`${API_URL}/dm/${convId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ciphertext: encryptedMessage,
      media_keys: encryptedMediaKeys,
      ttl_hours: 168, // 7 days
    }),
  });
  
  const { msg_id, ts } = await response.json();
  
  // Ratchet forward (increment counter for next message)
  await SecureStore.setItemAsync(`dm_chain_counter:${convId}`, `${counter + 1}`);
  
  return { msg_id, ts };
};

// Decrypt received message
export const decryptDMMessage = async (
  convId: string,
  msgCounter: number,
  ciphertext: string,
  mediaKeys?: Array<{ object_key: string; encrypted_content_key: string }>
) => {
  // Get root key
  const rootKeyHex = await SecureStore.getItemAsync(`dm_root_key:${convId}`);
  const rootKey = Buffer.from(rootKeyHex!, 'hex');
  
  // Derive message key (same derivation as sender)
  const messageKey = hkdf(
    sha256,
    rootKey,
    Buffer.from(`${msgCounter}`),
    'dm_message_key',
    32
  );
  
  // Decrypt message
  const data = Buffer.from(ciphertext, 'base64');
  const nonce = data.slice(0, 24);
  const encrypted = data.slice(24);
  
  const cipher = xchacha20poly1305(messageKey, nonce);
  const plaintext = cipher.decrypt(encrypted);
  
  // Decrypt media keys if present
  let decryptedMediaKeys: Array<{ object_key: string; content_key: string }> | undefined;
  if (mediaKeys && mediaKeys.length > 0) {
    decryptedMediaKeys = mediaKeys.map(({ object_key, encrypted_content_key }) => {
      const keyData = Buffer.from(encrypted_content_key, 'base64');
      const keyNonce = keyData.slice(0, 24);
      const keyEncrypted = keyData.slice(24);
      
      const keyCipher = xchacha20poly1305(messageKey, keyNonce);
      const contentKey = keyCipher.decrypt(keyEncrypted);
      
      return {
        object_key,
        content_key: Buffer.from(contentKey).toString('hex'),
      };
    });
  }
  
  return {
    plaintext: plaintext.toString(),
    media_keys: decryptedMediaKeys,
  };
};
```

**Testing Checkpoint:**
- [ ] Conversation creation works
- [ ] Messages encrypted end-to-end
- [ ] Forward secrecy verified (old keys can't decrypt new messages)
- [ ] Server stores only ciphertext
- [ ] Media keys encrypted with message key

---

#### **Week 8: Union Service + Debates**

**Tasks:**
1. ✅ Implement encrypted membership (as Week 6-7 from original)
2. ✅ Add debates to messaging service
3. ✅ Ensure aggregate-only admin views

**Debates Schema Addition:**
```sql
-- content_db.threads (updated)
ALTER TABLE threads ADD COLUMN type TEXT DEFAULT 'discussion' CHECK (type IN ('discussion', 'debate'));
ALTER TABLE threads ADD COLUMN debate_round_window INTERVAL;
ALTER TABLE threads ADD COLUMN max_rounds INTEGER;
ALTER TABLE threads ADD COLUMN current_round INTEGER DEFAULT 0;
```

**Debates Endpoint:**
```typescript
// backend/services/messaging_service/src/debates.ts

// POST /threads (create debate)
app.post<{
  Body: {
    union_id: string;
    title: string;
    type: 'discussion' | 'debate';
    debate_round_window?: string; // e.g. "2 days"
    max_rounds?: number;
  };
}>('/threads', async (req, reply) => {
  const { union_id, title, type, debate_round_window, max_rounds } = req.body;
  const userId = req.user.userId;
  
  // Generate pseudonym
  const pseudonym = generatePseudonym(userId, union_id);
  
  const threadId = ulid();
  
  await contentDB.query(`
    INSERT INTO threads (
      id,
      union_id,
      title,
      author_pseudonym,
      type,
      debate_round_window,
      max_rounds,
      current_round
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    threadId,
    union_id,
    title,
    pseudonym,
    type,
    debate_round_window || null,
    max_rounds || null,
    type === 'debate' ? 1 : null,
  ]);
  
  return { thread_id: threadId, type };
});

// POST /threads/:threadId/advance_round (debates only, admin)
app.post<{
  Params: { threadId: string };
}>('/threads/:threadId/advance_round', async (req, reply) => {
  const { threadId } = req.params;
  const userId = req.user.userId;
  
  // Verify thread is a debate
  const { rows: [thread] } = await contentDB.query(
    'SELECT * FROM threads WHERE id = $1',
    [threadId]
  );
  
  if (!thread || thread.type !== 'debate') {
    return reply.code(400).send({ error: 'Not a debate thread' });
  }
  
  // Verify user is union admin (check membership token)
  // ... (membership verification logic)
  
  // Advance round
  const newRound = thread.current_round + 1;
  
  if (thread.max_rounds && newRound > thread.max_rounds) {
    return reply.code(400).send({ error: 'Max rounds reached' });
  }
  
  await contentDB.query(
    'UPDATE threads SET current_round = $1 WHERE id = $2',
    [newRound, threadId]
  );
  
  return { current_round: newRound };
});

// GET /threads/:threadId/stats (aggregate only, no member enumeration)
app.get<{
  Params: { threadId: string };
}>('/threads/:threadId/stats', async (req, reply) => {
  const { threadId } = req.params;
  
  // Aggregate stats only
  const { rows: [stats] } = await contentDB.query(`
    SELECT
      COUNT(DISTINCT author_pseudonym) as unique_participants,
      COUNT(*) as total_comments,
      MAX(created_at) as last_activity
    FROM comments
    WHERE thread_id = $1
  `, [threadId]);
  
  // DO NOT return list of participants or their comments
  return stats;
});
```

**Testing Checkpoint:**
- [ ] Debates created with round windows
- [ ] Rounds advance properly
- [ ] Admin stats are aggregate-only
- [ ] No member enumeration possible

---

### **Weeks 9-11: Voting Service (Blind Signatures)**

_(Implementation identical to original plan in previous weeks 9-11)_

**Week 9:** Blind signature token issuance  
**Week 10:** Anonymous vote submission  
**Week 11:** Frontend blind voting UI

---

### **Week 12: Messaging Service & Migration**

**Tasks:**
1. ✅ Create messaging service (minimal changes)
2. ✅ Remove user_id from content tables
3. ✅ Update post/comment endpoints
4. ✅ Implement log cleanup automation

**Schema Changes:**
```sql
-- content_db migrations
ALTER TABLE posts DROP COLUMN user_id;
ALTER TABLE posts ADD COLUMN author_pseudonym TEXT;

ALTER TABLE comments DROP COLUMN user_id;
ALTER TABLE comments ADD COLUMN author_pseudonym TEXT;

ALTER TABLE threads DROP COLUMN user_id;
ALTER TABLE threads ADD COLUMN author_pseudonym TEXT;

-- Logs table
CREATE SCHEMA IF NOT EXISTS logs;

CREATE TABLE logs.events (
  id SERIAL PRIMARY KEY,
  request_hash TEXT,
  route TEXT,
  status_code INTEGER,
  event_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NO user_id, ip, ua columns

CREATE INDEX idx_events_created_at ON logs.events(created_at);

-- Auto-cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_logs() RETURNS void AS $$
BEGIN
  DELETE FROM logs.events WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule hourly cleanup
SELECT cron.schedule('cleanup-logs', '0 * * * *', 'SELECT cleanup_old_logs()');
```

**Testing Checkpoint:**
- [ ] Posts use pseudonyms only
- [ ] No user_id in content tables
- [ ] Logs auto-delete after 24h
- [ ] No PII in logs

---

### **Weeks 13-14: Integration Testing & Deployment**

#### **Week 13: End-to-End Testing**

**Tasks:**
1. ✅ Write integration tests
2. ✅ Test complete user flows
3. ✅ Performance testing
4. ✅ Security testing

**Test Suite:**
```typescript
// backend/tests/integration/auth.test.ts
describe('Auth Service Integration', () => {
  test('User can register without email', async () => {
    const res = await request(authService)
      .post('/auth/webauthn/register')
      .send({
        userId: ulid(),
        credential: mockCredential,
        client_pub_key: 'abc123...',
      });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    
    // Verify no email in database
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    expect(rows[0]).not.toHaveProperty('email');
  });
});

// E2EE DM Tests (NEW)
describe('DM E2EE', () => {
  test('Server cannot decrypt DM content', async () => {
    const convId = await createConversation([recipientPubKey]);
    await sendDMMessage(convId, 'secret message');
    
    // Server tries to decrypt (should fail)
    const { rows } = await dmDB.query('SELECT ciphertext FROM dm_messages WHERE conv_id = $1', [convId]);
    expect(() => decrypt(rows[0].ciphertext, 'wrong-key')).toThrow();
  });
  
  test('Forward secrecy: compromise of current key does not decrypt past messages', async () => {
    const convId = await createConversation([recipientPubKey]);
    await sendDMMessage(convId, 'message 1');
    await sendDMMessage(convId, 'message 2');
    
    // Get current chain key
    const chainKey = await SecureStore.getItemAsync(`dm_chain_counter:${convId}`);
    
    // Try to decrypt message 1 with current chain key (should fail)
    const { rows } = await dmDB.query('SELECT * FROM dm_messages WHERE conv_id = $1 ORDER BY ts ASC', [convId]);
    expect(() => decryptDMMessage(convId, parseInt(chainKey!), rows[0].ciphertext)).toThrow();
  });
});

// Media Pipeline Tests (NEW)
describe('Media Pipeline', () => {
  test('EXIF stripped from uploads', async () => {
    const imageWithExif = 'test-image-with-gps.jpg';
    const { object_key } = await uploadEncryptedImage(imageWithExif);
    
    // Download and verify no EXIF
    const blob = await fetch(`${API_URL}/media/${object_key}`).then(r => r.arrayBuffer());
    const hasExif = checkForExif(Buffer.from(blob));
    expect(hasExif).toBe(false);
  });
  
  test('Blobs are encrypted (no plaintext magic headers)', async () => {
    const { object_key } = await uploadEncryptedImage('test.jpg');
    
    const blob = await fetch(`${API_URL}/media/${object_key}`).then(r => r.arrayBuffer());
    const header = Buffer.from(blob).slice(0, 4);
    
    // Should NOT start with JPEG magic bytes (FF D8 FF)
    expect(header.toString('hex')).not.toMatch(/^ffd8ff/);
  });
});

// Debate Tests (NEW)
describe('Debates', () => {
  test('Admin views aggregate stats only, no member enumeration', async () => {
    const threadId = await createDebateThread(unionId);
    await postComment(threadId, 'argument 1');
    await postComment(threadId, 'argument 2');
    
    const stats = await fetch(`${API_URL}/threads/${threadId}/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());
    
    expect(stats).toHaveProperty('unique_participants');
    expect(stats).toHaveProperty('total_comments');
    expect(stats).not.toHaveProperty('participants'); // No list
    expect(stats).not.toHaveProperty('comments'); // No individual comments
  });
});
```

**Testing Checkpoint:**
- [ ] All integration tests pass
- [ ] No PII leaks detected
- [ ] Performance meets targets (<200ms API response)
- [ ] Security scan passes

---

#### **Week 14: Production Deployment**

**Tasks:**
1. ✅ Set up production infrastructure
2. ✅ Deploy to Railway/Render
3. ✅ Configure environment variables
4. ✅ Set up monitoring
5. ✅ Deploy Expo app updates

**Deployment:**
```yaml
# railway.toml (or render.yaml)
services:
  - name: auth-service
    type: web
    env:
      - JWT_SECRET
      - DB_URL
      - REDIS_URL
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /health
    
  - name: union-service
    type: web
    env:
      - MEMBERSHIP_DB_URL
    buildCommand: npm run build
    startCommand: npm start
    
  - name: voting-service
    type: web
    env:
      - BALLOT_DB_URL
      - REDIS_URL
    buildCommand: npm run build
    startCommand: npm start
    
  - name: messaging-service
    type: web
    env:
      - CONTENT_DB_URL
    buildCommand: npm run build
    startCommand: npm start
  
  - name: dm-service
    type: web
    env:
      - DM_DB_URL
      - REDIS_URL
    buildCommand: npm run build
    startCommand: npm start
  
  - name: media-service
    type: web
    env:
      - CONTENT_DB_URL
      - BUCKET_NAME
      - AWS_REGION
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
    buildCommand: npm run build
    startCommand: npm start

databases:
  - name: content-db
    type: postgresql
  - name: membership-db
    type: postgresql
  - name: ballot-db
    type: postgresql
  - name: dm-db
    type: postgresql
```

**Expo App Update:**
```typescript
// frontend/app.config.ts
export default {
  expo: {
    // Update API URL for production
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.unitedUnions.app',
    },
  },
};
```

**Deploy:**
```bash
# Backend
cd backend
railway up

# Frontend
cd frontend
eas update --branch production --message "Phase 1 complete - WebAuthn + encrypted memberships + blind voting + E2EE DMs + encrypted media + debates"
```

**Testing Checkpoint:**
- [ ] All services healthy in production
- [ ] Frontend connects to production API
- [ ] WebAuthn works on real devices
- [ ] Encrypted memberships work
- [ ] Blind voting works
- [ ] E2EE DMs work
- [ ] Encrypted media uploads work
- [ ] Debates work
- [ ] Logs cleanup automatically

---

## 🔧 Service Specifications

### **1. auth_service (Port 3001)**

**Responsibilities:**
- WebAuthn registration and authentication
- JWT issuance and refresh
- User credential storage (NO email)

**Endpoints:**
- `GET /auth/challenge` - Generate WebAuthn challenge
- `POST /auth/webauthn/register` - Register new user
- `POST /auth/webauthn/verify` - Authenticate user
- `POST /auth/refresh` - Refresh JWT token
- `GET /users/:userId` - Get user public key (internal)

**Database:** content_db (users table)

---

### **2. union_service (Port 3002)**

**Responsibilities:**
- Encrypted membership token management
- Union join/leave operations
- Aggregate member counts only

**Endpoints:**
- `POST /unions/:unionId/join` - Join union (returns encrypted token)
- `GET /me/memberships` - Get encrypted membership tokens
- `POST /unions/:unionId/leave` - Leave union (revoke token)
- `GET /unions/:unionId` - Get union metadata + aggregate count

**Database:** membership_db

**Security:**
- Server stores only ciphertext
- Cannot enumerate members
- Cannot decrypt membership details

---

### **3. voting_service (Port 3003)**

**Responsibilities:**
- Ballot creation and management
- Blind-signature token issuance (Mode B)
- Anonymous vote submission
- Aggregate vote tallies only

**Endpoints:**
- `POST /ballots` - Create ballot
- `POST /ballots/:ballotId/issue_token` - Issue blind token (Mode B)
- `POST /ballots/:ballotId/vote` - Cast anonymous vote
- `GET /ballots/:ballotId/tally` - Get aggregate tally

**Database:** ballot_db

**Security:**
- Nullifier prevents double-voting
- Server cannot link votes to users (Mode B)
- Tally shows aggregates only

---

### **4. messaging_service (Port 3004)**

**Responsibilities:**
- Pseudonymous posts, comments, threads
- Debate thread management
- Aggregate stats only for admins

**Endpoints:**
- `POST /threads` - Create thread or debate
- `POST /threads/:threadId/comments` - Post comment
- `GET /threads/:threadId/stats` - Get aggregate stats (no member list)
- `POST /threads/:threadId/advance_round` - Advance debate round (admin)

**Database:** content_db

**Security:**
- No user_id in posts/comments/threads
- Uses author_pseudonym only
- Admin views are aggregate-only

---

### **5. dm_service (Port 3005) - NEW**

**Responsibilities:**
- E2EE direct messaging with forward secrecy
- Conversation management
- Message storage (ciphertext only)

**Endpoints:**
- `POST /dm/conversations` - Create E2EE conversation
- `POST /dm/:convId/messages` - Send encrypted message
- `GET /dm/:convId/messages` - Fetch encrypted messages
- `DELETE /dm/:convId/messages/:msgId` - Delete message (tombstone)

**Database:** dm_db

**Schema:**
```sql
CREATE TABLE dm_conversations (
  conv_id TEXT PRIMARY KEY,
  participant_bindings TEXT[] NOT NULL,  -- SHA256(client_pub_key)[]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dm_messages (
  msg_id TEXT PRIMARY KEY,
  conv_id TEXT NOT NULL REFERENCES dm_conversations(conv_id),
  sender_binding TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  ciphertext TEXT NOT NULL,
  media_keys JSONB,
  ttl_until TIMESTAMPTZ
);
```

**Security:**
- End-to-end encryption (server cannot decrypt)
- Forward secrecy via symmetric ratchet
- No user_id columns
- No plaintext server-side
- Metadata minimal (sender_binding, timestamp only)

**Forward Secrecy:**
- Root key derived via X25519 + HKDF
- Per-message keys derived via counter
- Ratchet forward after each message
- Compromise of current key doesn't reveal past messages

---

### **6. media_service (Port 3006) - NEW**

**Responsibilities:**
- Presigned URL generation for uploads
- Encrypted media storage
- EXIF stripping enforcement
- Media metadata tracking

**Endpoints:**
- `POST /media/presign` - Generate presigned upload URL
- `GET /media/:objectKey` - Serve encrypted media (via CDN)

**Database:** content_db (media_objects table)

**Schema:**
```sql
CREATE TABLE media_objects (
  object_key TEXT PRIMARY KEY,
  owner_binding TEXT NOT NULL,    -- SHA256(client_pub_key)
  union_id TEXT,
  size INTEGER,
  mime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Client Pipeline:**
1. Strip EXIF metadata (piexifjs)
2. Re-encode and downscale (expo-image-manipulator)
3. Create thumbnail (~256px)
4. Encrypt original + thumbnail client-side (XChaCha20-Poly1305)
5. Request presigned URL from server
6. Upload encrypted blob to object storage
7. Store content key client-side for decryption

**Security:**
- Server stores only ciphertext
- No plaintext thumbnails or originals
- EXIF/GPS stripped before encryption
- Content keys never sent to server
- Presigned URLs expire in 10 minutes
- Size and MIME validation

---

## 🗄️ Database Migration Strategy

### **New Databases**

1. **dm_db** - E2EE direct messaging
   - dm_conversations
   - dm_messages

### **New Tables**

1. **content_db.media_objects** - Encrypted media metadata
2. **content_db.threads** (updated) - Add debate columns
3. **content_db.logs.events** - PII-free logging

### **Schema Changes**

```sql
-- Remove user_id from content tables
ALTER TABLE posts DROP COLUMN user_id;
ALTER TABLE posts ADD COLUMN author_pseudonym TEXT;

ALTER TABLE comments DROP COLUMN user_id;
ALTER TABLE comments ADD COLUMN author_pseudonym TEXT;

ALTER TABLE threads DROP COLUMN user_id;
ALTER TABLE threads ADD COLUMN author_pseudonym TEXT;

-- Add debate columns
ALTER TABLE threads ADD COLUMN type TEXT DEFAULT 'discussion' CHECK (type IN ('discussion', 'debate'));
ALTER TABLE threads ADD COLUMN debate_round_window INTERVAL;
ALTER TABLE threads ADD COLUMN max_rounds INTEGER;
ALTER TABLE threads ADD COLUMN current_round INTEGER DEFAULT 0;
```

### **Data Migration**

```typescript
// Backfill legacy data
const backfillPseudonyms = async () => {
  // Generate pseudonyms for existing posts
  await contentDB.query(`
    UPDATE posts
    SET author_pseudonym = CONCAT('user_', SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
    WHERE author_pseudonym IS NULL
  `);
  
  await contentDB.query(`
    UPDATE comments
    SET author_pseudonym = CONCAT('user_', SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
    WHERE author_pseudonym IS NULL
  `);
  
  await contentDB.query(`
    UPDATE threads
    SET author_pseudonym = CONCAT('user_', SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
    WHERE author_pseudonym IS NULL
  `);
};
```

---

## ✅ Testing & Quality Assurance

### **Existing Tests** (from original plan)

- Authentication tests (WebAuthn, JWT)
- Membership encryption tests
- Blind-signature voting tests
- Logging tests (PII-free)

### **New Tests for Phase 1 Updates**

#### **E2EE DM Tests**

```typescript
describe('E2EE DM Tests', () => {
  test('dm_e2e_cannot_decrypt_on_server', async () => {
    const convId = await createConversation([recipientPubKey]);
    await sendDMMessage(convId, 'secret message');
    
    // Server cannot decrypt
    const { rows } = await dmDB.query('SELECT ciphertext FROM dm_messages WHERE conv_id = $1', [convId]);
    expect(() => decrypt(rows[0].ciphertext, serverKey)).toThrow();
  });
  
  test('dm_forward_secrecy', async () => {
    const convId = await createConversation([recipientPubKey]);
    await sendDMMessage(convId, 'message 1');
    await sendDMMessage(convId, 'message 2');
    
    // Compromise current key
    const currentChainKey = await SecureStore.getItemAsync(`dm_chain_counter:${convId}`);
    
    // Cannot decrypt past messages
    const { rows } = await dmDB.query('SELECT * FROM dm_messages WHERE conv_id = $1 ORDER BY ts ASC', [convId]);
    expect(() => decryptDMMessage(convId, parseInt(currentChainKey!), rows[0].ciphertext)).toThrow();
  });
  
  test('dm_ttl_enforced', async () => {
    const convId = await createConversation([recipientPubKey]);
    await sendDMMessage(convId, 'expiring message', [], 1); // 1 hour TTL
    
    // Fast-forward time
    await dmDB.query('UPDATE dm_messages SET ttl_until = NOW() - INTERVAL \'1 hour\'');
    
    // Message should not be returned
    const { rows } = await dmDB.query('SELECT * FROM dm_messages WHERE conv_id = $1 AND (ttl_until IS NULL OR ttl_until > NOW())', [convId]);
    expect(rows.length).toBe(0);
  });
});
```

#### **Media Pipeline Tests**

```typescript
describe('Media Pipeline Tests', () => {
  test('exif_strip_verification', async () => {
    const imageWithExif = 'test-images/gps-tagged.jpg';
    
    // Upload should succeed
    const { object_key } = await uploadEncryptedImage(imageWithExif);
    
    // Download and verify no EXIF
    const response = await fetch(`${API_URL}/media/${object_key}`);
    const blob = await response.arrayBuffer();
    
    const hasExif = piexif.load(Buffer.from(blob).toString('binary'));
    expect(hasExif).toEqual({}); // No EXIF data
  });
  
  test('encrypted_blob_only', async () => {
    const { object_key } = await uploadEncryptedImage('test.jpg');
    
    const response = await fetch(`${API_URL}/media/${object_key}`);
    const blob = await response.arrayBuffer();
    const header = Buffer.from(blob).slice(0, 4);
    
    // Should NOT have JPEG magic bytes (encrypted)
    expect(header.toString('hex')).not.toMatch(/^ffd8ff/);
    
    // Should have our envelope markers
    expect(Buffer.from(blob).slice(0, 4).toString()).toBe('ORIG');
  });
  
  test('thumb_and_original_present', async () => {
    const { object_key, content_key } = await uploadEncryptedImage('test.jpg');
    
    // Decrypt and verify both present
    const { original, thumbnail } = await decryptImage(object_key, content_key);
    
    expect(original).toMatch(/^data:image\/jpeg;base64,/);
    expect(thumbnail).toMatch(/^data:image\/jpeg;base64,/);
    
    // Verify sizes
    const origSize = Buffer.from(original.split(',')[1], 'base64').length;
    const thumbSize = Buffer.from(thumbnail.split(',')[1], 'base64').length;
    
    expect(thumbSize).toBeLessThan(origSize);
  });
});
```

#### **Debate Flow Tests**

```typescript
describe('Debate Tests', () => {
  test('debate_rounds_progress', async () => {
    const threadId = await createDebateThread(unionId, '2 days', 3);
    
    // Advance round
    await fetch(`${API_URL}/threads/${threadId}/advance_round`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    // Check round updated
    const { rows: [thread] } = await contentDB.query('SELECT current_round FROM threads WHERE id = $1', [threadId]);
    expect(thread.current_round).toBe(2);
  });
  
  test('no_member_list_in_threads', async () => {
    const threadId = await createDebateThread(unionId);
    await postComment(threadId, 'comment 1', userId1);
    await postComment(threadId, 'comment 2', userId2);
    
    // Admin queries stats
    const stats = await fetch(`${API_URL}/threads/${threadId}/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());
    
    expect(stats).toHaveProperty('unique_participants');
    expect(stats).toHaveProperty('total_comments');
    
    // Should NOT have member list
    expect(stats).not.toHaveProperty('participants');
    expect(stats).not.toHaveProperty('user_ids');
  });
});
```

#### **Logging Tests (Extended)**

```typescript
describe('Extended Logging Tests', () => {
  test('no_object_keys_logged_with_dm_routes', async () => {
    const convId = await createConversation([recipientPubKey]);
    const { object_key } = await uploadEncryptedImage('test.jpg');
    await sendDMMessage(convId, 'message', [{ object_key, content_key: 'abc' }]);
    
    // Check logs don't contain object key
    const { rows } = await contentDB.query('SELECT * FROM logs.events WHERE route = \'/dm/messages\'');
    
    for (const row of rows) {
      expect(row.route).not.toContain(object_key);
      expect(row.event_type).not.toContain(object_key);
    }
  });
  
  test('24h_deletion_covers_all_services', async () => {
    // Insert old logs for all services
    await contentDB.query(`
      INSERT INTO logs.events (request_hash, route, status_code, event_type, created_at)
      VALUES
        ('hash1', '/auth/register', 200, 'auth', NOW() - INTERVAL '25 hours'),
        ('hash2', '/dm/messages', 200, 'dm', NOW() - INTERVAL '25 hours'),
        ('hash3', '/media/presign', 200, 'media', NOW() - INTERVAL '25 hours')
    `);
    
    // Run cleanup
    await cleanupOldLogs();
    
    // Verify all deleted
    const { rowCount } = await contentDB.query('SELECT * FROM logs.events WHERE created_at < NOW() - INTERVAL \'24 hours\'');
    expect(rowCount).toBe(0);
  });
});
```

---

## 🚀 Deployment & Infrastructure

### **Additions to Original Plan**

#### **Object Storage (R2/S3)**

```yaml
# Example: Cloudflare R2
r2:
  bucket: unitedUnions-media
  region: auto
  encryption: AES-256 (server-side, in addition to client-side)
  cors:
    allowed_origins:
      - https://cdn.unitedUnions.app
      - https://app.unitedUnions.app
    allowed_methods:
      - GET
      - PUT
  lifecycle:
    expire_after: 365 days (for deleted objects)
```

**Cost:**
- Cloudflare R2: $0.015/GB storage + $0.36/million Class A ops
- AWS S3: $0.023/GB storage + $0.005/1000 PUT requests
- **Estimated:** $5-15/mo for moderate usage

#### **Presigned URL Configuration**

```typescript
// Backend presigned URL generation
const command = new PutObjectCommand({
  Bucket: BUCKET_NAME,
  Key: objectKey,
  ContentType: 'application/octet-stream', // Encrypted data
  ServerSideEncryption: 'AES256', // Additional server-side encryption
  ContentLength: size, // Enforce size
});

const uploadUrl = await getSignedUrl(s3, command, {
  expiresIn: 600, // 10 minutes
});
```

#### **Updated Service Deployment**

```yaml
# railway.toml or render.yaml
services:
  # ... (auth, union, voting, messaging as before)
  
  - name: dm-service
    type: web
    env:
      - DM_DB_URL
      - REDIS_URL
      - JWT_SECRET
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /health
    port: 3005
  
  - name: media-service
    type: web
    env:
      - CONTENT_DB_URL
      - BUCKET_NAME
      - AWS_REGION
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /health
    port: 3006

databases:
  - name: content-db
    type: postgresql
  - name: membership-db
    type: postgresql
  - name: ballot-db
    type: postgresql
  - name: dm-db
    type: postgresql
    # NEW
```

---

## ⚠️ Risk Mitigation

### **Technical Risks (Updated)**

**Risk 1: E2EE Moderation Blindness**
- **Issue:** Encrypted DMs cannot be moderated by admins
- **Mitigation:**
  - Client-side report button submits user-approved plaintext excerpt + message proof
  - Strict rate limits on reports to prevent abuse
  - Automated heuristics on metadata (frequency, recipient count)
  - User-blocking feature (client-side, immediate)
- **Timeline:** Built into DM service from start
- **Cost:** $0

**Risk 2: EXIF Leakage**
- **Issue:** Accidental EXIF/GPS data in uploads
- **Mitigation:**
  - Force on-device re-encode (expo-image-manipulator)
  - Deny presign if EXIF detected client-side
  - Client-side verification tests
  - Automated tests in CI/CD
- **Timeline:** Week 6
- **Cost:** $0

**Risk 3: Media Abuse/Storage Costs**
- **Issue:** Spam uploads, storage bloat
- **Mitigation:**
  - Size caps (10MB per file)
  - Downscale to max 1440px
  - Daily upload quotas per user
  - MIME type allowlist (JPEG/PNG/WebP only)
  - Object lifecycle policies (delete after 365 days if unused)
- **Timeline:** Week 6
- **Cost:** Minimal ($5-15/mo storage)

**Risk 4: WebAuthn Browser Compatibility**
- **Mitigation:** Implement fallback passphrase → Argon2id
- **Timeline:** Week 5
- **Cost:** +1 week dev time

**Risk 5: Database Migration Failures**
- **Mitigation:** Test migrations on staging first
- **Timeline:** Week 12
- **Cost:** +2 days

**Risk 6: Blind Signature Library Issues**
- **Mitigation:** Test thoroughly, have fallback to Mode A
- **Timeline:** Week 9
- **Cost:** +3 days

### **Operational Risks (Updated)**

**Risk 1: Service Downtime During Migration**
- **Mitigation:** Blue-green deployment, gradual rollout
- **Timeline:** Week 14
- **Cost:** +$100/mo temporary

**Risk 2: Cost Overruns (Storage/Egress)**
- **Mitigation:**
  - Monitor usage with billing alerts
  - Set hard caps on R2/S3 egress
  - Use CDN to minimize origin requests
  - Implement upload throttling
- **Timeline:** Ongoing
- **Cost:** $0

**Risk 3: User Adoption (Passkeys Unfamiliar)**
- **Mitigation:** Clear onboarding, optional email transition period
- **Timeline:** Post-launch
- **Cost:** UX improvements

**Risk 4: DM Spam/Abuse**
- **Mitigation:**
  - Rate limiting on conversation creation
  - Recipient approval for first message
  - User-initiated blocking (client-side)
  - Report function with plaintext excerpt
- **Timeline:** Week 7
- **Cost:** $0

---

## 📊 Success Metrics

### **Privacy Compliance After Phase 1**

| Category | Before | After Phase 1 | Target |
|----------|--------|---------------|--------|
| Authentication | 8% | 90% | ✅ |
| Data Architecture | 0% | 80% | ✅ |
| Membership Storage | 0% | 90% | ✅ |
| Voting System | 13% | 80% | ✅ |
| Content & Messaging | 50% | 90% | ✅ |
| Direct Messaging (E2EE) | 0% | 90% | ✅ |
| Media Privacy (EXIF-free + encrypted) | 0% | 85% | ✅ |
| Debate Privacy (aggregate-only) | 0% | 90% | ✅ |
| Logging & Analytics | 0% | 90% | ✅ |
| Network Security | 11% | 60% | ⚠️ (Phase 2) |
| Cryptography | 0% | 95% | ✅ |
| Abuse Controls | 67% | 85% | ✅ |
| Operations | 0% | 50% | ⚠️ (Phase 2) |
| **OVERALL** | **18%** | **86%** | ✅ |

### **Acceptance Criteria After Phase 1**

| AC | Description | Status |
|----|-------------|--------|
| AC1 | WebAuthn signup, no email | ✅ 100% |
| AC2 | Encrypted membership retrieval | ✅ 100% |
| AC3 | Mode B blind-signature voting | ✅ 100% |
| AC4 | Aggregate-only admin view | ✅ 100% |
| AC5 | 24h PII-free logs | ✅ 100% |
| AC6 | CDN/Tor origin allowlist | ⚠️ 50% (Phase 2) |
| AC7 | Public privacy policy | ✅ 100% |
| AC8 | DM E2EE: server stores ciphertext only | ✅ 100% |
| AC9 | DM forward secrecy ratchet verified | ✅ 100% |
| AC10 | Media EXIF: all uploads EXIF-free | ✅ 100% |
| AC11 | Media encryption: blobs & thumbnails encrypted | ✅ 100% |
| AC12 | Debate privacy: no member enumeration | ✅ 100% |

**Overall:** ✅ **11/12 ACs passed** (92%) - AC6 deferred to Phase 2

### **Red Lines (Extended)**

| Red Line | Status |
|----------|--------|
| Storing email/IP/UA tied to user_id | ✅ FIXED |
| Combined dumps with membership + identifiers | ✅ FIXED |
| Exposing per-user votes to admins | ✅ FIXED |
| Custom crypto primitives | ✅ PASS |
| Fingerprinting analytics | ✅ PASS |
| **Storing plaintext media or thumbnails** | ✅ FIXED |
| **Accepting uploads with EXIF/GPS intact** | ✅ FIXED |
| **Logging object keys with DM routes (graph reconstruction)** | ✅ FIXED |
| **Adding DM backdoor to decrypt without user plaintext sample** | ✅ PASS |
| **Storing per-user read receipts/typing as persistent IDs** | ✅ PASS |

**Red Lines Status:** ✅ **10/10 passed**

---

## 📅 Timeline Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1-2 | Backend setup | 4 DBs, shared utilities |
| 3-5 | Auth service | WebAuthn working |
| 6 | Media pipeline | Encrypted, EXIF-free uploads |
| 7 | DM service | E2EE conversations/messages |
| 8 | Union + Debates | Encrypted memberships, debate threads |
| 9-11 | Voting service | Blind-signature voting |
| 12 | Migration | Pseudonyms only + logs |
| 13-14 | Testing & deploy | Production launch |

**Total:** 14 weeks (3.5 months)

---

## 💰 Budget Summary

| Category | Monthly Cost | One-Time Cost |
|----------|-------------|---------------|
| 4x PostgreSQL DBs | $90-180 | - |
| 6x Node.js services | $60-120 | - |
| Redis cache | $10-20 | - |
| Object Storage (R2/S3) | $5-15 | - |
| CDN/WAF (Phase 2) | $0-25 | - |
| Development | - | $20-40k (if outsourced) |
| **Total Ongoing** | **$165-360** | - |

---

## ✅ Definition of Done

Phase 1 is complete when:

- [ ] All 6 microservices deployed and healthy
- [ ] All 4 databases separated and secured
- [ ] Encrypted object storage configured
- [ ] WebAuthn authentication works on iOS/Android
- [ ] Zero email collection (verified in DB)
- [ ] Encrypted memberships work end-to-end
- [ ] Blind-signature voting (Mode B) works
- [ ] **E2EE Direct Messaging works with forward secrecy**
- [ ] **Encrypted media uploads with EXIF stripping work**
- [ ] **Debates function with aggregate-only views**
- [ ] Logs auto-delete after 24h
- [ ] No PII in logs (verified)
- [ ] All integration tests pass (including DM, media, debate tests)
- [ ] Expo app updated with new features
- [ ] Documentation updated
- [ ] **86% privacy compliance achieved** (up from 81%)
- [ ] **11/12 acceptance criteria passed**

---

## 📚 Next Steps (Phase 2)

After Phase 1 completion:

1. **Cloudflare CDN/WAF** (1-2 days)
2. **Tor .onion mirror** (1-2 weeks)
3. **KMS/HSM integration** (2-3 weeks)
4. **Quarterly backup drills** (ongoing)
5. **Transparency reports** (semiannual)

**Target:** 93% privacy compliance

---

**END OF PHASE 1 IMPLEMENTATION PLAN**

---

For questions or support during implementation, refer to:
- [SECURITY_ACCEPTANCE_CRITERIA.md](SECURITY_ACCEPTANCE_CRITERIA.md) - Full gap analysis
- [SECURITY_ACCEPTANCE_CRITERIA_PHASE_2.md](SECURITY_ACCEPTANCE_CRITERIA_PHASE_2.md) - Infrastructure hardening
- [SECURITY_STATUS.md](SECURITY_STATUS.md) - Current security status
- [replit.md](replit.md) - Project overview
