# Authentication System Redesign Plan - REVISED
## Risk-Mitigated Implementation Strategy

**Date**: 2025-10-21
**Status**: Planning Phase - Revised for Safety
**Goal**: Add username/password layer to device token auth WITHOUT breaking existing functionality

---

## 🚨 CRITICAL FINDINGS FROM CODEBASE ANALYSIS

### Issue 1: Email Verification System Deeply Integrated
**Impact**: 23+ files depend on email verification

**Files Using Email Verification**:
1. `useEmailVerificationGuard.ts` - Core guard hook
2. `EmailVerificationBanner.tsx` - UI component
3. `emailVerification.ts` - Service layer
4. 23+ screens using the guard:
   - WorkerProposalsTab.tsx
   - OrganizeVoteTab.tsx
   - PlatformTab.tsx
   - PrioritiesTab.tsx
   - ProposalsTab.tsx (multiple)
   - VoteLaunchTab.tsx
   - CreateDebateScreen.tsx
   - CreateUnionScreen.tsx
   - DebateDetailScreen.tsx
   - And 14 more...

**Risk**: Removing email breaks all protected actions in the app
**Solution**: Keep email verification system, disable via feature flag

### Issue 2: user.email Referenced Throughout
**Impact**: Multiple core systems expect email field

**Critical References**:
1. `useSessionTimeout.ts` (lines 55, 92) - Audit logging on session expiry
2. `OnboardingScreen.tsx` (line 71) - Saves email to profiles table
3. `EditProfileScreen.tsx` - Profile editing
4. `auditLog.ts` (line 69) - loginFailed expects email parameter

**Risk**: TypeScript errors, runtime crashes if user.email is undefined
**Solution**: Add username field, make email optional, update all references

### Issue 3: Navigation Expects Specific Screens
**Impact**: AppNavigator.tsx hardcoded to specific screens

**Current Logic** (AppNavigator.tsx:143-155):
```typescript
if (CONFIG.USE_DEVICE_AUTH) {
  if (hasDeviceKeypair || canAutoLogin()) {
    return <Stack.Screen name="DeviceLogin" component={DeviceLoginScreen} />;
  } else {
    return <Stack.Screen name="DeviceRegister" component={DeviceRegisterScreen} />;
  }
} else {
  return <Stack.Screen name="Auth" component={AuthScreen} />;
}
```

**Risk**: Deleting DeviceRegisterScreen/DeviceLoginScreen breaks navigation
**Solution**: Repurpose these screens instead of deleting them

### Issue 4: Audit Logging Expects Email OR Username
**Impact**: Audit trails broken if we only have username

**Current Signatures**:
```typescript
loginSuccess(userId: string, username: string, deviceId?)
loginFailed(email: string, errorMessage: string, deviceId?)
signupSuccess(userId: string, email: string, deviceId?)
sessionExpired(userId: string, email: string, deviceId?)
```

**Risk**: Audit system crashes if email is undefined
**Solution**: Update audit helpers to accept username OR email

### Issue 5: Database Schema Mismatch
**Impact**: Backend users table missing columns

**Current Backend Schema** (backend/services/auth/src/db.ts:22-31):
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  device_id TEXT UNIQUE,
  public_key TEXT NOT NULL,
  platform TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

**Missing**: username, password_hash, email
**Risk**: Cannot store username/password
**Solution**: ALTER TABLE to add columns

### Issue 6: Onboarding Saves to Supabase Profiles
**Impact**: Profile creation incompatible with new auth

**Current Code** (OnboardingScreen.tsx:67-78):
```typescript
await supabase.from('profiles').upsert({
  id: user.id,
  email: user.email!,  // REQUIRES user.email
  display_name: sanitizedProfile.display_name,
  username_normalized: (sanitizedProfile.username || '').toLowerCase(),
  bio: sanitizedProfile.bio,
  last_seen: new Date().toISOString(),
});
```

**Risk**: Crashes if user.email is null
**Solution**: Make email optional in profiles insert

### Issue 7: TypeScript Type Definitions
**Impact**: AuthUser interface expects optional email

