# Authentication System Redesign Plan
## Hybrid Device Token + Username/Password System

**Date**: 2025-10-21
**Status**: Planning Phase
**Goal**: Repurpose existing email/password system to create a two-layer authentication system

---

## Executive Summary

This plan redesigns the authentication system to combine:
1. **Layer 1 (Transparent)**: Device-based encryption tokens (P-256 ECDSA) - automatic
2. **Layer 2 (User-Facing)**: Username/Password - manual entry, repurposed from email/password system

### Key Changes
- **Remove**: Email collection, email verification, password reset emails
- **Repurpose**: Email field → Username field, Password system → Second authentication layer
- **Add**: Progress bars, loading states, token generation visualization
- **Combine**: Device token + username/password for two-factor authentication

---

## Current System Analysis

### Frontend Components

#### 1. **AuthScreen.tsx** (src/screens/AuthScreen.tsx)
**Current State**:
- Dual authentication UI: Device Token OR Email/Password
- Email validation (emailSchema)
- Password validation (passwordSchema)
- Rate limiting
- Audit logging
- Auto-login for device tokens

**Lines to Modify**:
- Line 13-14: `authMethod` state (currently 'device' | 'email')
- Line 15: `isSignUp` state
- Line 16-18: email, password, confirmPassword states
- Line 49-92: `handleSignUp()` - email signup logic
- Line 94-128: `handleSignIn()` - email signin logic
- Line 130-160: `handleForgotPassword()` - password reset
- Line 166-200: Device registration/login handlers
- Line 245-267: Method selector UI
- Line 330-404: Email/Password form UI

**What to Repurpose**:
- Email field → Username field
- Password field → Keep as-is
- Sign up/Sign in toggle → Repurpose for new flow
- Form validation → Update for username (not email)
- Rate limiting → Keep
- Audit logging → Update to log username instead of email

#### 2. **DeviceLoginScreen.tsx** (src/screens/DeviceLoginScreen.tsx)
**Current State**:
- Device-only authentication
- Auto-login on mount
- Platform gating (native-only)
- Progress indicators

**Status**: Will be **MERGED** into new unified flow

#### 3. **DeviceRegisterScreen.tsx** (src/screens/DeviceRegisterScreen.tsx)
**Current State**:
- Device registration with cryptographic key generation
- Platform gating (native-only)
- Feature explanations

**Status**: Will be **MERGED** into new unified flow

#### 4. **AuthContext.tsx** (src/contexts/AuthContext.tsx)
**Current State**:
- Simple state management for user/session
- No business logic

**Status**: **NO CHANGES NEEDED**

#### 5. **useAuth.ts** (src/hooks/useAuth.ts)
**Current State**:
- Line 60-101: Supabase auth methods (signUp, signInWithPassword, resetPassword, etc.)
- Line 125-220: Device registration logic
- Line 230-343: Device login logic
- Line 359-385: Sign out logic

**What to Modify**:
- Remove: Email-based Supabase methods (signUp, signInWithPassword, resetPassword, signInWithOTP, verifyOTP)
- Keep: Device token logic (registerWithDevice, loginWithDevice)
- Add: Username/password verification (second layer)
- Modify: Combine device token + username/password authentication

### Backend Components

#### 1. **auth.ts** (backend/services/auth/src/routes/auth.ts)
**Current State**:
- Line 23-58: POST /auth/challenge - Generate challenge for device auth
- Line 66-170: POST /auth/register-device - Register device with public key
- Line 178-322: POST /auth/verify-device - Verify device signature
- Line 330-400: POST /auth/refresh - Refresh tokens

**What to Add**:
- Username/password storage in users table
- Username/password verification endpoint
- Combined authentication flow (device + username/password)

#### 2. **db.ts** (backend/services/auth/src/db.ts)
**Current State**:
- PostgreSQL connection
- Basic query interface

**What to Modify**:
- Add username column to users table
- Add password_hash column to users table
- Remove email-related columns (if any)

#### 3. **Supabase Database Schema**
**Current State**: Unknown (need to investigate)

**What to Modify**:
- Add `username` column (VARCHAR, UNIQUE, NOT NULL)
- Add `password_hash` column (VARCHAR, NOT NULL)
- Remove email columns
- Update indexes

