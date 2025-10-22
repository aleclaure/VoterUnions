# Security Enhancements Addendum

**Purpose:** Additional security features to integrate into the existing Phase 1 & Phase 2 roadmap
**Adds:** Token Management & Optional Post Encryption
**Timeline:** +3-5 weeks to existing plan
**Compliance Impact:** 86% → 93% → 95%+

---

## 📋 Overview

This document **extends** the existing security implementation plan with two critical enhancements:

1. **Phase 2: Secure Token Management** (1-2 weeks)
2. **Phase 3: Optional Post Encryption** (2-3 weeks)

**These integrate into your existing plans without disrupting the core roadmap.**

---

## 🔐 Phase 2 Addition: Secure Token Management

### **When to Implement:** Between existing Phase 1 (Week 14) and Phase 2 (Week 15)

**Duration:** 1-2 weeks
**Complexity:** Low-Medium
**Priority:** High (security best practice)

---

### **Problem with Current JWT-Only Approach**

Your existing plan (SECURITY_STATUS.md) implements:
- ✅ Short-lived JWTs (15 min expiry) - Week 3-5
- ✅ JWT issuance by auth service

**What's Missing:**
- ❌ Refresh token management
- ❌ Separation of access vs refresh tokens
- ❌ Token rotation
- ❌ Graceful token expiry handling

**Security Risk:**
- If JWT secret leaks, all tokens compromised
- No way to revoke access without changing global secret
- Poor UX if tokens expire during user session

---

### **Implementation: TokenManager Service**

#### **File: `src/services/tokenManager.ts`** (NEW)

```typescript
/**
 * Secure Token Management Service
 *
 * Architecture:
 * - Access tokens: Memory-only (never persisted)
 * - Refresh tokens: Encrypted in platformStorage
 * - Automatic rotation every 15 min
 * - Graceful expiry handling
 *
 * Integration:
 * - Replaces direct JWT usage in useAuth.ts
 * - Works with existing WebAuthn auth (Week 3-5)
 * - No changes to auth_service API
 */

import * as platformStorage from './platformStorage';
import { CONFIG } from '../config';

export class TokenManager {
  // Memory-only storage (cleared on app close/reload)
  private static accessToken: string | null = null;
  private static tokenExpiry: number | null = null;
  private static refreshInProgress: Promise<boolean> | null = null;

  /**
   * Store access token in memory (never persisted to disk)
   *
   * @param token JWT access token
   * @param expiresIn Seconds until expiry (e.g., 900 for 15 min)
   */
  static setAccessToken(token: string, expiresIn: number) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);

    console.log('[TokenManager] Access token set, expires in', expiresIn, 'seconds');
  }

  /**
   * Get access token (auto-refreshes if expired)
   *
   * @returns Valid access token or null
   */
  static async getAccessToken(): Promise<string | null> {
    // No token stored
    if (!this.accessToken || !this.tokenExpiry) {
      return null;
    }

    // Token still valid (with 30s buffer)
    if (Date.now() < this.tokenExpiry - 30000) {
      return this.accessToken;
    }

    // Token expired or about to expire - refresh it
    console.log('[TokenManager] Access token expired, refreshing...');

    // Prevent concurrent refresh requests
    if (this.refreshInProgress) {
      await this.refreshInProgress;
      return this.accessToken;
    }

    // Start refresh
    this.refreshInProgress = this.refreshAccessToken();
    const success = await this.refreshInProgress;
    this.refreshInProgress = null;

    return success ? this.accessToken : null;
  }

  /**
   * Store refresh token (encrypted at rest)
   *
   * @param refreshToken Long-lived refresh token
   */
  static async setRefreshToken(refreshToken: string) {
    await platformStorage.setItemAsync('refresh_token', refreshToken);
    console.log('[TokenManager] Refresh token stored securely');
  }

  /**
   * Get refresh token from encrypted storage
   *
   * @returns Refresh token or null
   */
  static async getRefreshToken(): Promise<string | null> {
    return await platformStorage.getItemAsync('refresh_token');
  }

  /**
   * Refresh access token using refresh token
   *
   * @returns true if refresh succeeded
   */
  private static async refreshAccessToken(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      console.warn('[TokenManager] No refresh token found');
      return false;
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error('[TokenManager] Refresh failed:', response.status);

        // If refresh token invalid, clear everything
        if (response.status === 401) {
          await this.clearTokens();
        }

        return false;
      }

      const data = await response.json();

      // Update access token (memory)
      this.setAccessToken(data.accessToken, data.expiresIn);

      // Rotate refresh token if server provides new one
      if (data.newRefreshToken) {
        await this.setRefreshToken(data.newRefreshToken);
        console.log('[TokenManager] Refresh token rotated');
      }

      return true;
    } catch (error) {
      console.error('[TokenManager] Refresh error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   *
   * @returns true if valid access token exists
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Clear all tokens (logout)
   */
  static async clearTokens() {
    this.accessToken = null;
    this.tokenExpiry = null;
    await platformStorage.deleteItemAsync('refresh_token');
    console.log('[TokenManager] All tokens cleared');
  }

  /**
   * Get Authorization header value
   *
   * @returns Bearer token header or null
   */
  static async getAuthHeader(): Promise<string | null> {
    const token = await this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }
}
```