**Current Definition** (src/types/auth.ts:12-18):
```typescript
export interface AuthUser {
  id: string;
  created_at: string;
  last_login_at?: string;
  email?: string;          // Already optional - GOOD!
  email_verified?: boolean;
}
```

**Risk**: Low - email already optional
**Solution**: Add username to AuthUser interface

---

## REVISED IMPLEMENTATION STRATEGY

### Core Principles
1. **No Breaking Changes** - All existing code continues to work
2. **Feature Flag Controlled** - Gradual rollout capability
3. **Backward Compatible** - Support both email and username
4. **Fail-Safe Defaults** - Graceful degradation if something breaks

### Key Changes from Original Plan
| Original Plan | Revised Plan | Reason |
|---------------|--------------|--------|
| Delete DeviceRegisterScreen | Repurpose it | Navigation depends on it |
| Delete DeviceLoginScreen | Repurpose it | Navigation depends on it |
| Remove email field | Make email optional | Too many dependencies |
| Remove email verification | Disable via flag | 23+ files depend on it |
| Delete Supabase auth methods | Keep as deprecated | Backward compatibility |

---

## PHASE-BY-PHASE IMPLEMENTATION

### PHASE 0: Preparation & Safety (NEW)
**Purpose**: Set up safety nets before making changes
**Time**: 1 hour

#### Step 0.1: Create Feature Flags
**File**: `src/config.ts`

**Add**:
```typescript
export const CONFIG = {
  // ... existing flags ...

  /**
   * Hybrid Auth Feature Flag
   * When true: Username/Password required alongside device token
   * When false: Device token only (current behavior)
   */
  USE_HYBRID_AUTH: parseBoolean(
    process.env.EXPO_PUBLIC_USE_HYBRID_AUTH,
    false // Default: disabled during migration
  ),

  /**
   * Require Username Feature Flag
   * When true: Username field required at registration
   * When false: Username optional (backward compatible)
   */
  REQUIRE_USERNAME: parseBoolean(
    process.env.EXPO_PUBLIC_REQUIRE_USERNAME,
    false // Default: optional
  ),
};
```

#### Step 0.2: Add Username to TypeScript Types
**File**: `src/types/auth.ts`

**Modify AuthUser**:
```typescript
export interface AuthUser {
  id: string;
  created_at: string;
  last_login_at?: string;
  email?: string;
  email_verified?: boolean;
  username?: string;  // NEW - optional for backward compatibility
}
```

#### Step 0.3: Create Compatibility Layer for Audit Logging
**File**: `src/services/auditLog.ts`

**Update helpers**:
```typescript
export const auditHelpers = {
  loginSuccess: (userId: string, identifier: string, deviceId?: string | null) => {
    // identifier can be username or email
    const isEmail = identifier.includes('@');
    return logAuditEvent({
      userId,
      username: isEmail ? null : identifier,
      actionType: 'login_success',
      entityType: 'user',
      entityId: userId,
      description: `User logged in successfully${isEmail ? ' (email)' : ' (username)'}`,
      metadata: isEmail ? { email: identifier } : undefined,
      deviceId,
    });
  },

  loginFailed: (identifier: string, errorMessage: string, deviceId?: string | null) => {
    // identifier can be username or email
    const isEmail = identifier.includes('@');
    return logAuditEvent({
      actionType: 'login_failed',
      entityType: 'user',
      entityId: null,
      description: `Failed login attempt for ${identifier}`,
      metadata: isEmail ? { email: identifier } : { username: identifier },
      errorMessage,
      success: false,
      deviceId,
    });
  },

  signupSuccess: (userId: string, identifier: string, deviceId?: string | null) => {
    const isEmail = identifier.includes('@');
    return logAuditEvent({
      userId,
      username: isEmail ? null : identifier,
      actionType: 'signup_success',
      entityType: 'user',
      entityId: userId,
      description: `User signed up successfully${isEmail ? ' (email)' : ' (username)'}`,
      metadata: isEmail ? { email: identifier } : undefined,
      deviceId,
    });
  },

  sessionExpired: (userId: string, identifier: string, deviceId?: string | null) => {
    const isEmail = identifier.includes('@');
    return logAuditEvent({
      userId,
      username: isEmail ? null : identifier,
      actionType: 'session_expired',
      entityType: 'user',
      entityId: userId,
      description: 'Session expired due to inactivity',
      metadata: isEmail ? { email: identifier } : undefined,
      deviceId,
    });
  },

  // ... other helpers ...
};
```