---

## New Authentication Flow

### First-Time User (Registration)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User opens app/web                                  │
│ ↓                                                            │
│ STEP 2: Loading screen appears                              │
│         Progress bar: "Encryption tokens being created"     │
│         (Device keypair generation happening in background) │
│ ↓                                                            │
│ STEP 3: Progress advances                                   │
│         Progress bar: "Creating encrypted account"          │
│         (Saving keypair + registering with backend)         │
│ ↓                                                            │
│ STEP 4: Username/Password creation form                     │
│         - Username input field                              │
│         - Password input field                              │
│         - Confirm password input field                      │
│         - "Sign Up" button at bottom                        │
│ ↓                                                            │
│ STEP 5: User enters credentials and clicks "Sign Up"        │
│         - Validate username (alphanumeric, 3-20 chars)      │
│         - Validate password (strong password rules)         │
│         - Hash password client-side (optional)              │
│         - Send to backend                                   │
│ ↓                                                            │
│ STEP 6: Backend saves username/password                     │
│         - Associates with device public key                 │
│         - Returns success                                   │
│ ↓                                                            │
│ STEP 7: User sees main app page                             │
└─────────────────────────────────────────────────────────────┘
```

### Returning User (Login)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User opens app/web (same device)                    │
│ ↓                                                            │
│ STEP 2: Sign in page appears                                │
│         - Username input field                              │
│         - Password input field                              │
│         - "Sign In" button at bottom                        │
│ ↓                                                            │
│ STEP 3: User enters credentials and clicks "Sign In"        │
│ ↓                                                            │
│ STEP 4: Progress bar appears                                │
│         "Authenticating encrypted token"                    │
│         (Device token verification + password check)        │
│ ↓                                                            │
│ STEP 5: Backend verifies:                                   │
│         - Device signature (Layer 1)                        │
│         - Username/password (Layer 2)                       │
│         - Both must pass                                    │
│ ↓                                                            │
│ STEP 6: If successful, user sees main app page              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### PHASE 1: Backend Preparation (Database & API)
**Estimated Time**: 2-3 hours
**Dependencies**: None

#### Step 1.1: Update Database Schema
**File**: Create `backend/services/auth/src/db/schema_v2.sql`

```sql
-- Add username and password columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- For migration: allow NULL temporarily
-- Later will be made NOT NULL after all users migrated
```

**Testing**:
- [ ] Verify schema update runs without errors
- [ ] Verify username column accepts unique values
- [ ] Verify password_hash column created

#### Step 1.2: Add Password Hashing Utilities
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
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be less than 20 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
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
- [ ] Test password hashing produces different hashes for same password
- [ ] Test password verification works correctly
- [ ] Test password validation rules
- [ ] Test username validation rules

#### Step 1.3: Modify Registration Endpoint
**File**: `backend/services/auth/src/routes/auth.ts`
**Modify**: POST /auth/register-device (Line 66-170)

**Changes**:
```typescript
// Add to request body interface
const {
  publicKey,
  deviceId,
  platform,
  deviceName,
  deviceModel,
  osVersion,
  username,        // NEW
  password,        // NEW
} = request.body as {
  publicKey: string;
  deviceId: string;
  platform: 'web' | 'ios' | 'android';
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  username: string;    // NEW
  password: string;    // NEW
};

// Validate username and password (NEW)
const usernameValidation = validateUsername(username);
if (!usernameValidation.valid) {
  return reply.code(400).send({
    error: 'Invalid username',
    message: usernameValidation.error,
  });
}

const passwordValidation = validatePassword(password);
if (!passwordValidation.valid) {
  return reply.code(400).send({
    error: 'Invalid password',
    message: passwordValidation.error,
  });
}

// Check if username already exists (NEW)
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

// Hash password (NEW)
const passwordHash = await hashPassword(password);