---

#### **Update: `src/hooks/useAuth.ts`** (MODIFY)

```typescript
// BEFORE (existing):
import { supabase } from '../services/supabase';
const { data: { session } } = await supabase.auth.getSession();

// AFTER (with TokenManager):
import { TokenManager } from '../services/tokenManager';

export const useAuth = () => {
  const { user, setUser } = useAuthStore();

  // Register/Login (after WebAuthn)
  const registerWithDevice = async () => {
    // ... existing WebAuthn registration code

    const result = await platformDeviceAuth.registerDevice(CONFIG.API_URL);

    if (result.success) {
      // Store tokens using TokenManager
      await TokenManager.setAccessToken(result.accessToken, 900); // 15 min
      await TokenManager.setRefreshToken(result.refreshToken);

      setUser(result.user);
    }

    return result;
  };

  const loginWithDevice = async () => {
    // ... existing WebAuthn login code

    const result = await platformDeviceAuth.authenticateDevice(CONFIG.API_URL);

    if (result.success) {
      // Store tokens using TokenManager
      await TokenManager.setAccessToken(result.accessToken, 900);
      await TokenManager.setRefreshToken(result.refreshToken);

      setUser(result.user);
    }

    return result;
  };

  const logout = async () => {
    await TokenManager.clearTokens();
    setUser(null);
  };

  const isAuthenticated = async () => {
    return await TokenManager.isAuthenticated();
  };

  return {
    user,
    registerWithDevice,
    loginWithDevice,
    logout,
    isAuthenticated,
  };
};
```

---

#### **Update: API Request Interceptor** (NEW)

```typescript
// src/services/api.ts (NEW FILE)
import { TokenManager } from './tokenManager';
import { CONFIG } from '../config';

/**
 * Authenticated fetch wrapper
 * Automatically adds auth header and refreshes token if needed
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Get auth header (auto-refreshes if expired)
  const authHeader = await TokenManager.getAuthHeader();

  if (!authHeader) {
    throw new Error('Not authenticated');
  }

  // Make request with auth header
  const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  });

  // If 401, try refreshing token once
  if (response.status === 401) {
    console.log('[API] Got 401, attempting token refresh...');

    const refreshed = await TokenManager.getAccessToken();
    if (refreshed) {
      // Retry request with new token
      return fetch(`${CONFIG.API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${refreshed}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Refresh failed - user needs to re-login
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
};
```

---

#### **Backend: Add Refresh Endpoint** (NEW)

```typescript
// backend/services/auth_service/src/refresh.ts
import jwt from 'jsonwebtoken';
import { contentDB } from '@shared/db/clients';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET; // Different secret!