#### Step 0.4: Update useSessionTimeout to Handle Missing Email
**File**: `src/hooks/useSessionTimeout.ts`

**Modify** (lines 55, 92):
```typescript
// Line 55
if ((user.email || user.username) && deviceId) {
  await auditHelpers.sessionExpired(user.id, user.email || user.username!, deviceId);
}

// Line 92
if ((user.email || user.username) && deviceId) {
  await auditHelpers.sessionExpired(user.id, user.email || user.username!, deviceId);
}
```

**Testing**:
- [ ] Test with email-based user (backward compatibility)
- [ ] Test with username-based user (new system)
- [ ] Test with neither (graceful fallback)

---

### PHASE 1: Backend Preparation
**Purpose**: Add username/password support to backend
**Time**: 2-3 hours
**Dependencies**: Phase 0

#### Step 1.1: Update Database Schema
**File**: `backend/services/auth/src/db.ts`

**Add to initDatabase()**:
```typescript
// Alter users table to add username and password
await db.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);
`);

// Create index for username lookups
await db.query(`
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

console.log('✅ Database schema updated with username/password support');
```

**Testing**:
- [ ] Run migration on test database
- [ ] Verify columns added
- [ ] Verify index created
- [ ] Test existing device token auth still works

#### Step 1.2: Add Password Utilities
**File**: `backend/services/auth/src/password.ts` (NEW)

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password too long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain number' };
  }
  return { valid: true };
}

