# Backend Migration: WebAuthn → Device Token Auth

## Overview

The backend currently implements WebAuthn authentication. To support Device Token Auth (ECDSA P-256 signatures), we need to:

1. Replace `@simplewebauthn/server` with `@noble/curves`
2. Update database schema (store public keys instead of WebAuthn credentials)
3. Modify auth endpoints (signature verification instead of WebAuthn ceremony)
4. Update JWT token generation

---

## Dependencies to Install

```bash
cd backend/services/auth
npm install @noble/curves @noble/hashes
npm uninstall @simplewebauthn/server
```

**New dependencies:**
- `@noble/curves` - ECDSA P-256 signature verification
- `@noble/hashes` - SHA-256 hashing

---

## Database Schema Changes

**Current schema (WebAuthn):**
```sql
CREATE TABLE credentials (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  credential_public_key BYTEA NOT NULL,
  credential_id BYTEA NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New schema (Device Token Auth):**
```sql
CREATE TABLE device_credentials (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  public_key VARCHAR(130) NOT NULL, -- Hex-encoded P-256 public key (65 bytes = 130 hex chars)
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  os_name VARCHAR(100),
  os_version VARCHAR(100),
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_id)
);

CREATE INDEX idx_device_credentials_user_id ON device_credentials(user_id);
CREATE INDEX idx_device_credentials_public_key ON device_credentials(public_key);
```

---

## API Endpoints to Update

### 1. POST `/auth/register-device`

**Purpose:** Register a new device with its public key

**Request:**
```typescript
{
  publicKey: string;        // Hex-encoded P-256 public key
  deviceId: string;         // Unique device identifier
  deviceName?: string;      // e.g., "John's iPhone"
  osName?: string;          // e.g., "iOS", "Android"
  osVersion?: string;       // e.g., "17.5"
}
```

**Response:**
```typescript
{
  user: {
    id: string;
    deviceId: string;
    publicKey: string;
    createdAt: string;
  };
  tokens: {
    accessToken: string;    // JWT (expires in 15m)
    refreshToken: string;   // JWT (expires in 30d)
  };
}
```

**Implementation:**
```typescript
import { p256 } from '@noble/curves/p256';
import { hexToBytes } from '@noble/hashes/utils';

// Validate public key format
function validatePublicKey(publicKeyHex: string): boolean {
  try {
    const publicKeyBytes = hexToBytes(publicKeyHex);
    // P-256 public keys are 65 bytes (uncompressed) or 33 bytes (compressed)
    return publicKeyBytes.length === 65 || publicKeyBytes.length === 33;
  } catch {
    return false;
  }
}