app.post('/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return reply.code(400).send({ error: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

    // Check if user still exists
    const { rows: [user] } = await contentDB.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [payload.userId]
    );

    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    // Issue new access token (15 min)
    const newAccessToken = jwt.sign(
      { userId: payload.userId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Optional: Rotate refresh token for extra security
    const newRefreshToken = jwt.sign(
      { userId: payload.userId },
      REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    return {
      accessToken: newAccessToken,
      expiresIn: 900, // 15 minutes in seconds
      newRefreshToken, // Client should update stored refresh token
    };
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return reply.code(401).send({ error: 'Invalid refresh token' });
  }
});
```

---

### **Benefits**

✅ **Security:**
- Access tokens never hit disk (memory-only)
- Refresh tokens encrypted at rest (platformStorage)
- Different secrets for access vs refresh
- Automatic token rotation

✅ **UX:**
- Seamless auto-refresh (users don't notice)
- 15-min access tokens + 30-day refresh
- Graceful expiry handling

✅ **Compliance:**
- Follows OAuth 2.0 best practices
- Reduces attack surface (short-lived access tokens)

---

## 📝 Phase 3 Addition: Optional Post Encryption

### **When to Implement:** After Phase 2 (Week 17-18 or later)

**Duration:** 2-3 weeks
**Complexity:** Medium
**Priority:** Medium (optional feature)

---

### **Problem: Public-Only Posts**

Your existing plan (SECURITY_STATUS.md):
- ✅ Posts use `author_pseudonym` (not user_id) - Week 12
- ✅ Content sanitization (XSS protection)
- ❌ All posts are public (server can read)

**Use Cases Requiring Privacy:**
- Sensitive union strategy discussions
- Whistleblower coordination
- High-stakes organizing in authoritarian contexts

**Solution:** Optional E2EE for posts (hybrid approach)

---

### **Hybrid Approach**

**Default: Public Posts** (90% of content)
- Not encrypted
- Server can moderate
- Searchable, indexable
- Visible to all union members

**Opt-In: Private Posts** (10% of content)
- End-to-end encrypted
- Server cannot read
- Only decryptable by union members with shared group key
- Trade-off: No server-side moderation

---

### **Implementation**

#### **Updated Types: `src/types/index.ts`**

```typescript
export interface Post {
  id: string;
  union_id: string;
  author_pseudonym: string;

  // Encryption flag
  is_encrypted: boolean;

  // Content (plaintext OR encrypted)
  content: string; // If is_encrypted=true, this is ciphertext

  // Encryption metadata (only if is_encrypted=true)
  group_key_version?: number; // Which union group key was used
  encrypted_content_key?: string; // Content key encrypted for user