export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { valid: false, error: 'Username too short (min 3 chars)' };
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username too long (max 20 chars)' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores' };
  }
  return { valid: true };
}
```

**Dependencies**: Install bcrypt
```bash
cd backend/services/auth
npm install bcrypt @types/bcrypt
```

**Testing**:
- [ ] Test password hashing creates different hashes
- [ ] Test password verification works
- [ ] Test password validation rules
- [ ] Test username validation rules

#### Step 1.3: Modify Registration Endpoint (OPTIONAL FIELDS)
**File**: `backend/services/auth/src/routes/auth.ts`

**Modify POST /auth/register-device** (Make username/password OPTIONAL):
```typescript
app.post('/auth/register-device', async (request, reply) => {
  try {
    const {
      publicKey,
      deviceId,
      platform,
      deviceName,
      deviceModel,
      osVersion,
      username,      // OPTIONAL
      password,      // OPTIONAL
    } = request.body as {
      publicKey: string;
      deviceId: string;
      platform: 'web' | 'ios' | 'android';
      deviceName?: string;
      deviceModel?: string;
      osVersion?: string;
      username?: string;    // OPTIONAL
      password?: string;    // OPTIONAL
    };

    // Validate required fields (device token fields)
    if (!publicKey || !deviceId || !platform) {
      return reply.code(400).send({
        error: 'Missing required fields',
        required: ['publicKey', 'deviceId', 'platform'],
      });
    }

    // If username provided, validate and check for duplicates
    let passwordHash: string | null = null;
    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return reply.code(400).send({
          error: 'Invalid username',
          message: usernameValidation.error,
        });
      }

      // Check if username already exists
      const { rows: existingUsers } = await db.query(
        'SELECT user_id FROM users WHERE username = $1',
        [username]
      );

      if (existingUsers.length > 0) {
        return reply.code(409).send({
          error: 'Username already taken',
          message: 'Please choose a different username',
        });
      }

      // If username provided, password is required
      if (!password) {
        return reply.code(400).send({
          error: 'Password required',
          message: 'Password is required when username is provided',
        });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return reply.code(400).send({
          error: 'Invalid password',
          message: passwordValidation.error,
        });
      }

      // Hash password
      passwordHash = await hashPassword(password);
    }

    // Check if device already registered
    const { rows: existingDevices } = await db.query(
      'SELECT user_id FROM users WHERE device_id = $1',
      [deviceId]
    );

    if (existingDevices.length > 0) {
      return reply.code(409).send({
        error: 'Device already registered',
        message: 'This device is already registered. Use login instead.',
      });
    }

    // Generate user ID
    const userId = ulid();
    const displayName = deviceName || `${platform}_user_${userId.substring(0, 8)}`;

    // Insert user (username and password_hash can be NULL)
    await db.query(
      `INSERT INTO users (
        user_id, device_id, public_key, platform,
        display_name, username, password_hash, last_login
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, deviceId, publicKey, platform, displayName, username || null, passwordHash]
    );

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(userId, deviceId);

    // ... rest of registration logic ...

    return {
      success: true,
      user: {
        userId,
        username: username || null,
        displayName,
        platform,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  } catch (error) {
    // ... error handling ...
  }
});
```

**Testing**:
- [ ] Test registration WITH username/password
- [ ] Test registration WITHOUT username/password (device-only)
- [ ] Test duplicate username rejection
- [ ] Test weak password rejection

#### Step 1.4: Add Hybrid Login Endpoint
**File**: `backend/services/auth/src/routes/auth.ts`

**Add NEW endpoint**:
```typescript
/**
 * POST /auth/login-hybrid
 *
 * Two-factor authentication (OPTIONAL second factor):
 * 1. Device token (signature) - REQUIRED
 * 2. Username/password - OPTIONAL (if user has set it)
 */
app.post('/auth/login-hybrid', async (request, reply) => {
  try {
    const {
      username,
      password,
      challenge,
      signature,
      deviceId,
      publicKey,
    } = request.body as {
      username?: string;
      password?: string;
      challenge: string;
      signature: string;
      deviceId: string;
      publicKey: string;
    };

    // Validate required fields (device token)
    if (!challenge || !signature || !deviceId || !publicKey) {
      return reply.code(400).send({
        error: 'Missing required fields',
        required: ['challenge', 'signature', 'deviceId', 'publicKey'],
      });
    }

    // LAYER 1: Verify device token (REQUIRED)

    // Verify challenge exists and not expired
    const { rows: challenges } = await db.query(
      'SELECT * FROM auth_challenges WHERE challenge = $1 AND expires_at > NOW()',
      [challenge]
    );

    if (challenges.length === 0) {
      return reply.code(401).send({
        error: 'Invalid or expired challenge',
      });
    }

    // Find user by device_id
    const { rows: users } = await db.query(
      'SELECT * FROM users WHERE device_id = $1',
      [deviceId]
    );

    if (users.length === 0) {
      return reply.code(404).send({
        error: 'Device not registered',
      });
    }

    const user = users[0];

    // Verify signature
    const isValidSignature = await verifySignature(
      challenge,
      signature,
      publicKey,
      user.platform
    );

    if (!isValidSignature) {
      app.log.warn({
        action: 'login_failed',
        reason: 'invalid_signature',
        deviceId: deviceId.substring(0, 8),
      });

      return reply.code(401).send({
        error: 'Invalid credentials',
        message: 'Authentication failed',
      });
    }

    // Verify public key matches
    if (user.public_key !== publicKey) {
      return reply.code(401).send({
        error: 'Public key mismatch',
      });
    }

    // LAYER 2: Verify username/password (IF user has set it)

    if (user.username && user.password_hash) {
      // User has set username/password, so it's required
      if (!username || !password) {
        return reply.code(401).send({
          error: 'Username and password required',
          message: 'This account requires username/password authentication',
        });
      }

      // Verify username matches
      if (user.username !== username) {
        app.log.warn({
          action: 'login_failed',
          reason: 'username_mismatch',
        });

        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        app.log.warn({
          action: 'login_failed',
          reason: 'invalid_password',
          username,
        });

        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        });
      }
    }
    // If user hasn't set username/password, skip Layer 2 (device token only)

    // Both layers passed! Generate tokens
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    const { accessToken, refreshToken } = await generateTokens(user.user_id, deviceId);

    const sessionId = ulid();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      `INSERT INTO device_sessions (session_id, user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, user.user_id, accessToken, refreshToken, expiresAt]
    );

    // Delete used challenge
    await db.query('DELETE FROM auth_challenges WHERE challenge = $1', [challenge]);

    app.log.info({
      action: 'hybrid_login_success',
      username: user.username || 'device-only',
      userId: user.user_id.substring(0, 8),
    });

    return {
      success: true,
      user: {
        userId: user.user_id,
        username: user.username || null,
        displayName: user.display_name,
        platform: user.platform,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  } catch (error) {
    app.log.error({ error }, 'Hybrid login failed');
    return reply.code(500).send({
      error: 'Login failed',
    });
  }
});
```

**Testing**:
- [ ] Test login with device token + username/password
- [ ] Test login with device token only (no username set)
- [ ] Test login fails with correct device but wrong password
- [ ] Test login fails with wrong device
- [ ] Test login fails with expired challenge

---

### PHASE 2: Frontend - Repurpose Existing Screens (SAFER)
**Purpose**: Update existing screens instead of creating new ones
**Time**: 3-4 hours
**Dependencies**: Phase 1

#### Step 2.1: Repurpose DeviceRegisterScreen
**File**: `src/screens/DeviceRegisterScreen.tsx`

**Strategy**: Add optional username/password section at the end

**Modify** (add after device registration success):
```typescript
const [showUsernameSetup, setShowUsernameSetup] = useState(false);
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