// Update INSERT query (MODIFY)
await db.query(
  `INSERT INTO users (
    user_id, device_id, public_key, platform,
    display_name, username, password_hash, last_login
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
  [userId, deviceId, publicKey, platform, displayName, username, passwordHash]
);
```

**Testing**:
- [ ] Test registration with valid username/password
- [ ] Test registration rejects weak passwords
- [ ] Test registration rejects invalid usernames
- [ ] Test registration prevents duplicate usernames
- [ ] Test registration still creates device token

#### Step 1.4: Create New Login Endpoint
**File**: `backend/services/auth/src/routes/auth.ts`
**Add**: POST /auth/login-hybrid (NEW)

```typescript
/**
 * POST /auth/login-hybrid
 *
 * Two-factor authentication:
 * 1. Verify device token (signature)
 * 2. Verify username/password
 * Both must pass for successful authentication
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
      username: string;
      password: string;
      challenge: string;
      signature: string;
      deviceId: string;
      publicKey: string;
    };

    // Validate required fields
    if (!username || !password || !challenge || !signature || !deviceId || !publicKey) {
      return reply.code(400).send({
        error: 'Missing required fields',
        required: ['username', 'password', 'challenge', 'signature', 'deviceId', 'publicKey'],
      });
    }

    // LAYER 1: Verify device token signature
    // (Same as existing /auth/verify-device logic)

    // Verify challenge exists and not expired
    const { rows: challenges } = await db.query(
      'SELECT * FROM auth_challenges WHERE challenge = $1 AND expires_at > NOW()',
      [challenge]
    );

    if (challenges.length === 0) {
      return reply.code(401).send({
        error: 'Invalid or expired challenge',
        message: 'Please request a new challenge',
      });
    }

    // Find user by username (CHANGED from device_id lookup)
    const { rows: users } = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (users.length === 0) {
      // Use generic error message to prevent username enumeration
      return reply.code(401).send({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect',
      });
    }

    const user = users[0];

    // Verify device matches user's registered device
    if (user.device_id !== deviceId) {
      app.log.warn({
        action: 'login_failed',
        reason: 'device_mismatch',
        username,
        expectedDevice: user.device_id.substring(0, 8),
        providedDevice: deviceId.substring(0, 8),
      });

      return reply.code(401).send({
        error: 'Device mismatch',
        message: 'This account is registered to a different device',
      });
    }

    // Verify signature (Layer 1)
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
        username,
      });

      return reply.code(401).send({
        error: 'Invalid credentials',
        message: 'Authentication failed',
      });
    }

    // LAYER 2: Verify username/password
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
      username,
      platform: user.platform,
      userId: user.user_id.substring(0, 8),
    });

    return {
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
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
      message: 'An error occurred during authentication',
    });
  }
});
```

**Testing**:
- [ ] Test login with correct username + password + valid device token
- [ ] Test login fails with correct username/password but wrong device
- [ ] Test login fails with correct device token but wrong password
- [ ] Test login fails with invalid username
- [ ] Test login prevents timing attacks (constant-time comparison)

---

### PHASE 2: Frontend - Progress UI Components
**Estimated Time**: 2-3 hours
**Dependencies**: None

#### Step 2.1: Create Progress Bar Component
**File**: `src/components/AuthProgressBar.tsx` (NEW)

```typescript
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AuthProgressBarProps {
  stage: 'generating' | 'registering' | 'authenticating' | 'complete';
  progress: number; // 0-100
  message: string;
}

export const AuthProgressBar: React.FC<AuthProgressBarProps> = ({
  stage,
  progress,
  message,
}) => {
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const getStageIcon = () => {
    switch (stage) {
      case 'generating':
        return '🔐';
      case 'registering':
        return '💾';
      case 'authenticating':
        return '🔓';
      case 'complete':
        return '✅';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{getStageIcon()}</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { width: progressWidth },
          ]}
        />
      </View>

      <Text style={styles.percentage}>{Math.round(progress)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});
```

**Testing**:
- [ ] Test progress bar animates smoothly
- [ ] Test progress bar shows correct icons for each stage
- [ ] Test progress bar updates message correctly
- [ ] Test progress bar reaches 100%

#### Step 2.2: Create Loading Screen Component
**File**: `src/screens/AuthLoadingScreen.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { AuthProgressBar } from '../components/AuthProgressBar';
import * as deviceAuth from '../services/platformDeviceAuth';

interface AuthLoadingScreenProps {
  onComplete: (keypair: { publicKey: string; privateKey: string }) => void;
  onError: (error: Error) => void;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  onComplete,
  onError,
}) => {
  const [stage, setStage] = useState<'generating' | 'registering'>('generating');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Encryption tokens being created');

  useEffect(() => {
    generateAndRegisterDevice();
  }, []);

  const generateAndRegisterDevice = async () => {
    try {
      // Stage 1: Generate device keypair
      setStage('generating');
      setMessage('Encryption tokens being created');
      setProgress(0);

      // Simulate progress for UX (keypair generation is fast)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 50));
      }, 100);

      const keypair = await deviceAuth.generateDeviceKeypair();

      clearInterval(progressInterval);
      setProgress(50);

      // Stage 2: Store keypair
      setStage('registering');
      setMessage('Creating encrypted account');

      // Simulate progress
      const storeInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 100);

      await deviceAuth.storeDeviceKeypair(keypair.privateKey, keypair.publicKey);

      clearInterval(storeInterval);
      setProgress(100);

      // Small delay to show 100% completion
      setTimeout(() => {
        onComplete(keypair);
      }, 500);

    } catch (error) {
      console.error('Device setup failed:', error);
      onError(error as Error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AuthProgressBar
          stage={stage}
          progress={progress}
          message={message}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});
```

**Testing**:
- [ ] Test loading screen appears on mount
- [ ] Test progress advances through both stages
- [ ] Test onComplete called with valid keypair
- [ ] Test onError called on failure

---

### PHASE 3: Frontend - Sign Up Flow
**Estimated Time**: 3-4 hours
**Dependencies**: Phase 2

#### Step 3.1: Create Username/Password Creation Screen
**File**: `src/screens/CreateAccountScreen.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface CreateAccountScreenProps {
  keypair: { publicKey: string; privateKey: string };
  deviceId: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export const CreateAccountScreen: React.FC<CreateAccountScreenProps> = ({
  keypair,
  deviceId,
  onSuccess,
  onError,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 20) {
      return 'Username must be less than 20 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSignUp = async () => {
    // Validate username
    const usernameError = validateUsername(username);
    if (usernameError) {
      Alert.alert('Invalid Username', usernameError);
      return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Weak Password', passwordError);
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Get device info
      const deviceInfo = await deviceAuth.getDeviceInfo();

      // Call backend to register with username/password
      const response = await fetch(`${CONFIG.API_URL}/auth/register-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          osName: deviceInfo.osName,
          osVersion: deviceInfo.osVersion,
          platform: deviceInfo.platform,
          username,      // NEW
          password,      // NEW
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();

      // Store session
      await deviceAuth.storeSession({
        user: data.user,
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
      });

      onSuccess();
    } catch (error) {
      console.error('Account creation failed:', error);
      onError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            Your device encryption tokens have been created.{'\n'}
            Now create a username and password for secure access.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a strong password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              At least 8 characters with uppercase, lowercase, and numbers
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityText}>
            Two-layer security: Device encryption token + Username/Password
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    gap: 12,
  },
  securityIcon: {
    fontSize: 24,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});
