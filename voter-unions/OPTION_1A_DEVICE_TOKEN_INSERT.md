---

## 🎯 Option 1A: Device Token Authentication (Expo Go)

⭐ **RECOMMENDED FOR EXPO GO DEVELOPMENT**

### **Why Device Token Auth?**

WebAuthn requires native modules that don't work in Expo Go. Device Token Authentication provides:
- ✅ **Privacy-first architecture** - No email collection, UUID-only users
- ✅ **Expo Go compatible** - Uses only Expo SDK modules
- ✅ **Cryptographic security** - Device keypairs with challenge-response
- ✅ **Future-proof** - Easy upgrade path to WebAuthn later
- ⚠️ **Trade-off:** No biometric UI (Face ID/Touch ID) in Expo Go

### **Complete Implementation Plan**

📖 **See:** [DEVICE_TOKEN_AUTH_PLAN.md](./DEVICE_TOKEN_AUTH_PLAN.md) for full technical details

### **Week 5A: Device Token Frontend Integration**

#### **Overview**
Implement device-based authentication using `expo-crypto` and `expo-secure-store` (modules you already have installed).

**Duration:** 3-5 days  
**Replaces:** WebAuthn frontend integration (Week 5)

---

#### **Day 1: Device Auth Service**

**Create:** `voter-unions/src/services/deviceAuth.ts`

**Key Functions:**
```typescript
// Generate ECDSA-style keypair
generateDeviceKeypair(): Promise<{ publicKey, privateKey }>

// Store keypair in expo-secure-store
storeDeviceKeypair(privateKey, publicKey): Promise<void>

// Retrieve stored keypair
getDeviceKeypair(): Promise<{ publicKey, privateKey } | null>

// Sign challenge with private key
signChallenge(challenge, privateKey): Promise<signature>

// Get device fingerprint
getDeviceInfo(): Promise<{ deviceId, deviceName, osName, osVersion }>
```

**Security:**
- Private key never leaves device
- Stored in hardware-backed secure storage (iOS Keychain / Android Keystore)
- Challenge-response prevents replay attacks

---

#### **Day 2: Update AuthContext**

**Modify:** `voter-unions/src/contexts/AuthContext.tsx`

**Add Device Token Methods:**
```typescript
interface AuthContextType {
  // Existing Supabase methods (keep for now)
  user: User | null;
  session: Session | null;
  
  // New device token methods
  registerWithDevice: () => Promise<void>;
  loginWithDevice: () => Promise<void>;
  
  // Shared
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
```

**Implementation:**
```typescript
const registerWithDevice = async () => {
  // 1. Generate device keypair
  const { publicKey, privateKey } = await generateDeviceKeypair();
  
  // 2. Request challenge from backend
  const { userId, challenge } = await fetch(
    `${CONFIG.API_URL}/auth/register/init`
  ).then(r => r.json());
  
  // 3. Sign challenge
  const signature = await signChallenge(challenge, privateKey);
  
  // 4. Send verification
  const { accessToken, refreshToken } = await fetch(
    `${CONFIG.API_URL}/auth/register/verify`,
    {
      method: 'POST',
      body: JSON.stringify({
        userId,
        publicKey,
        signature,
        deviceInfo: await getDeviceInfo(),
      }),
    }
  ).then(r => r.json());
  
  // 5. Store credentials
  await storeDeviceKeypair(privateKey, publicKey);
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
  await SecureStore.setItemAsync('user_id', userId);
  
  setUser({ id: userId });
};
```

---

#### **Day 3: Registration UI**

**Create:** `voter-unions/src/screens/DeviceRegisterScreen.tsx`