const handleRegister = async () => {
  setLoading(true);

  try {
    const { data, error } = await registerWithDevice();

    if (error) {
      Alert.alert('Registration Failed', error.message);
      setLoading(false);
    } else if (data) {
      // Registration successful
      if (CONFIG.REQUIRE_USERNAME) {
        // Show username/password setup
        setShowUsernameSetup(true);
        setLoading(false);
      } else {
        // Optional - ask user if they want to set username/password
        Alert.alert(
          'Account Created! 🎉',
          'Your device has been registered.\n\nWould you like to add a username and password for extra security?',
          [
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => {
                // Done - navigate to app
                setLoading(false);
              }
            },
            {
              text: 'Add Username/Password',
              onPress: () => {
                setShowUsernameSetup(true);
                setLoading(false);
              }
            }
          ]
        );
      }
    }
  } catch (error) {
    Alert.alert('Error', 'An unexpected error occurred');
    setLoading(false);
  }
};

// Add username/password setup UI
if (showUsernameSetup) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Username & Password</Text>
          <Text style={styles.subtitle}>
            Optional second layer of security
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleAddUsernamePassword}
          >
            <Text style={styles.buttonText}>Save & Continue</Text>
          </TouchableOpacity>

          {!CONFIG.REQUIRE_USERNAME && (
            <TouchableOpacity onPress={() => setShowUsernameSetup(false)}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Testing**:
- [ ] Test device registration still works
- [ ] Test optional username/password prompt appears
- [ ] Test skipping username/password
- [ ] Test adding username/password
- [ ] Test with REQUIRE_USERNAME=true

#### Step 2.2: Repurpose DeviceLoginScreen
**File**: `src/screens/DeviceLoginScreen.tsx`

**Strategy**: Add username/password fields if user has set them

**Modify**:
```typescript
const [needsUsername, setNeedsUsername] = useState(false);
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');

const handleManualLogin = async () => {
  setLoading(true);

  try {
    // First, check if user has username/password set
    const keypair = await deviceAuth.getDeviceKeypair();
    if (!keypair) {
      throw new Error('No device keypair found');
    }

    // Try device-only login first
    const { data, error } = await loginWithDevice();

    if (error && error.message.includes('Username and password required')) {
      // User has username/password set, show input fields
      setNeedsUsername(true);
      setLoading(false);
      return;
    }

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else if (data) {
      // Success
      console.log('Login successful');
    }
  } catch (error) {
    Alert.alert('Error', 'An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};

const handleHybridLogin = async () => {
  setLoading(true);

  try {
    const { data, error } = await loginWithDevice(username, password);

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else if (data) {
      console.log('Login successful');
    }
  } catch (error) {
    Alert.alert('Error', 'An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};

// Add username/password input UI
if (needsUsername) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Enter your username and password
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleHybridLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
```

**Testing**:
- [ ] Test login with device-only user
- [ ] Test login with username/password user
- [ ] Test wrong password fails
- [ ] Test auto-login still works

---

### PHASE 3: Frontend - Update useAuth Hook (CRITICAL)
**Purpose**: Add username/password methods WITHOUT breaking existing code
**Time**: 2-3 hours
**Dependencies**: Phase 2

#### Step 3.1: Update useAuth Hook
**File**: `src/hooks/useAuth.ts`

**KEEP ALL EXISTING METHODS** - Add new ones alongside:

```typescript
/**
 * Add username/password to existing device registration
 * Called after device keypair is already registered
 */
const addUsernamePassword = async (
  username: string,
  password: string
): Promise<{
  data?: { user: any };
  error?: Error;
}> => {
  try {
    const keypair = await deviceAuth.getDeviceKeypair();
    if (!keypair) {
      throw new Error('No device keypair found');
    }

    const deviceInfo = await deviceAuth.getDeviceInfo();

    // Call backend to update user with username/password
    const response = await fetch(`${CONFIG.API_URL}/auth/add-username-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        publicKey: keypair.publicKey,
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add username/password');
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Failed to add username/password:', error);
    return { error: error as Error };
  }
};