// Register device endpoint
fastify.post('/auth/register-device', async (request, reply) => {
  const { publicKey, deviceId, deviceName, osName, osVersion } = request.body;

  // Validate public key
  if (!validatePublicKey(publicKey)) {
    return reply.code(400).send({ error: 'Invalid public key format' });
  }

  // Check if device already registered
  const existing = await db.query(
    'SELECT * FROM device_credentials WHERE device_id = $1',
    [deviceId]
  );
  if (existing.rows.length > 0) {
    return reply.code(409).send({ error: 'Device already registered' });
  }

  // Create user and store public key
  const userId = `device-${deviceId}`;
  await db.query(
    `INSERT INTO device_credentials 
     (user_id, public_key, device_id, device_name, os_name, os_version) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, publicKey, deviceId, deviceName, osName, osVersion]
  );

  // Generate JWT tokens
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  return {
    user: { id: userId, deviceId, publicKey, createdAt: new Date().toISOString() },
    tokens: { accessToken, refreshToken },
  };
});
```

---

### 2. POST `/auth/challenge`

**Purpose:** Get a challenge to sign for authentication

**Request:**
```typescript
{
  publicKey: string;  // Hex-encoded P-256 public key
}
```

**Response:**
```typescript
{
  challenge: string;  // Random challenge string
  expiresAt: string;  // ISO timestamp (challenge expires in 5 minutes)
}
```

**Implementation:**
```typescript
import crypto from 'crypto';

// Store challenges in Redis with 5-minute TTL
async function storeChallenge(publicKey: string, challenge: string) {
  await redis.setex(`challenge:${publicKey}`, 300, challenge);
}

fastify.post('/auth/challenge', async (request, reply) => {
  const { publicKey } = request.body;

  // Validate public key exists
  const result = await db.query(
    'SELECT * FROM device_credentials WHERE public_key = $1',
    [publicKey]
  );
  if (result.rows.length === 0) {
    return reply.code(404).send({ error: 'Device not registered' });
  }

  // Generate random challenge
  const challenge = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Store challenge in Redis (5 minute TTL)
  await storeChallenge(publicKey, challenge);

  return { challenge, expiresAt };
});
```

---

### 3. POST `/auth/verify-device`

**Purpose:** Verify signed challenge and issue tokens

**Request:**
```typescript
{
  publicKey: string;   // Hex-encoded P-256 public key
  challenge: string;   // Challenge from /auth/challenge
  signature: string;   // Hex-encoded ECDSA signature
}
```

**Response:**
```typescript
{
  user: {
    id: string;
    deviceId: string;
    publicKey: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
```

**Implementation:**
```typescript
import { p256 } from '@noble/curves/p256';
import { hexToBytes } from '@noble/hashes/utils';

async function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(challenge);
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);

    return p256.verify(signatureBytes, messageBytes, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

fastify.post('/auth/verify-device', async (request, reply) => {
  const { publicKey, challenge, signature } = request.body;

  // Get stored challenge from Redis
  const storedChallenge = await redis.get(`challenge:${publicKey}`);
  if (!storedChallenge) {
    return reply.code(401).send({ error: 'Challenge expired or invalid' });
  }

  // Verify challenge matches
  if (storedChallenge !== challenge) {
    return reply.code(401).send({ error: 'Challenge mismatch' });
  }

  // Verify signature
  const isValid = await verifySignature(challenge, signature, publicKey);
  if (!isValid) {
    return reply.code(401).send({ error: 'Invalid signature' });
  }

  // Delete challenge (one-time use)
  await redis.del(`challenge:${publicKey}`);

  // Get user from database
  const result = await db.query(
    'SELECT * FROM device_credentials WHERE public_key = $1',
    [publicKey]
  );
  if (result.rows.length === 0) {
    return reply.code(404).send({ error: 'Device not registered' });
  }

  const user = result.rows[0];

  // Update last_used_at
  await db.query(
    'UPDATE device_credentials SET last_used_at = NOW() WHERE public_key = $1',
    [publicKey]
  );

  // Generate JWT tokens
  const accessToken = generateAccessToken(user.user_id);
  const refreshToken = generateRefreshToken(user.user_id);

  return {
    user: {
      id: user.user_id,
      deviceId: user.device_id,
      publicKey: user.public_key,
    },
    tokens: { accessToken, refreshToken },
  };
});
```

---

## JWT Token Generation

**No changes needed** - JWT generation remains the same:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateAccessToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
```

---

## Testing

### Test Signature Verification

```typescript
import { p256 } from '@noble/curves/p256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Generate test keypair
const privateKey = p256.utils.randomPrivateKey();
const publicKey = p256.getPublicKey(privateKey);

const publicKeyHex = bytesToHex(publicKey);
const privateKeyHex = bytesToHex(privateKey);

console.log('Public Key:', publicKeyHex);
console.log('Private Key:', privateKeyHex);

// Sign challenge
const challenge = 'test-challenge-123';
const messageBytes = new TextEncoder().encode(challenge);
const signature = p256.sign(messageBytes, privateKey);
const signatureHex = bytesToHex(signature);

console.log('Signature:', signatureHex);

// Verify signature
const isValid = p256.verify(hexToBytes(signatureHex), messageBytes, publicKey);
console.log('Verification:', isValid); // Should be true
```

### Test with curl

```bash
# 1. Register device
curl -X POST http://localhost:3001/auth/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "<hex-public-key>",
    "deviceId": "test-device-123",
    "deviceName": "Test Device",
    "osName": "iOS",
    "osVersion": "17.5"
  }'

# 2. Get challenge
curl -X POST http://localhost:3001/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "<hex-public-key>"
  }'

# 3. Sign challenge (use frontend crypto)

# 4. Verify signature
curl -X POST http://localhost:3001/auth/verify-device \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "<hex-public-key>",
    "challenge": "<challenge-from-step-2>",
    "signature": "<hex-signature>"
  }'
```

---

## Security Considerations

### 1. Challenge Replay Protection
- ✅ Challenges stored in Redis with 5-minute TTL
- ✅ Challenges deleted after one use
- ✅ Challenge must match stored value

### 2. Signature Verification
- ✅ Uses `@noble/curves` (audited by Trail of Bits)
- ✅ Verifies signature before issuing tokens
- ✅ Public key validated before storage

### 3. Rate Limiting
- ✅ Already implemented via `@fastify/rate-limit`
- ✅ Apply to all auth endpoints

### 4. JWT Security
- ✅ Short-lived access tokens (15 minutes)
- ✅ Long-lived refresh tokens (30 days)
- ✅ Use strong JWT_SECRET in production

---

## Migration Checklist

- [ ] Install @noble/curves and @noble/hashes
- [ ] Uninstall @simplewebauthn/server
- [ ] Create device_credentials table
- [ ] Update POST /auth/register-device endpoint
- [ ] Create POST /auth/challenge endpoint
- [ ] Create POST /auth/verify-device endpoint
- [ ] Update JWT token generation (no changes needed)
- [ ] Test signature verification locally
- [ ] Test with frontend integration
- [ ] Deploy to production

---

## Rollback Plan

If issues arise, the backend can run both WebAuthn and Device Token Auth simultaneously:

1. Keep both database tables (credentials and device_credentials)
2. Keep both endpoint sets (/auth/webauthn/* and /auth/device/*)
3. Frontend decides which to use based on CONFIG.USE_DEVICE_AUTH flag
4. Gradual migration with feature flag rollout

This allows safe A/B testing and gradual rollout.