```

**Testing**:
- [ ] Test username validation shows errors correctly
- [ ] Test password validation shows errors correctly
- [ ] Test password confirmation validation
- [ ] Test successful account creation
- [ ] Test error handling for duplicate username

---

### PHASE 4: Frontend - Sign In Flow
**Estimated Time**: 2-3 hours
**Dependencies**: Phase 3

#### Step 4.1: Create Sign In Screen
**File**: `src/screens/SignInScreen.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AuthProgressBar } from '../components/AuthProgressBar';
import * as deviceAuth from '../services/platformDeviceAuth';
import { CONFIG } from '../config';

interface SignInScreenProps {
  onSuccess: (user: any, tokens: any) => void;
  onError: (error: Error) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onSuccess,
  onError,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSignIn = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    setAuthenticating(true);
    setProgress(0);

    try {
      // Get device keypair
      const keypair = await deviceAuth.getDeviceKeypair();
      if (!keypair) {
        throw new Error('No device keypair found. Please register this device first.');
      }

      setProgress(20);

      // Get device info
      const deviceInfo = await deviceAuth.getDeviceInfo();

      setProgress(40);

      // Request challenge from backend
      const challengeResponse = await fetch(`${CONFIG.API_URL}/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceInfo.deviceId,
          platform: deviceInfo.platform,
        }),
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const { challenge } = await challengeResponse.json();

      setProgress(60);

      // Sign challenge with device private key
      const signature = await deviceAuth.signChallenge(challenge, keypair.privateKey);

      setProgress(80);

      // Send credentials + signature to backend
      const loginResponse = await fetch(`${CONFIG.API_URL}/auth/login-hybrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
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

      setProgress(100);

      // Store session
      await deviceAuth.storeSession({
        user: loginData.user,
        tokens: {
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        },
      });

      // Small delay to show 100% completion
      setTimeout(() => {
        onSuccess(loginData.user, loginData.tokens);
      }, 500);

    } catch (error) {
      console.error('Sign in failed:', error);
      setAuthenticating(false);
      Alert.alert(
        'Authentication Failed',
        error instanceof Error ? error.message : 'An error occurred'
      );
      onError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  if (authenticating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.progressContainer}>
          <AuthProgressBar
            stage="authenticating"
            progress={progress}
            message="Authenticating encrypted token"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in with your username and password
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityText}>
            Two-layer authentication: Device token + Password
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    gap: 12,
  },
  securityIcon: {
    fontSize: 24,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});
