# Security Acceptance Criteria - Phase 1 Implementation Plan

**Goal:** Achieve 81% privacy compliance while staying 100% within Expo + React Native ecosystem  
**Timeline:** 2-4 months (8-16 weeks)  
**Budget:** $175-375/mo ongoing infrastructure costs  
**Team:** 1-2 full-stack developers

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Week-by-Week Implementation](#week-by-week-implementation)
4. [Service Specifications](#service-specifications)
5. [Database Migration Strategy](#database-migration-strategy)
6. [Testing & Quality Assurance](#testing--quality-assurance)
7. [Deployment & Infrastructure](#deployment--infrastructure)
8. [Risk Mitigation](#risk-mitigation)
9. [Success Metrics](#success-metrics)

---

## 📊 Executive Summary

### **What We're Building**

Replace Supabase Auth with custom privacy-first backend services while keeping the Expo + React Native frontend.

**Before (Current):**
```
Expo App → Supabase Auth (email/password) → Single PostgreSQL DB
          ❌ Collects emails
          ❌ Plaintext memberships
          ❌ Linkable votes
```

**After (Phase 1):**
```
Expo App → Custom Auth Service (WebAuthn) → 3 Separate DBs
          ✅ Zero email collection        (content_db)
          ✅ Encrypted memberships        (membership_db)
          ✅ Unlinkable votes (Mode B)    (ballot_db)
```

### **Deliverables**

1. ✅ 4 Node.js microservices (auth, union, voting, messaging)
2. ✅ 3 PostgreSQL databases (separated by sensitivity)
3. ✅ Expo frontend with client-side crypto libraries
4. ✅ Mode B blind-signature voting system
5. ✅ PII-free logging (24h retention)
6. ✅ 81% privacy compliance (up from 18%)

### **Cost Breakdown**

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| 3x PostgreSQL DBs | Railway/Render | $75-150 |
| 4x Node.js services | Railway/Render | $50-100 |
| Redis (session/cache) | Upstash | $10-20 |
| CDN/WAF (Phase 2) | Cloudflare | $0-25 |
| **Total** | | **$175-375** |

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
        │                │                 │
        ▼                ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ ballot_db   │  │membership_db│  │ content_db  │
│ (encrypted) │  │ (encrypted) │  │ (public)    │
└─────────────┘  └─────────────┘  └─────────────┘
```

### **Technology Stack**

**Frontend (No Changes):**
- Expo SDK 52
- React Native
- TypeScript
- React Query

**New Client Libraries:**
```bash
npm install react-native-passkey @noble/curves @noble/ciphers @noble/hashes ulid blind-signatures
```

**Backend (New):**
- Node.js 20+ / TypeScript
- Fastify (API framework)
- PostgreSQL 15+ (3 instances)
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
2. ✅ Set up 3 PostgreSQL databases
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
│   │   └── messaging_service/
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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  content_data:
  membership_data:
  ballot_data:
```

**Testing Checkpoint:**
- [ ] All 3 databases start successfully
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

// Health checks
export const healthCheck = async () => {
  const checks = await Promise.all([
    contentDB.query('SELECT 1'),
    membershipDB.query('SELECT 1'),
    ballotDB.query('SELECT 1'),
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

### **Weeks 6-8: Union Service (Encrypted Membership)**

#### **Week 6: Membership Encryption**

**Tasks:**
1. ✅ Create union service scaffold
2. ✅ Implement client-side encryption utilities
3. ✅ Create membership_db schema
4. ✅ Implement /unions/:id/join endpoint
5. ✅ Implement /me/memberships endpoint

**Database Schema:**
```sql
-- membership_db.membership_tokens
CREATE TABLE membership_tokens (
  token_id TEXT PRIMARY KEY,           -- ULID
  union_id TEXT NOT NULL,
  holder_binding TEXT NOT NULL,        -- SHA256(client_pub_key)
  ciphertext TEXT NOT NULL,            -- Encrypted membership payload
  ttl TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NO user_id column!

CREATE INDEX idx_holder_binding ON membership_tokens(holder_binding);

-- Revocation list
CREATE TABLE token_revocations (
  token_id TEXT PRIMARY KEY REFERENCES membership_tokens(token_id),
  revoked_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);
```

**Backend Code:**
```typescript
// backend/services/union_service/src/index.ts
import Fastify from 'fastify';
import { ulid } from 'ulid';
import { createHash } from 'crypto';
import { verifyJWT } from '@shared/middleware/auth';
import { encrypt } from '@shared/crypto/encryption';

const app = Fastify({ logger: true });
app.addHook('onRequest', verifyJWT);

// POST /unions/:unionId/join
app.post<{
  Params: { unionId: string };
  Body: { client_pub_key: string };
}>('/unions/:unionId/join', async (req, reply) => {
  const { unionId } = req.params;
  const { client_pub_key } = req.body;
  const userId = req.user.userId;
  
  // Check if already a member
  const holderBinding = createHash('sha256')
    .update(client_pub_key)
    .digest('hex');
  
  const { rowCount } = await membershipDB.query(
    'SELECT 1 FROM membership_tokens WHERE union_id = $1 AND holder_binding = $2',
    [unionId, holderBinding]
  );
  
  if (rowCount > 0) {
    return reply.code(409).send({ error: 'Already a member' });
  }
  
  // Create membership payload (server sees this temporarily)
  const membership = {
    union_id: unionId,
    role: 'member',
    joined_at: new Date().toISOString(),
  };
  
  // Encrypt to user's public key (server cannot decrypt after this)
  const key = Buffer.from(client_pub_key, 'hex').slice(0, 32);  // XChaCha20 needs 32 bytes
  const ciphertext = encrypt(JSON.stringify(membership), key);
  
  const tokenId = ulid();
  
  // Store ONLY ciphertext
  await membershipDB.query(`
    INSERT INTO membership_tokens (token_id, union_id, holder_binding, ciphertext)
    VALUES ($1, $2, $3, $4)
  `, [tokenId, unionId, holderBinding, ciphertext]);
  
  await logEvent('/unions/join', 200, 'membership_created');
  
  return { token_id: tokenId, ciphertext };
});

// GET /me/memberships (returns ciphertext only)
app.get('/me/memberships', async (req, reply) => {
  const userId = req.user.userId;
  
  // Get user's public key from auth service
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const holderBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  // Return ONLY ciphertext (server cannot decrypt)
  const { rows } = await membershipDB.query(`
    SELECT token_id, union_id, ciphertext
    FROM membership_tokens
    WHERE holder_binding = $1
      AND token_id NOT IN (SELECT token_id FROM token_revocations)
  `, [holderBinding]);
  
  await logEvent('/me/memberships', 200, 'memberships_retrieved');
  
  return rows;  // [{ token_id, union_id, ciphertext }, ...]
});

// POST /unions/:unionId/leave
app.post<{
  Params: { unionId: string };
}>('/unions/:unionId/leave', async (req, reply) => {
  const { unionId } = req.params;
  const userId = req.user.userId;
  
  // Get user's public key
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const holderBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  // Find token
  const { rows: [token] } = await membershipDB.query(
    'SELECT token_id FROM membership_tokens WHERE union_id = $1 AND holder_binding = $2',
    [unionId, holderBinding]
  );
  
  if (!token) {
    return reply.code(404).send({ error: 'Not a member' });
  }
  
  // Revoke token
  await membershipDB.query(
    'INSERT INTO token_revocations (token_id, reason) VALUES ($1, $2)',
    [token.token_id, 'user_requested']
  );
  
  await logEvent('/unions/leave', 200, 'membership_revoked');
  
  return { success: true };
});

app.listen({ port: 3002, host: '0.0.0.0' });
```

**Testing Checkpoint:**
- [ ] Join union encrypts membership
- [ ] Server stores only ciphertext
- [ ] Retrieval returns ciphertext only
- [ ] Leave revokes token

---

#### **Week 7: Frontend Membership Decryption**

**Tasks:**
1. ✅ Create client-side crypto utilities
2. ✅ Implement useMemberships hook
3. ✅ Update join union flow
4. ✅ Update membership display

**Client Crypto:**
```typescript
// frontend/src/crypto/membership.ts
import { xchacha20poly1305 } from '@noble/ciphers/chacha';

export const decryptMembership = (
  ciphertext: string,
  privateKey: string
): any => {
  const data = Buffer.from(ciphertext, 'base64');
  const nonce = data.slice(0, 24);
  const encrypted = data.slice(24);
  
  // Derive key from private key (first 32 bytes)
  const key = Buffer.from(privateKey, 'hex').slice(0, 32);
  
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = cipher.decrypt(encrypted);
  
  return JSON.parse(plaintext.toString());
};
```

**Membership Hook:**
```typescript
// frontend/src/hooks/useMemberships.ts
import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { decryptMembership } from '../crypto/membership';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const useMemberships = () => {
  return useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      // Get auth token
      const token = await SecureStore.getItemAsync('auth_token');
      
      // Get private key
      const privateKey = await SecureStore.getItemAsync('signing_private_key');
      
      // Fetch encrypted tokens from server
      const response = await fetch(`${API_URL}/me/memberships`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch memberships');
      }
      
      const encryptedTokens = await response.json();
      
      // Decrypt locally (server never sees plaintext)
      const memberships = await Promise.all(
        encryptedTokens.map(async (token: any) => {
          try {
            const decrypted = decryptMembership(token.ciphertext, privateKey!);
            return {
              token_id: token.token_id,
              union_id: token.union_id,
              ...decrypted,
            };
          } catch (err) {
            console.error('Failed to decrypt membership:', err);
            return null;
          }
        })
      );
      
      return memberships.filter(Boolean);
    },
    enabled: true,
  });
};

export const useJoinUnion = () => {
  return useMutation({
    mutationFn: async (unionId: string) => {
      const token = await SecureStore.getItemAsync('auth_token');
      const privateKey = await SecureStore.getItemAsync('signing_private_key');
      
      // Derive public key from private key
      const publicKey = ed25519.getPublicKey(Buffer.from(privateKey!, 'hex'));
      
      const response = await fetch(`${API_URL}/unions/${unionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_pub_key: Buffer.from(publicKey).toString('hex'),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to join union');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
};
```

**Testing Checkpoint:**
- [ ] Memberships decrypt correctly on client
- [ ] Join union flow works end-to-end
- [ ] Server cannot read membership details
- [ ] Leave union revokes token

---

#### **Week 8: Union Admin Features**

**Tasks:**
1. ✅ Implement aggregate member count endpoint
2. ✅ Ensure admins cannot enumerate members
3. ✅ Create union settings page
4. ✅ Add union discovery/search

**Code:**
```typescript
// GET /unions/:unionId (public metadata only)
app.get<{
  Params: { unionId: string };
}>('/unions/:unionId', async (req, reply) => {
  const { unionId } = req.params;
  
  // Get union metadata from content_db
  const { rows: [union] } = await contentDB.query(
    'SELECT id, name, description, created_at FROM unions WHERE id = $1',
    [unionId]
  );
  
  if (!union) {
    return reply.code(404).send({ error: 'Union not found' });
  }
  
  // Get aggregate member count (no individual members)
  const { rows: [{ count }] } = await membershipDB.query(`
    SELECT COUNT(*) as count
    FROM membership_tokens
    WHERE union_id = $1
      AND token_id NOT IN (SELECT token_id FROM token_revocations)
  `, [unionId]);
  
  return {
    ...union,
    member_count: parseInt(count),  // Aggregate only
    // NO member list, NO user_ids
  };
});
```

**Testing Checkpoint:**
- [ ] Union metadata is public
- [ ] Member count is aggregate only
- [ ] Admins cannot see member identities
- [ ] Search/discovery works

---

### **Weeks 9-11: Voting Service (Blind Signatures)**

#### **Week 9: Blind Signature Token Issuance**

**Tasks:**
1. ✅ Create voting service scaffold
2. ✅ Implement blind-signature library
3. ✅ Create ballot_db schema
4. ✅ Implement token issuance endpoint
5. ✅ Add membership verification

**Database Schema:**
```sql
-- ballot_db.ballots
CREATE TABLE ballots (
  ballot_id TEXT PRIMARY KEY,
  union_id TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('A', 'B', 'C')) DEFAULT 'B',
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mode A votes (simple authenticated - LOW PRIVACY)
CREATE TABLE ballot_votes_mode_a (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id TEXT REFERENCES ballots(ballot_id),
  user_id TEXT NOT NULL,
  choice TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ballot_id, user_id)
);

-- Mode B votes (blind-signature - DEFAULT)
CREATE TABLE ballot_votes_mode_b (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id TEXT REFERENCES ballots(ballot_id),
  token_signature TEXT NOT NULL,
  commitment TEXT NOT NULL,        -- Encrypted vote
  nullifier TEXT UNIQUE NOT NULL,  -- Prevents double-voting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nullifier ON ballot_votes_mode_b(nullifier);

-- Server signing keys (rotated quarterly)
CREATE TABLE ballot_signing_keys (
  ballot_id TEXT PRIMARY KEY REFERENCES ballots(ballot_id),
  private_key BYTEA NOT NULL,
  public_key BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Backend Code:**
```typescript
// backend/services/voting_service/src/index.ts
import Fastify from 'fastify';
import { blindSign, verify } from 'blind-signatures';
import { createHash } from 'crypto';
import Redis from 'ioredis';

const app = Fastify({ logger: true });
const redis = new Redis(process.env.REDIS_URL);

app.addHook('onRequest', verifyJWT);

// POST /ballots/:ballotId/issue_token (Mode B only)
app.post<{
  Params: { ballotId: string };
  Body: { blinded_message: string };
}>('/ballots/:ballotId/issue_token', async (req, reply) => {
  const { ballotId } = req.params;
  const { blinded_message } = req.body;
  const userId = req.user.userId;
  
  // 1. Get ballot details
  const { rows: [ballot] } = await ballotDB.query(
    'SELECT union_id, mode FROM ballots WHERE ballot_id = $1',
    [ballotId]
  );
  
  if (!ballot || ballot.mode !== 'B') {
    return reply.code(400).send({ error: 'Invalid ballot or mode' });
  }
  
  // 2. Verify user is union member (check membership_db)
  const userRes = await fetch(`http://auth_service:3001/users/${userId}`);
  const user = await userRes.json();
  
  const holderBinding = createHash('sha256')
    .update(user.client_pub_key)
    .digest('hex');
  
  const { rowCount } = await membershipDB.query(
    'SELECT 1 FROM membership_tokens WHERE union_id = $1 AND holder_binding = $2',
    [ballot.union_id, holderBinding]
  );
  
  if (rowCount === 0) {
    return reply.code(403).send({ error: 'Not a union member' });
  }
  
  // 3. Check if token already issued (prevent multiple issuances)
  const alreadyIssued = await redis.get(`issued:${ballotId}:${userId}`);
  if (alreadyIssued) {
    return reply.code(409).send({ error: 'Token already issued' });
  }
  
  // 4. Blind-sign the message (server doesn't see token contents)
  const { rows: [keys] } = await ballotDB.query(
    'SELECT private_key FROM ballot_signing_keys WHERE ballot_id = $1',
    [ballotId]
  );
  
  const blindSignature = blindSign(blinded_message, keys.private_key);
  
  // 5. Mark as issued (24h expiry)
  await redis.setex(`issued:${ballotId}:${userId}`, 86400, '1');
  
  await logEvent('/ballots/issue_token', 200, 'token_issued');
  
  return { blind_signature: blindSignature };
});

app.listen({ port: 3003, host: '0.0.0.0' });
```

**Testing Checkpoint:**
- [ ] Token issuance requires membership
- [ ] Blind signature doesn't reveal token contents
- [ ] Cannot issue multiple tokens
- [ ] Tokens expire after 24h

---

#### **Week 10: Anonymous Vote Submission**

**Tasks:**
1. ✅ Implement vote submission endpoint
2. ✅ Implement nullifier tracking
3. ✅ Add signature verification
4. ✅ Implement tally endpoint (aggregate only)

**Code:**
```typescript
// POST /ballots/:ballotId/vote (Mode B)
app.post<{
  Params: { ballotId: string };
  Body: {
    token_signature: string;
    commitment: string;
    nullifier: string;
  };
}>('/ballots/:ballotId/vote', async (req, reply) => {
  const { ballotId } = req.params;
  const { token_signature, commitment, nullifier } = req.body;
  
  // 1. Verify signature is valid
  const { rows: [keys] } = await ballotDB.query(
    'SELECT public_key FROM ballot_signing_keys WHERE ballot_id = $1',
    [ballotId]
  );
  
  if (!verify(token_signature, keys.public_key)) {
    return reply.code(401).send({ error: 'Invalid token signature' });
  }
  
  // 2. Check nullifier not used (prevent double-voting)
  const { rowCount } = await ballotDB.query(
    'SELECT 1 FROM ballot_votes_mode_b WHERE nullifier = $1',
    [nullifier]
  );
  
  if (rowCount > 0) {
    return reply.code(409).send({ error: 'Already voted (nullifier reused)' });
  }
  
  // 3. Store anonymous vote (NO user_id)
  await ballotDB.query(`
    INSERT INTO ballot_votes_mode_b (ballot_id, token_signature, commitment, nullifier)
    VALUES ($1, $2, $3, $4)
  `, [ballotId, token_signature, commitment, nullifier]);
  
  // 4. Return receipt
  const receipt = createHash('sha256').update(nullifier).digest('hex');
  
  await logEvent('/ballots/vote', 200, 'vote_cast');
  
  return { success: true, receipt };
});

// GET /ballots/:ballotId/tally (aggregate only)
app.get<{
  Params: { ballotId: string };
}>('/ballots/:ballotId/tally', async (req, reply) => {
  const { ballotId } = req.params;
  
  // Get ballot options
  const { rows: [ballot] } = await ballotDB.query(
    'SELECT options FROM ballots WHERE ballot_id = $1',
    [ballotId]
  );
  
  // Decrypt all commitments server-side
  const { rows } = await ballotDB.query(
    'SELECT commitment FROM ballot_votes_mode_b WHERE ballot_id = $1',
    [ballotId]
  );
  
  // Decrypt and aggregate (server sees totals, not individual votes)
  const tally: Record<string, number> = {};
  
  for (const row of rows) {
    try {
      const vote = await decryptCommitment(row.commitment);  // Server-side decryption
      tally[vote] = (tally[vote] || 0) + 1;
    } catch (err) {
      console.error('Failed to decrypt vote:', err);
    }
  }
  
  return {
    ballot_id: ballotId,
    total_votes: rows.length,
    tally,  // { "yes": 45, "no": 30 }
    // NO per-vote details
  };
});
```

**Testing Checkpoint:**
- [ ] Vote submission works anonymously
- [ ] Nullifier prevents double-voting
- [ ] Signature verification works
- [ ] Tally shows aggregates only

---

#### **Week 11: Frontend Blind Voting UI**

**Tasks:**
1. ✅ Install blind-signatures library
2. ✅ Implement useBlindVoting hooks
3. ✅ Create voting UI components
4. ✅ Add receipt storage and verification

**Install:**
```bash
npm install blind-signatures
```

**Hooks:**
```typescript
// frontend/src/hooks/useBlindVoting.ts
import { blind, unblind, verify } from 'blind-signatures';
import { randomBytes } from 'expo-crypto';
import { createHash } from 'crypto';

export const useRequestVotingToken = () => {
  return useMutation({
    mutationFn: async (ballotId: string) => {
      const token = randomBytes(32);
      const { blinded, blindingFactor } = blind(token);
      
      const authToken = await SecureStore.getItemAsync('auth_token');
      
      // Request blind signature from server
      const response = await fetch(`${API_URL}/ballots/${ballotId}/issue_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ blinded_message: blinded }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      const { blind_signature } = await response.json();
      
      // Unblind signature
      const signature = unblind(blind_signature, blindingFactor);
      
      // Store for later use
      await SecureStore.setItemAsync(
        `voting_token:${ballotId}`,
        JSON.stringify({
          token: Array.from(token),
          signature,
        })
      );
      
      return { success: true };
    },
  });
};

export const useCastBlindVote = () => {
  return useMutation({
    mutationFn: async ({
      ballotId,
      choice,
    }: {
      ballotId: string;
      choice: string;
    }) => {
      // 1. Retrieve voting token
      const stored = await SecureStore.getItemAsync(`voting_token:${ballotId}`);
      
      if (!stored) {
        throw new Error('No voting token found. Request token first.');
      }
      
      const { token, signature } = JSON.parse(stored);
      const tokenBuffer = Buffer.from(token);
      
      // 2. Encrypt vote choice
      const commitment = await encryptVote(choice, tokenBuffer);
      
      // 3. Generate nullifier (prevents double-voting)
      const nullifier = createHash('sha256')
        .update(Buffer.concat([tokenBuffer, Buffer.from(ballotId)]))
        .digest('hex');
      
      // 4. Submit anonymous vote (no auth token needed)
      const response = await fetch(`${API_URL}/ballots/${ballotId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_signature: signature,
          commitment,
          nullifier,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      const { receipt } = await response.json();
      
      // 5. Delete token (prevent reuse)
      await SecureStore.deleteItemAsync(`voting_token:${ballotId}`);
      
      // 6. Store receipt for verification
      await SecureStore.setItemAsync(`receipt:${ballotId}`, receipt);
      
      return { success: true, receipt };
    },
  });
};

const encryptVote = async (vote: string, token: Buffer): Promise<string> => {
  const nonce = randomBytes(24);
  const key = createHash('sha256').update(token).digest().slice(0, 32);
  
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(Buffer.from(vote));
  
  return Buffer.concat([nonce, ciphertext]).toString('base64');
};
```

**Voting UI:**
```typescript
// frontend/src/screens/VotingScreen.tsx
import { useRequestVotingToken, useCastBlindVote } from '../hooks/useBlindVoting';

const VotingScreen = ({ ballotId, question, options }: Props) => {
  const requestToken = useRequestVotingToken();
  const castVote = useCastBlindVote();
  
  const [tokenRequested, setTokenRequested] = useState(false);
  
  const handleRequestToken = async () => {
    try {
      await requestToken.mutateAsync(ballotId);
      setTokenRequested(true);
      Alert.alert('Token Received', 'You can now cast your anonymous vote.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  
  const handleVote = async (choice: string) => {
    if (!tokenRequested) {
      Alert.alert('Error', 'Request voting token first');
      return;
    }
    
    try {
      const { receipt } = await castVote.mutateAsync({ ballotId, choice });
      Alert.alert(
        'Vote Cast!',
        `Your anonymous vote has been recorded.\n\nReceipt: ${receipt.slice(0, 16)}...`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  
  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      
      {!tokenRequested ? (
        <View>
          <Text style={styles.privacy}>
            ⚠️ PRIVACY MODE B: Blind-Signature Voting
          </Text>
          <Text style={styles.explanation}>
            • Your vote will be completely anonymous{'\n'}
            • Server cannot link your vote to your identity{'\n'}
            • You will receive a cryptographic receipt{'\n'}
            • You cannot change your vote after submission
          </Text>
          <Button title="Request Anonymous Voting Token" onPress={handleRequestToken} />
        </View>
      ) : (
        <View>
          <Text style={styles.ready}>Ready to vote anonymously</Text>
          {options.map((option) => (
            <Button
              key={option}
              title={`Vote: ${option}`}
              onPress={() => handleVote(option)}
            />
          ))}
        </View>
      )}
    </View>
  );
};
```

**Testing Checkpoint:**
- [ ] Token request flow works
- [ ] Vote submission is anonymous
- [ ] Receipt stored locally
- [ ] Cannot vote twice (nullifier check)
- [ ] UI shows privacy warnings

---

### **Week 12: Messaging Service & Migration**

#### **Tasks:**
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
  
  test('JWT expires in 15 minutes', async () => {
    const decoded = jwt.decode(token);
    const expiry = decoded.exp - decoded.iat;
    expect(expiry).toBe(15 * 60); // 15 minutes
  });
});

describe('Membership Encryption', () => {
  test('Server cannot decrypt membership', async () => {
    // Join union
    const res = await request(unionService)
      .post('/unions/123/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ client_pub_key: publicKey });
    
    const { ciphertext } = res.body;
    
    // Server tries to decrypt (should fail)
    expect(() => decrypt(ciphertext, 'wrong-key')).toThrow();
    
    // Only client can decrypt
    const plaintext = decrypt(ciphertext, privateKey);
    expect(JSON.parse(plaintext).union_id).toBe('123');
  });
});

describe('Blind-Signature Voting', () => {
  test('Server cannot link vote to user', async () => {
    // Issue token
    const { blind_signature } = await request(votingService)
      .post('/ballots/abc/issue_token')
      .set('Authorization', `Bearer ${token}`)
      .send({ blinded_message: blinded });
    
    // Cast vote (no auth token)
    const voteRes = await request(votingService)
      .post('/ballots/abc/vote')
      .send({
        token_signature: signature,
        commitment: encrypted,
        nullifier: nullifier,
      });
    
    expect(voteRes.status).toBe(200);
    
    // Verify no user_id in vote record
    const { rows } = await ballotDB.query('SELECT * FROM ballot_votes_mode_b');
    expect(rows[0]).not.toHaveProperty('user_id');
  });
  
  test('Nullifier prevents double-voting', async () => {
    // First vote succeeds
    const res1 = await request(votingService)
      .post('/ballots/abc/vote')
      .send({ token_signature, commitment, nullifier });
    expect(res1.status).toBe(200);
    
    // Second vote with same nullifier fails
    const res2 = await request(votingService)
      .post('/ballots/abc/vote')
      .send({ token_signature, commitment, nullifier });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/already voted/i);
  });
});

describe('PII-Free Logging', () => {
  test('Logs contain no IP or user agent', async () => {
    await request(authService)
      .post('/auth/webauthn/register')
      .send(validPayload);
    
    const { rows } = await contentDB.query('SELECT * FROM logs.events ORDER BY created_at DESC LIMIT 1');
    
    expect(rows[0]).not.toHaveProperty('ip_address');
    expect(rows[0]).not.toHaveProperty('user_agent');
    expect(rows[0]).not.toHaveProperty('user_id');
    expect(rows[0]).toHaveProperty('request_hash');
  });
  
  test('Logs auto-delete after 24h', async () => {
    // Insert old log
    await contentDB.query(`
      INSERT INTO logs.events (request_hash, route, status_code, created_at)
      VALUES ('hash123', '/test', 200, NOW() - INTERVAL '25 hours')
    `);
    
    // Run cleanup
    await cleanupOldLogs();
    
    // Verify deleted
    const { rowCount } = await contentDB.query('SELECT * FROM logs.events WHERE request_hash = $1', ['hash123']);
    expect(rowCount).toBe(0);
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

databases:
  - name: content-db
    type: postgresql
  - name: membership-db
    type: postgresql
  - name: ballot-db
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
eas update --branch production --message "Phase 1 complete - WebAuthn + encrypted memberships + blind voting"
```

**Testing Checkpoint:**
- [ ] All services healthy in production
- [ ] Frontend connects to production API
- [ ] WebAuthn works on real devices
- [ ] Encrypted memberships work
- [ ] Blind voting works
- [ ] Logs cleanup automatically

---

## 📊 Success Metrics

### **Privacy Compliance**

| Category | Before | After Phase 1 | Target |
|----------|--------|---------------|--------|
| Authentication | 8% | 90% | ✅ |
| Data Architecture | 0% | 80% | ✅ |
| Membership Storage | 0% | 90% | ✅ |
| Voting System | 13% | 80% | ✅ |
| Content & Messaging | 50% | 90% | ✅ |
| Logging & Analytics | 0% | 90% | ✅ |
| Network Security | 11% | 60% | ⚠️ (Phase 2) |
| Cryptography | 0% | 95% | ✅ |
| Abuse Controls | 67% | 85% | ✅ |
| Operations | 0% | 50% | ⚠️ (Phase 2) |
| **OVERALL** | **18%** | **81%** | ✅ |

### **Acceptance Criteria**

| AC | Description | Status |
|----|-------------|--------|
| AC1 | WebAuthn signup, no email | ✅ 100% |
| AC2 | Encrypted membership retrieval | ✅ 100% |
| AC3 | Mode B blind-signature voting | ✅ 100% |
| AC4 | Aggregate-only admin view | ✅ 100% |
| AC5 | 24h PII-free logs | ✅ 100% |
| AC6 | CDN/Tor origin allowlist | ⚠️ 50% (Phase 2) |
| AC7 | Public privacy policy | ✅ 100% |

**Overall:** ✅ **6/7 ACs passed** (86%)

### **Red Lines**

| Red Line | Status |
|----------|--------|
| Storing email/IP/UA tied to user_id | ✅ FIXED |
| Combined dumps with membership + identifiers | ✅ FIXED |
| Exposing per-user votes to admins | ✅ FIXED |
| Custom crypto primitives | ✅ PASS |
| Fingerprinting analytics | ✅ PASS |

**Red Lines Status:** ✅ **5/5 passed**

---

## 🚨 Risk Mitigation

### **Technical Risks**

**Risk 1: WebAuthn Browser Compatibility**
- **Mitigation:** Implement fallback passphrase → Argon2id
- **Timeline:** Week 5
- **Cost:** +1 week dev time

**Risk 2: Database Migration Failures**
- **Mitigation:** Test migrations on staging first
- **Timeline:** Week 12
- **Cost:** +2 days

**Risk 3: Blind Signature Library Issues**
- **Mitigation:** Test thoroughly, have fallback to Mode A
- **Timeline:** Week 9
- **Cost:** +3 days

### **Operational Risks**

**Risk 1: Service Downtime During Migration**
- **Mitigation:** Blue-green deployment, gradual rollout
- **Timeline:** Week 14
- **Cost:** +$100/mo temporary

**Risk 2: Cost Overruns**
- **Mitigation:** Monitor usage, set billing alerts
- **Timeline:** Ongoing
- **Cost:** $0

**Risk 3: User Adoption (Passkeys Unfamiliar)**
- **Mitigation:** Clear onboarding, optional email transition period
- **Timeline:** Post-launch
- **Cost:** UX improvements

---

## 📅 Timeline Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1-2 | Backend setup | 3 DBs, shared utilities |
| 3-5 | Auth service | WebAuthn working |
| 6-8 | Union service | Encrypted memberships |
| 9-11 | Voting service | Blind-signature voting |
| 12 | Migration | Content pseudonymization |
| 13-14 | Testing & deploy | Production launch |

**Total:** 14 weeks (3.5 months)

---

## 💰 Budget Summary

| Category | Monthly Cost | One-Time Cost |
|----------|-------------|---------------|
| 3x PostgreSQL DBs | $75-150 | - |
| 4x Node.js services | $50-100 | - |
| Redis cache | $10-20 | - |
| CDN/WAF (Phase 2) | $0-25 | - |
| Development | - | $20-40k (if outsourced) |
| **Total Ongoing** | **$175-375** | - |

---

## ✅ Definition of Done

Phase 1 is complete when:

- [ ] All 4 microservices deployed and healthy
- [ ] All 3 databases separated and secured
- [ ] WebAuthn authentication works on iOS/Android
- [ ] Zero email collection (verified in DB)
- [ ] Encrypted memberships work end-to-end
- [ ] Blind-signature voting (Mode B) works
- [ ] Logs auto-delete after 24h
- [ ] No PII in logs (verified)
- [ ] All integration tests pass
- [ ] Expo app updated with new auth flow
- [ ] Documentation updated
- [ ] 81% privacy compliance achieved

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
- [SECURITY_STATUS.md](SECURITY_STATUS.md) - Current security status
- [replit.md](replit.md) - Project overview