/**
 * Update loginWithDevice to support optional username/password
 */
const loginWithDevice = async (
  username?: string,
  password?: string
): Promise<{
  data?: { user: any; tokens: any };
  error?: Error;
}> => {
  try {
    if (!CONFIG.USE_DEVICE_AUTH) {
      throw new Error('Device authentication is not enabled.');
    }

    if (!deviceAuth.isDeviceAuthSupported()) {
      throw new Error('Device authentication not supported on this platform');
    }

    const keypair = await deviceAuth.getDeviceKeypair();
    if (!keypair) {
      throw new Error('No device keypair found. Please register first.');
    }

    const deviceInfo = await deviceAuth.getDeviceInfo();

    // Request challenge
    const challengeResponse = await fetch(`${CONFIG.API_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        platform: deviceInfo.platform,
      }),
    });

    if (!challengeResponse.ok) {
      throw new Error('Failed to get challenge');
    }

    const { challenge } = await challengeResponse.json();

    // Sign challenge
    const signature = await deviceAuth.signChallenge(challenge, keypair.privateKey);

    // Hybrid login (username/password optional)
    const loginResponse = await fetch(`${CONFIG.API_URL}/auth/login-hybrid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username || undefined,
        password: password || undefined,
        challenge,
        signature,
        deviceId: deviceInfo.deviceId,
        publicKey: keypair.publicKey,
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Authentication failed');
    }

    const loginData = await loginResponse.json();

    // Store session
    await deviceAuth.storeSession({
      user: loginData.user,
      tokens: {
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
      },
    });

    // Update state
    setUser(loginData.user);
    setSession({ user: loginData.user, tokens: loginData });

    return { data: { user: loginData.user, tokens: loginData } };
  } catch (error) {
    console.error('Login failed:', error);
    return { error: error as Error };
  }
};
```

**KEEP THESE METHODS** (don't delete):
```typescript
// Keep for backward compatibility
const signUp = async (email: string, password: string) => { ... };
const signInWithPassword = async (email: string, password: string) => { ... };
const resetPassword = async (email: string) => { ... };
const updatePassword = async (newPassword: string) => { ... };
```

**Return updated methods**:
```typescript
return {
  user,
  session,
  isLoading,
  // Device auth methods (updated)
  registerWithDevice,
  loginWithDevice,          // Now supports optional username/password
  addUsernamePassword,      // NEW
  canAutoLogin,
  hasDeviceKeypair,
  // Supabase methods (deprecated but kept)
  signUp,
  signInWithPassword,
  resetPassword,
  updatePassword,
  signInWithOTP,
  verifyOTP,
  // Shared methods
  signOut,
};
```

**Testing**:
- [ ] Test existing device auth still works
- [ ] Test new hybrid login works
- [ ] Test addUsernamePassword works
- [ ] Test Supabase methods still work (deprecated)

---

### PHASE 4: Update OnboardingScreen (CRITICAL)
**Purpose**: Make email optional in profile creation
**Time**: 1 hour
**Dependencies**: Phase 3

#### Step 4.1: Update OnboardingScreen
**File**: `src/screens/OnboardingScreen.tsx`

**Modify** (line 71):
```typescript
// Create or update profile with sanitized data
const { error: upsertError } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    email: user.email || null,  // CHANGED: Make optional
    display_name: sanitizedProfile.display_name,
    username_normalized: (sanitizedProfile.username || '').toLowerCase(),
    bio: sanitizedProfile.bio,
    last_seen: new Date().toISOString(),
  }, {
    onConflict: 'id'
  });