**UI Components:**
```typescript
export function DeviceRegisterScreen() {
  return (
    <View>
      <Text style={styles.title}>Create Anonymous Account</Text>
      <Text style={styles.subtitle}>
        No email required - your device is your identity
      </Text>
      
      <View style={styles.features}>
        <FeatureItem icon="🔒" text="100% Private" />
        <FeatureItem icon="📱" text="Device-Based" />
        <FeatureItem icon="⚡" text="Instant Access" />
      </View>
      
      <Button
        title="Create Account with This Device"
        onPress={handleRegister}
        loading={loading}
      />
      
      <Text style={styles.disclaimer}>
        Your account is tied to this device. 
        Keep it safe!
      </Text>
    </View>
  );
}
```

---

#### **Day 4: Login UI**

**Create:** `voter-unions/src/screens/DeviceLoginScreen.tsx`

**Auto-Login Support:**
```typescript
export function DeviceLoginScreen() {
  // Check for existing device credentials on mount
  useEffect(() => {
    checkAutoLogin();
  }, []);
  
  const checkAutoLogin = async () => {
    const keypair = await getDeviceKeypair();
    const userId = await SecureStore.getItemAsync('user_id');
    
    if (keypair && userId) {
      // Automatically log in with stored credentials
      await loginWithDevice();
    }
  };
  
  return (
    <View>
      <Text style={styles.title}>Welcome Back</Text>
      
      <Button
        title="Login with This Device"
        onPress={handleLogin}
        loading={loading}
      />
      
      <Text style={styles.note}>
        First time? Create a new account
      </Text>
      <Button
        title="Create Account"
        variant="outline"
        onPress={() => navigation.navigate('Register')}
      />
    </View>
  );
}
```

---

#### **Day 5: Backend Modifications**

**Modify:** `backend/services/auth/src/routes/register.ts`

**Add Device Token Endpoints:**

1. **Registration Init** - Generate challenge
2. **Registration Verify** - Verify signature, create user
3. **Authentication Init** - Generate login challenge
4. **Authentication Verify** - Verify signature, issue tokens

**New Database Table:**
```sql
CREATE TABLE device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  os_name TEXT NOT NULL,
  os_version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### **Testing Checklist**

- [ ] Device keypair generation works
- [ ] Private key stored securely
- [ ] Registration flow completes successfully
- [ ] Tokens stored in SecureStore
- [ ] Login flow works
- [ ] Auto-login on app restart works
- [ ] Logout clears credentials
- [ ] Works in Expo Go (iOS)
- [ ] Works in Expo Go (Android)
- [ ] Backend validates signatures correctly

---

### **Migration Path to WebAuthn**

When ready to switch to development builds:

1. **Keep device token endpoints** - Don't delete them
2. **Add WebAuthn endpoints** alongside device token
3. **Feature flag** - `USE_WEBAUTHN` switches between implementations
4. **User migration** - Offer option to upgrade device token → passkey
5. **Graceful fallback** - If WebAuthn fails, fall back to device token

**Code Example:**
```typescript
// AuthContext.tsx
const register = async () => {
  if (CONFIG.USE_WEBAUTHN && await isWebAuthnSupported()) {
    await registerWithWebAuthn();
  } else {
    await registerWithDevice();
  }
};
```

---

### **Security Comparison**

| Feature | Device Token | WebAuthn |
|---------|--------------|----------|
| **Privacy** | ✅ No PII | ✅ No PII |
| **Expo Go** | ✅ Yes | ❌ No |
| **Biometrics** | ❌ No | ✅ Yes |
| **Cross-Device** | ❌ No | ✅ Yes (iCloud) |
| **Security** | 🟡 Good | 🟢 Excellent |
| **Implementation** | 🟢 Simple | 🟡 Complex |
| **UX** | 🟡 "Login with Device" | 🟢 "Use Face ID" |

---

### **Recommended Approach**

**Phase 1 (Now):** Implement Device Token Auth
- ✅ Launch MVP with privacy-first auth
- ✅ Stay in Expo Go for rapid iteration
- ✅ No workflow changes

**Phase 2 (Post-MVP):** Add WebAuthn
- Switch to development builds
- Add WebAuthn alongside device token
- Let users choose or auto-detect best method

This gives you **privacy-first NOW** while preparing for **biometric auth LATER**.

---