```

**Testing**:
- [ ] Test sign in with correct credentials
- [ ] Test sign in fails with wrong password
- [ ] Test sign in fails with wrong username
- [ ] Test sign in fails with wrong device
- [ ] Test progress bar animates correctly

---

### PHASE 5: Frontend - Orchestrate New Flow
**Estimated Time**: 2-3 hours
**Dependencies**: Phases 2, 3, 4

#### Step 5.1: Update useAuth Hook
**File**: `src/hooks/useAuth.ts`

**Changes**:
```typescript
// REMOVE these Supabase methods:
// - signUp (line 60-68)
// - signInWithPassword (line 71-77)
// - resetPassword (line 79-84)
// - updatePassword (line 86-91)
// - signInWithOTP (line 93-101)
// - verifyOTP (line 103-110)

// KEEP:
// - registerWithDevice (but modify to not send username/password - that's in CreateAccountScreen)
// - loginWithDevice (but modify to use new hybrid endpoint)
// - canAutoLogin
// - hasDeviceKeypair
// - signOut

// UPDATE registerWithDevice to be lightweight (just keypair generation)
const registerWithDevice = async (): Promise<{
  data?: { keypair: { publicKey: string; privateKey: string } };
  error?: Error;
}> => {
  try {
    // Check if device auth is enabled
    if (!CONFIG.USE_DEVICE_AUTH) {
      throw new Error('Device authentication is not enabled.');
    }

    // Check platform support
    if (!deviceAuth.isDeviceAuthSupported()) {
      throw new Error('Device authentication not supported on this platform');
    }

    // Check if device already has a keypair
    const existingKeypair = await deviceAuth.getDeviceKeypair();
    if (existingKeypair) {
      throw new Error('Device already registered.');
    }

    // Generate device keypair
    const keypair = await deviceAuth.generateDeviceKeypair();

    // Store locally (backend registration happens in CreateAccountScreen)
    await deviceAuth.storeDeviceKeypair(keypair.privateKey, keypair.publicKey);

    setHasDeviceKeypair(true);

    return { data: { keypair } };
  } catch (error) {
    console.error('Device keypair generation failed:', error);
    return { error: error as Error };
  }
};