```

**Testing**:
- [ ] Test onboarding with email-based user
- [ ] Test onboarding with username-based user
- [ ] Test onboarding with device-only user

---

### PHASE 5: Add Progress UI Components (OPTIONAL)
**Purpose**: Add progress bars for UX
**Time**: 2-3 hours
**Dependencies**: Phase 4
**Priority**: LOW - Can be done later

(This phase is OPTIONAL and can be skipped for MVP)

---

### PHASE 6: Testing & Rollout
**Purpose**: Test thoroughly before enabling
**Time**: 3-4 hours
**Dependencies**: All previous phases

#### Step 6.1: Test Matrix

**Scenario 1: New User (Device-Only)**
- [ ] User opens app for first time
- [ ] DeviceRegisterScreen appears
- [ ] User clicks "Create Account"
- [ ] Device keypair generated
- [ ] Backend creates user WITHOUT username/password
- [ ] User sees option to add username/password
- [ ] User skips
- [ ] User reaches main app

**Scenario 2: New User (With Username/Password)**
- [ ] User opens app for first time
- [ ] DeviceRegisterScreen appears
- [ ] User clicks "Create Account"
- [ ] Device keypair generated
- [ ] User chooses to add username/password
- [ ] User creates username and password
- [ ] Backend creates user WITH username/password
- [ ] User reaches main app

**Scenario 3: Returning User (Device-Only)**
- [ ] User opens app (same device)
- [ ] Auto-login succeeds
- [ ] No username/password required
- [ ] User reaches main app

**Scenario 4: Returning User (With Username/Password)**
- [ ] User opens app (same device)
- [ ] DeviceLoginScreen appears
- [ ] Username/password fields shown
- [ ] User enters credentials
- [ ] Both device token AND password verified
- [ ] User reaches main app

**Scenario 5: Email Verification Still Works**
- [ ] User with email-based account logs in
- [ ] Email verification banner appears (if not verified)
- [ ] Protected actions still guarded
- [ ] Resend email works
- [ ] After verification, banner disappears

**Scenario 6: Audit Logging**
- [ ] Login with username logs username
- [ ] Login with email logs email
- [ ] Session expiry logs correctly
- [ ] No crashes if identifier missing

---

## MIGRATION STRATEGY

### Week 1: Deploy Backend
- Deploy Phase 1 (backend changes)
- Keep CONFIG.USE_HYBRID_AUTH=false
- Test backend with device-only auth
- Monitor for issues

### Week 2: Test Frontend
- Deploy Phase 2-4 (frontend changes)
- Keep CONFIG.USE_HYBRID_AUTH=false
- Test in development
- Verify backward compatibility

### Week 3: Gradual Rollout
- Set CONFIG.USE_HYBRID_AUTH=true for 10% of users
- Monitor login success rates
- Monitor error rates
- Collect feedback

### Week 4: Full Rollout
- Set CONFIG.USE_HYBRID_AUTH=true for all users
- Make username REQUIRED (CONFIG.REQUIRE_USERNAME=true)
- Monitor stability
- Keep email verification disabled (CONFIG.REQUIRE_EMAIL_VERIFICATION=false)

---

## ROLLBACK PLAN

If something breaks:

### Step 1: Immediate Rollback
```bash
# Set feature flags back to safe defaults
export EXPO_PUBLIC_USE_HYBRID_AUTH=false
export EXPO_PUBLIC_REQUIRE_USERNAME=false
```

### Step 2: Verify Systems
- [ ] Check device-only auth works
- [ ] Check email-based auth works (if any users still have it)
- [ ] Check audit logging works
- [ ] Check email verification works

### Step 3: Investigate
- Review error logs
- Check database for inconsistencies
- Test failing scenarios in development

---

## FILES TO MODIFY (Summary)

### Backend
1. `backend/services/auth/src/db.ts` - Add username/password columns
2. `backend/services/auth/src/password.ts` - NEW - Password utilities
3. `backend/services/auth/src/routes/auth.ts` - Update endpoints

### Frontend - Core
4. `src/config.ts` - Add feature flags
5. `src/types/auth.ts` - Add username to AuthUser
6. `src/hooks/useAuth.ts` - Add hybrid auth methods
7. `src/services/auditLog.ts` - Update to handle username OR email
8. `src/hooks/useSessionTimeout.ts` - Handle missing email

### Frontend - Screens
9. `src/screens/DeviceRegisterScreen.tsx` - Add username/password setup
10. `src/screens/DeviceLoginScreen.tsx` - Add username/password input
11. `src/screens/OnboardingScreen.tsx` - Make email optional

### Files to KEEP (Don't Delete)
- ❌ `src/screens/AuthScreen.tsx` - Keep for Supabase auth
- ❌ `src/services/emailVerification.ts` - Keep (disable via flag)
- ❌ `src/hooks/useEmailVerificationGuard.ts` - Keep (disable via flag)
- ❌ `src/components/EmailVerificationBanner.tsx` - Keep (disable via flag)

---

## TIMELINE

| Phase | Time | Priority | Risk |
|-------|------|----------|------|
| Phase 0: Preparation | 1 hour | CRITICAL | LOW |
| Phase 1: Backend | 2-3 hours | CRITICAL | MEDIUM |
| Phase 2: Repurpose Screens | 3-4 hours | HIGH | MEDIUM |
| Phase 3: Update useAuth | 2-3 hours | CRITICAL | HIGH |
| Phase 4: Update Onboarding | 1 hour | HIGH | LOW |
| Phase 5: Progress UI | 2-3 hours | LOW | LOW |
| Phase 6: Testing | 3-4 hours | CRITICAL | LOW |
| **Total** | **14-21 hours** | | |

---

## SUCCESS CRITERIA

✅ Existing device-only auth continues to work
✅ Email-based auth continues to work (backward compatible)
✅ New users can add username/password (optional)
✅ Username/password users require both factors to login
✅ Audit logging handles username OR email
✅ No TypeScript errors
✅ No runtime crashes
✅ Email verification system unaffected
✅ Feature flags allow gradual rollout
✅ Rollback plan tested

---

## RISK MITIGATION

### High-Risk Changes
1. **useAuth.ts modifications** - Keep all existing methods
2. **Audit logging updates** - Handle both email and username
3. **Database schema** - Add columns as NULL (non-breaking)

### Low-Risk Changes
1. **DeviceRegisterScreen** - Add optional section
2. **DeviceLoginScreen** - Add conditional username input
3. **OnboardingScreen** - Make email optional

### Zero-Risk Changes
1. **Add feature flags** - Only configuration
2. **Add TypeScript types** - Only type definitions
3. **Add backend password utilities** - New file, doesn't affect existing code

---

**Document Version**: 2.0 (Revised)
**Last Updated**: 2025-10-21
**Status**: Ready for Review & Implementation
**Confidence**: 95% (significantly safer than v1.0)