  // Metadata (always public)
  is_public: boolean;
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface UnionGroupKey {
  union_id: string;
  key_version: number;
  encrypted_key: string; // Encrypted for each member
  created_at: string;
}
```

---

#### **Client: Group Key Management** (NEW)

```typescript
// src/services/e2ee/groupEncryption.ts
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from 'expo-crypto';
import { p256 } from '@noble/curves/p256';

/**
 * Generate group key for union
 *
 * @param unionId Union ID
 * @returns Group key (32 bytes)
 */
export const generateGroupKey = (): Uint8Array => {
  return randomBytes(32);
};

/**
 * Encrypt group key for a member
 *
 * @param groupKey Group key to encrypt
 * @param memberPublicKey Member's P-256 public key
 * @returns Encrypted group key
 */
export const encryptGroupKeyForMember = (
  groupKey: Uint8Array,
  memberPublicKey: string
): string => {
  // Use ECIES (Elliptic Curve Integrated Encryption Scheme)
  // Simplified: In production, use @noble/ciphers ECIES

  const publicKeyBytes = Buffer.from(memberPublicKey, 'hex');

  // Derive shared secret using ECDH
  const sharedSecret = p256.getSharedSecret(privateKey, publicKeyBytes);

  // Encrypt group key with shared secret
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(sharedSecret.slice(0, 32), nonce);
  const encrypted = cipher.encrypt(groupKey);

  return Buffer.concat([nonce, encrypted]).toString('base64');
};

/**
 * Decrypt group key
 *
 * @param encryptedGroupKey Encrypted group key
 * @param privateKey Member's private key
 * @returns Decrypted group key
 */
export const decryptGroupKey = (
  encryptedGroupKey: string,
  privateKey: string
): Uint8Array => {
  const data = Buffer.from(encryptedGroupKey, 'base64');
  const nonce = data.slice(0, 24);
  const encrypted = data.slice(24);

  // Derive shared secret
  const sharedSecret = p256.getSharedSecret(
    Buffer.from(privateKey, 'hex'),
    senderPublicKey
  );

  // Decrypt
  const cipher = xchacha20poly1305(sharedSecret.slice(0, 32), nonce);
  return cipher.decrypt(encrypted);
};

/**
 * Encrypt post content with group key
 *
 * @param content Plaintext post content
 * @param groupKey Union group key
 * @returns Encrypted content
 */
export const encryptPost = (
  content: string,
  groupKey: Uint8Array
): { ciphertext: string; contentKey: string } => {
  // Generate random content key
  const contentKey = randomBytes(32);

  // Encrypt post with content key
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(contentKey, nonce);
  const encrypted = cipher.encrypt(Buffer.from(content));
  const ciphertext = Buffer.concat([nonce, encrypted]).toString('base64');

  // Encrypt content key with group key
  const keyNonce = randomBytes(24);
  const keyCipher = xchacha20poly1305(groupKey, keyNonce);
  const encryptedContentKey = keyCipher.encrypt(contentKey);
  const contentKeyEncrypted = Buffer.concat([keyNonce, encryptedContentKey]).toString('base64');

  return { ciphertext, contentKey: contentKeyEncrypted };
};

/**
 * Decrypt post content
 *
 * @param ciphertext Encrypted post
 * @param encryptedContentKey Encrypted content key
 * @param groupKey Union group key
 * @returns Plaintext content
 */
export const decryptPost = (
  ciphertext: string,
  encryptedContentKey: string,
  groupKey: Uint8Array
): string => {
  // Decrypt content key with group key
  const keyData = Buffer.from(encryptedContentKey, 'base64');
  const keyNonce = keyData.slice(0, 24);
  const encryptedKey = keyData.slice(24);

  const keyCipher = xchacha20poly1305(groupKey, keyNonce);
  const contentKey = keyCipher.decrypt(encryptedKey);

  // Decrypt content with content key
  const data = Buffer.from(ciphertext, 'base64');
  const nonce = data.slice(0, 24);
  const encrypted = data.slice(24);

  const cipher = xchacha20poly1305(contentKey, nonce);
  const plaintext = cipher.decrypt(encrypted);

  return plaintext.toString('utf8');
};
```

---

#### **UI: Post Creation with Encryption Toggle**

```typescript
// src/screens/CreatePostScreen.tsx
import { encryptPost, generateGroupKey } from '../services/e2ee/groupEncryption';

export const CreatePostScreen = ({ unionId }: { unionId: string }) => {
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async () => {
    let postData: any = {
      union_id: unionId,
      content: sanitizedContent,
      is_encrypted: isPrivate,
    };

    if (isPrivate) {
      // Get union group key
      const groupKey = await getUnionGroupKey(unionId);

      // Encrypt post
      const { ciphertext, contentKey } = encryptPost(content, groupKey);

      postData.content = ciphertext;
      postData.encrypted_content_key = contentKey;
      postData.group_key_version = 1;
    }

    await apiFetch('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  };

  return (
    <View>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Write your post..."
      />

      <View style={styles.privacyToggle}>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
        />
        <Text>🔒 Private (End-to-End Encrypted)</Text>
      </View>

      {isPrivate && (
        <Text style={styles.warning}>
          ⚠️ Private posts cannot be moderated by admins.
          Only union members can decrypt and view this content.
        </Text>
      )}

      <Button title="Post" onPress={handleSubmit} />
    </View>
  );
};
```

---

#### **Backend: Store Encrypted Posts**

```typescript
// services/messaging_service/src/posts.ts
app.post('/posts', async (req, reply) => {
  const { union_id, content, is_encrypted, encrypted_content_key, group_key_version } = req.body;
  const userId = req.user.userId;

  // Verify membership
  const isMember = await verifyMembership(userId, union_id);
  if (!isMember) {
    return reply.code(403).send({ error: 'Not a union member' });
  }

  // Get user's pseudonym for this union
  const pseudonym = await getPseudonym(userId, union_id);

  // Store post (content is either plaintext or ciphertext)
  const { rows: [post] } = await contentDB.query(`
    INSERT INTO posts (
      union_id,
      author_pseudonym,
      content,
      is_encrypted,
      encrypted_content_key,
      group_key_version
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    union_id,
    pseudonym,
    content, // Plaintext OR ciphertext (server doesn't know)
    is_encrypted,
    encrypted_content_key || null,
    group_key_version || null
  ]);

  return post;
});
```

---

### **Benefits**

✅ **Privacy:**
- Sensitive discussions truly private
- Server cannot read encrypted posts
- Only union members can decrypt

✅ **Flexibility:**
- Default: public (90% of posts)
- Opt-in: private (10% for sensitive topics)
- User controls privacy level

✅ **Trade-offs Managed:**
- Clear warning: encrypted posts can't be moderated
- Union admins can disable private posts if needed
- Abuse handled via member reporting/voting

---

## 📅 **Updated Implementation Timeline**

### **Phase 1: Core Backend** (14 weeks - UNCHANGED from existing plan)
Follow SECURITY_STATUS.md exactly:
- Week 1-2: Backend setup
- Week 3-5: WebAuthn auth
- Week 6: Media pipeline
- Week 7: E2EE DMs ✅
- Week 8: Union service
- Week 9-11: Vote encryption (blind sigs) ✅
- Week 12: Messaging service
- Week 13-14: Testing
- **Result:** 86% compliance

---

### **Phase 2: Infrastructure + Token Management** (5-9 weeks - ENHANCED)
From SECURITY_ACCEPTANCE_CRITERIA_PHASE_2.md + TokenManager:
- Week 15: Cloudflare CDN/WAF
- Week 16: Tor .onion mirror
- Week 17-18: KMS/HSM integration
- **Week 19: Token Management ⭐ (NEW)**
  - Implement TokenManager service
  - Add refresh endpoint to auth_service
  - Update useAuth.ts to use TokenManager
  - Add apiFetch() wrapper
  - Test token refresh flow
- Week 20-21: Monitoring & observability
- Week 22-23: Incident response & operations
- **Result:** 93% compliance

---

### **Phase 3: Post Encryption** (2-3 weeks - NEW)
Optional feature for high-security unions:
- Week 24: Group key management
  - Generate and distribute union group keys
  - Encrypt keys for each member
  - Store encrypted keys in membership_db
- Week 25: Post encryption UI
  - Add privacy toggle to post creation
  - Implement encryption/decryption
  - Display encrypted posts indicator
- Week 26: Testing
  - Test key distribution
  - Test encryption/decryption
  - Test mixed public/private posts
- **Result:** 95%+ compliance

---

## 📊 **Compliance Impact**

| Phase | Features | Compliance | Timeline |
|-------|----------|------------|----------|
| **Phase 1** (existing) | WebAuthn, E2EE DMs, Blind votes | 86% | 14 weeks |
| **Phase 2** (enhanced) | + TokenManager, CDN, Tor, KMS | 93% | +5-9 weeks |
| **Phase 3** (new) | + Post encryption (optional) | 95%+ | +2-3 weeks |
| **TOTAL** | All features | **95%+** | **21-26 weeks** |

---

## 💰 **Cost Impact**

| Component | Monthly Cost |
|-----------|--------------|
| **Phase 1** (existing) | $175-375 |
| **Phase 2** (enhanced) | +$85-174 |
| **Phase 3** (new) | +$0-25 (negligible) |
| **TOTAL** | **$260-574** |

**Optimization Target:** $300-450/mo

---

## 🎯 **Integration Checklist**

### **For Token Management (Week 19)**
- [ ] Create `src/services/tokenManager.ts`
- [ ] Update `src/hooks/useAuth.ts` to use TokenManager
- [ ] Create `src/services/api.ts` (apiFetch wrapper)
- [ ] Add `/auth/refresh` endpoint to auth_service
- [ ] Update all API calls to use apiFetch()
- [ ] Test token refresh flow
- [ ] Test logout clears all tokens
- [ ] Test auto-refresh on 401

### **For Post Encryption (Week 24-26)**
- [ ] Create `src/services/e2ee/groupEncryption.ts`
- [ ] Add encryption toggle to CreatePostScreen
- [ ] Update Post type with encryption fields
- [ ] Implement group key distribution
- [ ] Add decrypt logic to post rendering
- [ ] Add encrypted post indicator UI
- [ ] Test public + private posts coexist
- [ ] Document trade-offs for users

---

## 📚 **Summary**

**This addendum adds TWO critical enhancements:**

1. **Token Management (Phase 2, Week 19)**
   - Separates access/refresh tokens
   - Memory-only access tokens
   - Automatic rotation
   - Better security + UX

2. **Post Encryption (Phase 3, Weeks 24-26)**
   - Optional E2EE for sensitive posts
   - Hybrid: public (default) + private (opt-in)
   - Group key encryption
   - Clear trade-off warnings

**Integration:**
- Fits into existing roadmap seamlessly
- No breaking changes to Phase 1 plans
- Optional enhancements (can skip Phase 3 if not needed)

**Next Steps:**
1. Complete Phase 1 (14 weeks) as planned
2. Add Week 19 (TokenManager) to Phase 2
3. Decide if Phase 3 (post encryption) is needed

---

**Last Updated:** October 22, 2025
**Status:** Addendum to SECURITY_STATUS.md and SECURITY_ACCEPTANCE_CRITERIA_PHASE_2.md