// ADD new method for username/password registration
const registerUsernamePassword = async (
  username: string,
  password: string,
  keypair: { publicKey: string; privateKey: string }
): Promise<{
  data?: { user: any; tokens: any };
  error?: Error;
}> => {
  try {
    const deviceInfo = await deviceAuth.getDeviceInfo();

    const response = await fetch(`${CONFIG.API_URL}/auth/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: keypair.publicKey,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        osName: deviceInfo.osName,
        osVersion: deviceInfo.osVersion,
        platform: deviceInfo.platform,
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Registration failed');
    }

    const data = await response.json();

    // Store session
    await deviceAuth.storeSession({
      user: data.user,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });

    // Update state
    setUser(data.user);
    setSession({ user: data.user, tokens: data });

    return { data: { user: data.user, tokens: data } };
  } catch (error) {
    console.error('Username/password registration failed:', error);
    return { error: error as Error };
  }
};

// UPDATE loginWithDevice to use hybrid endpoint
const loginWithDevice = async (
  username: string,
  password: string
): Promise<{
  data?: { user: any; tokens: any };
  error?: Error;
}> => {
  try {
    // Check if device auth is enabled
    if (!CONFIG.USE_DEVICE_AUTH) {
      throw new Error('Device authentication is not enabled.');
    }

    // Check platform support
    if (!deviceAuth.isDeviceAuthSupported()) {
      throw new Error('Device authentication not supported on this platform');
    }

    // Get device keypair
    const keypair = await deviceAuth.getDeviceKeypair();
    if (!keypair) {
      throw new Error('No device keypair found. Please register first.');
    }

    // Get device info
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

    // Hybrid login
    const loginResponse = await fetch(`${CONFIG.API_URL}/auth/login-hybrid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
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
    console.error('Hybrid login failed:', error);
    return { error: error as Error };
  }
};
```

**Return updated methods**:
```typescript
return {
  user,
  session,
  isLoading,
  // NEW methods
  registerWithDevice,           // Lightweight - just generates keypair
  registerUsernamePassword,     // Completes registration with username/password
  loginWithDevice,              // Hybrid login (device + username/password)
  canAutoLogin,                 // Check if can auto-login (has keypair + stored session)
  hasDeviceKeypair,
  // Shared methods
  signOut,
};
```

**Testing**:
- [ ] Test registerWithDevice generates and stores keypair
- [ ] Test registerUsernamePassword completes registration
- [ ] Test loginWithDevice performs hybrid authentication
- [ ] Test removed Supabase methods no longer exported

#### Step 5.2: Create Main Auth Orchestrator
**File**: `src/screens/AuthScreen.tsx` (REPLACE ENTIRE FILE)

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { CreateAccountScreen } from './CreateAccountScreen';
import { SignInScreen } from './SignInScreen';
import * as deviceAuth from '../services/platformDeviceAuth';

/**
 * Main Authentication Orchestrator
 *
 * Handles the authentication flow based on device state:
 *
 * 1. First-time user (no keypair):
 *    AuthLoadingScreen → CreateAccountScreen → Main App
 *
 * 2. Returning user (has keypair, no stored session):
 *    SignInScreen → Main App
 *
 * 3. Returning user (has keypair, has stored session):
 *    Auto-login → Main App
 */
export const AuthScreen = () => {
  const { hasDeviceKeypair, session } = useAuth();
  const [flow, setFlow] = useState<'loading' | 'create' | 'signin' | null>(null);
  const [generatedKeypair, setGeneratedKeypair] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    // Get device ID
    const deviceInfo = await deviceAuth.getDeviceInfo();
    setDeviceId(deviceInfo.deviceId);

    // Check if device has keypair
    const keypair = await deviceAuth.getDeviceKeypair();

    if (!keypair) {
      // First-time user: Start with loading screen
      setFlow('loading');
    } else {
      // Check if has stored session
      const storedSession = await deviceAuth.getStoredSession();

      if (storedSession && storedSession.user) {
        // Has stored session: User will auto-login in useAuth hook
        // AuthContext will handle navigation to main app
        setFlow(null);
      } else {
        // Has keypair but no session: Show sign in screen
        setFlow('signin');
      }
    }
  };

  const handleLoadingComplete = (keypair: { publicKey: string; privateKey: string }) => {
    // Device keypair generated and stored
    // Move to account creation
    setGeneratedKeypair(keypair);
    setFlow('create');
  };

  const handleLoadingError = (error: Error) => {
    // Handle error (could show error screen)
    console.error('Device setup error:', error);
    // For now, retry
    setFlow('loading');
  };

  const handleAccountCreated = () => {
    // Account created successfully
    // User will be logged in, AuthContext will navigate to main app
    setFlow(null);
  };

  const handleAccountError = (error: Error) => {
    // Handle account creation error
    console.error('Account creation error:', error);
  };

  const handleSignInSuccess = (user: any, tokens: any) => {
    // User signed in successfully
    // AuthContext will navigate to main app
    setFlow(null);
  };

  const handleSignInError = (error: Error) => {
    // Handle sign in error
    console.error('Sign in error:', error);
  };

  if (flow === 'loading') {
    return (
      <AuthLoadingScreen
        onComplete={handleLoadingComplete}
        onError={handleLoadingError}
      />
    );
  }

  if (flow === 'create' && generatedKeypair) {
    return (
      <CreateAccountScreen
        keypair={generatedKeypair}
        deviceId={deviceId}
        onSuccess={handleAccountCreated}
        onError={handleAccountError}
      />
    );
  }

  if (flow === 'signin') {
    return (
      <SignInScreen
        onSuccess={handleSignInSuccess}
        onError={handleSignInError}
      />
    );
  }

  // Fallback loading state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loading} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
  },
});
```

**Testing**:
- [ ] Test first-time user flow: Loading → Create Account
- [ ] Test returning user (no session): Sign In
- [ ] Test returning user (with session): Auto-login
- [ ] Test error handling in each flow

---

### PHASE 6: Clean Up & Remove Old Code
**Estimated Time**: 1-2 hours
**Dependencies**: Phase 5

#### Step 6.1: Remove Unused Files
**Files to DELETE**:
- `src/screens/DeviceLoginScreen.tsx`
- `src/screens/DeviceRegisterScreen.tsx`

#### Step 6.2: Update Validation Schema
**File**: `src/lib/validations.ts`

**Changes**:
```typescript
// REMOVE emailSchema

// ADD usernameSchema
export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// KEEP passwordSchema (same as before)
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
```

#### Step 6.3: Remove Supabase Email Auth
**File**: `src/services/supabase.ts`

**No changes needed** - Supabase client can stay, just won't be used for auth

#### Step 6.4: Update Navigation
**File**: Check navigation setup and ensure removed screens are not referenced

---

### PHASE 7: Testing & Refinement
**Estimated Time**: 3-4 hours
**Dependencies**: All previous phases

#### Step 7.1: End-to-End Testing

**Test Suite 1: First-Time User Flow**
- [ ] User opens app for first time
- [ ] Loading screen appears with "Encryption tokens being created"
- [ ] Progress advances smoothly to 50%
- [ ] Message changes to "Creating encrypted account"
- [ ] Progress advances to 100%
- [ ] Create Account screen appears
- [ ] User enters username
- [ ] Username validation works (min length, max length, invalid characters)
- [ ] User enters password
- [ ] Password validation works (strength requirements)
- [ ] User enters confirm password
- [ ] Confirm password validation works
- [ ] User clicks "Sign Up"
- [ ] Backend creates account successfully
- [ ] User redirected to main app
- [ ] Session persisted

**Test Suite 2: Returning User Flow**
- [ ] User opens app on same device
- [ ] Sign In screen appears (no loading screen)
- [ ] User enters username
- [ ] User enters password
- [ ] User clicks "Sign In"
- [ ] Progress bar appears with "Authenticating encrypted token"
- [ ] Backend verifies device token
- [ ] Backend verifies username/password
- [ ] User redirected to main app
- [ ] Session persisted

**Test Suite 3: Error Handling**
- [ ] Test weak password rejected
- [ ] Test invalid username rejected
- [ ] Test duplicate username rejected
- [ ] Test mismatched passwords rejected
- [ ] Test wrong password on login
- [ ] Test wrong username on login
- [ ] Test device mismatch on login
- [ ] Test network errors handled gracefully
- [ ] Test backend errors handled gracefully

**Test Suite 4: Security**
- [ ] Test device token still works (Layer 1)
- [ ] Test username/password required (Layer 2)
- [ ] Test cannot bypass device check with just password
- [ ] Test cannot bypass password with just device token
- [ ] Test password not sent in plain text (check network inspector)
- [ ] Test tokens stored securely
- [ ] Test session expiration

**Test Suite 5: Cross-Platform**
- [ ] Test on web browser
- [ ] Test on iOS (if available)
- [ ] Test on Android (if available)
- [ ] Test device token format correct for each platform
- [ ] Test signature verification works for each platform

---

## Migration Strategy

### For Existing Users (if any)

**Option 1: Force Re-Registration**
- All existing users must create new accounts
- Old Supabase auth users invalidated
- Clean slate

**Option 2: Gradual Migration**
- Keep Supabase auth temporarily
- Add username/password fields to existing users
- Prompt users to add username/password on next login
- Generate device tokens for existing users
- Deprecated Supabase auth after migration period

**Recommendation**: Option 1 (Force Re-Registration) - simpler, cleaner

---

## Database Schema Changes Summary

```sql
-- Add to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Eventually make NOT NULL (after migration)
-- ALTER TABLE users ALTER COLUMN username SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
```

---

## API Endpoints Summary

### Existing (Keep)
- POST /auth/challenge - Generate challenge
- POST /auth/refresh - Refresh tokens

### Modified
- POST /auth/register-device - Add username/password fields

### New
- POST /auth/login-hybrid - Two-factor authentication

### Deprecated (Remove)
- All Supabase-based email/password endpoints

---

## File Changes Summary

### Files to CREATE
- `backend/services/auth/src/password.ts`
- `backend/services/auth/src/db/schema_v2.sql`
- `src/components/AuthProgressBar.tsx`
- `src/screens/AuthLoadingScreen.tsx`
- `src/screens/CreateAccountScreen.tsx`
- `src/screens/SignInScreen.tsx`

### Files to MODIFY
- `backend/services/auth/src/routes/auth.ts`
- `src/hooks/useAuth.ts`
- `src/screens/AuthScreen.tsx` (complete replacement)
- `src/lib/validations.ts`

### Files to DELETE
- `src/screens/DeviceLoginScreen.tsx`
- `src/screens/DeviceRegisterScreen.tsx`

---

## Timeline Estimate

| Phase | Description | Time | Dependencies |
|-------|-------------|------|--------------|
| Phase 1 | Backend preparation | 2-3 hours | None |
| Phase 2 | Progress UI components | 2-3 hours | None |
| Phase 3 | Sign up flow | 3-4 hours | Phase 2 |
| Phase 4 | Sign in flow | 2-3 hours | Phase 3 |
| Phase 5 | Orchestrate new flow | 2-3 hours | Phases 2, 3, 4 |
| Phase 6 | Clean up old code | 1-2 hours | Phase 5 |
| Phase 7 | Testing & refinement | 3-4 hours | All |
| **Total** | **Full implementation** | **15-22 hours** | |

---

## Success Criteria

✅ First-time users see loading screen with progress bars
✅ Device tokens generated transparently in background
✅ Users create username/password after token generation
✅ Returning users see sign in screen (not loading screen)
✅ Two-factor authentication works (device + password)
✅ Cannot bypass either authentication layer
✅ All validation works correctly
✅ Error handling graceful
✅ Works on web and native platforms
✅ No email collection
✅ No password reset emails
✅ Session persistence works
✅ All tests pass

---

## Risk Assessment

### Technical Risks
1. **Device token + password mismatch**: Mitigated by backend validation
2. **Session sync issues**: Mitigated by storing session after both validations
3. **Cross-platform signature differences**: Already solved in current implementation

### UX Risks
1. **Users confused by two-step process**: Mitigated by clear progress indicators
2. **Users forget username**: Cannot be recovered (by design - no email)
3. **Users lose device**: Account inaccessible (by design - device-bound)

### Security Risks
1. **Password weakness**: Mitigated by strong validation rules
2. **Brute force attacks**: Mitigated by rate limiting (already implemented)
3. **Session hijacking**: Mitigated by device token binding

---

## Next Steps

1. Review this plan with team
2. Get approval for username-only (no email) approach
3. Start with Phase 1 (backend preparation)
4. Implement phases sequentially
5. Test thoroughly at each phase
6. Deploy to staging environment
7. User testing
8. Deploy to production

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Status**: Ready for Implementation
