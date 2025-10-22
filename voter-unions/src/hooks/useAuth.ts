import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { auditHelpers } from '../services/auditLog';
import { useDeviceId } from './useDeviceId';
import { CONFIG } from '../config';
// Use platform-aware device auth router (auto-detects web vs native)
import * as deviceAuth from '../services/platformDeviceAuth';

export const useAuth = () => {
  const { user, session, isLoading, setUser, setSession, setIsLoading, clearAuth } = useAuthStore();
  const { deviceId } = useDeviceId();
  const [hasDeviceKeypair, setHasDeviceKeypair] = useState(false);

  useEffect(() => {
    // Initialize authentication based on CONFIG flag
    const initializeAuth = async () => {
      try {
        console.log('[useAuth] Initializing auth...');
        console.log('[useAuth] USE_DEVICE_AUTH:', CONFIG.USE_DEVICE_AUTH);
        console.log('[useAuth] isDeviceAuthSupported:', deviceAuth.isDeviceAuthSupported());

        if (CONFIG.USE_DEVICE_AUTH && deviceAuth.isDeviceAuthSupported()) {
          console.log('[useAuth] Using device token authentication');

          // Check if device keypair exists
          console.log('[useAuth] Checking for device keypair...');
          const keypair = await deviceAuth.getDeviceKeypair();
          console.log('[useAuth] Keypair exists:', !!keypair);
          setHasDeviceKeypair(!!keypair);

          if (keypair) {
            // Restore session from secure storage
            console.log('[useAuth] Restoring session from secure storage...');
            const storedSession = await deviceAuth.getStoredSession();
            if (storedSession) {
              console.log('[useAuth] Session restored:', storedSession.user?.id);
              setUser(storedSession.user as any);
              setSession(storedSession as any);
            } else {
              console.log('[useAuth] No stored session found');
            }
          }

          console.log('[useAuth] Device auth initialization complete');
          setIsLoading(false);
        } else {
          console.log('[useAuth] Using Supabase authentication');
          // Use Supabase authentication
          supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
          });

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
          });

          return () => subscription.unsubscribe();
        }
      } catch (error) {
        console.error('[useAuth] Initialization error:', error);
        // Always set loading to false even on error, so UI can render
        setIsLoading(false);
        // Clear auth state on error
        setHasDeviceKeypair(false);
      }
    };

    initializeAuth();
  }, [setSession, setUser, setIsLoading]);

  // ============================================================================
  // SUPABASE AUTHENTICATION METHODS (Legacy)
  // ============================================================================

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });
    return { data, error };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined,
    });
    return { data, error };
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const signInWithOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    return { error };
  };

  const verifyOTP = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { data, error };
  };

  // ============================================================================
  // DEVICE TOKEN AUTHENTICATION METHODS (Privacy-First)
  // ============================================================================

  /**
   * Register with Device Token Authentication
   * 
   * Creates a cryptographic device identity without collecting email/password.
   * The device generates an ECDSA P-256 keypair, and the backend verifies
   * signatures to authenticate the user.
   * 
   * @returns Object with success flag, user data, and error
   */
  const registerWithDevice = async (): Promise<{
    data?: { user: any; tokens: any };
    error?: Error;
  }> => {
    try {
      // Check if device auth is enabled
      if (!CONFIG.USE_DEVICE_AUTH) {
        throw new Error('Device authentication is not enabled. Use Supabase authentication instead.');
      }

      // Check platform support
      if (!deviceAuth.isDeviceAuthSupported()) {
        throw new Error('Device authentication not supported on this platform');
      }

      // Check if device already has a keypair (already registered)
      const existingKeypair = await deviceAuth.getDeviceKeypair();
      if (existingKeypair) {
        throw new Error('Device already registered. Use loginWithDevice() instead.');
      }

      // Generate device keypair
      const keypair = await deviceAuth.generateDeviceKeypair();
      
      // Get device information
      const deviceInfo = await deviceAuth.getDeviceInfo();

      // Store keypair in secure storage
      await deviceAuth.storeDeviceKeypair(keypair.privateKey, keypair.publicKey);

      // Call backend API to register device with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`${CONFIG.API_URL}/auth/register-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: keypair.publicKey,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            osName: deviceInfo.osName,
            osVersion: deviceInfo.osVersion,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Registration failed (${response.status})`;
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log('[registerWithDevice] ✅ Backend response received:', {
          hasUser: !!responseData.user,
          hasTokens: !!responseData.tokens,
          userId: responseData.user?.id,
          userEmail: responseData.user?.email,
        });

        if (!responseData.user || !responseData.tokens) {
          console.error('[registerWithDevice] ❌ Invalid response structure:', responseData);
          throw new Error('Invalid response from server');
        }

        const { user, tokens } = responseData;

        // Create session object
        const sessionData = {
          user,
          tokens,
        };

        console.log('[registerWithDevice] 💾 Storing session in secure storage...');
        // Store session in secure storage for restoration
        await deviceAuth.storeSession(sessionData);
        console.log('[registerWithDevice] ✅ Session stored successfully');

        console.log('[registerWithDevice] 📝 Setting user and session in AuthContext...', {
          userId: user.id,
          userEmail: user.email,
        });
        // Update auth state
        setUser(user as any);
        setSession(sessionData as any);
        setHasDeviceKeypair(true);
        console.log('[registerWithDevice] ✅ Auth state updated - user should now be logged in');

        // Log registration audit
        if (deviceId) {
          await auditHelpers.loginSuccess(user.id, `device-${deviceInfo.deviceName || 'unknown'}`, deviceId);
        }

        return { data: { user, tokens } };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Registration timed out. Please check your network connection.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Device registration failed:', error);
      return { error: error as Error };
    }
  };

  /**
   * Login with Device Token Authentication
   * 
   * Uses the device's stored private key to sign a challenge from the backend,
   * proving device identity without passwords.
   * 
   * @returns Object with success flag, user data, and error
   */
  const loginWithDevice = async (): Promise<{
    data?: { user: any; tokens: any };
    error?: Error;
  }> => {
    try {
      // Check if device auth is enabled
      if (!CONFIG.USE_DEVICE_AUTH) {
        throw new Error('Device authentication is not enabled. Use Supabase authentication instead.');
      }

      // Check platform support
      if (!deviceAuth.isDeviceAuthSupported()) {
        throw new Error('Device authentication not supported on this platform');
      }

      // Get device keypair
      const keypair = await deviceAuth.getDeviceKeypair();
      if (!keypair) {
        throw new Error('No device keypair found. Use registerWithDevice() first.');
      }

      // Get device info
      const deviceInfo = await deviceAuth.getDeviceInfo();

      // Request timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Call backend API to get challenge
        const challengeResponse = await fetch(`${CONFIG.API_URL}/auth/challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: keypair.publicKey,
          }),
          signal: controller.signal,
        });

        if (!challengeResponse.ok) {
          const errorData = await challengeResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Challenge request failed (${challengeResponse.status})`;
          throw new Error(errorMessage);
        }

        const challengeData = await challengeResponse.json();
        if (!challengeData.challenge) {
          throw new Error('Invalid challenge response from server');
        }

        const { challenge } = challengeData;

        // Sign challenge with device private key
        const signature = await deviceAuth.signChallenge(challenge, keypair.privateKey);

        // Send signature to backend for verification
        const loginResponse = await fetch(`${CONFIG.API_URL}/auth/verify-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: keypair.publicKey,
            challenge,
            signature,
            deviceId: deviceInfo.deviceId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!loginResponse.ok) {
          const errorData = await loginResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Authentication failed (${loginResponse.status})`;
          throw new Error(errorMessage);
        }

        const loginData = await loginResponse.json();
        if (!loginData.user || !loginData.tokens) {
          throw new Error('Invalid authentication response from server');
        }

        const { user, tokens } = loginData;

        // Create session object
        const sessionData = {
          user,
          tokens,
        };

        // Store session in secure storage for restoration
        await deviceAuth.storeSession(sessionData);

        // Update auth state
        setUser(user as any);
        setSession(sessionData as any);

        // Log login audit
        if (deviceId) {
          await auditHelpers.loginSuccess(user.id, `device-${deviceInfo.deviceName || 'unknown'}`, deviceId);
        }

        return { data: { user, tokens } };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Authentication timed out. Please check your network connection.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Device login failed:', error);
      return { error: error as Error };
    }
  };

  /**
   * Set Password for Hybrid Authentication (Phase 1)
   *
   * Adds username/password authentication to an existing device-only account.
   * Enables two-factor authentication (device token + password).
   *
   * @param username - Username for the account (3-30 chars, alphanumeric + _-)
   * @param password - Password (8+ chars, complexity requirements)
   * @returns Object with success flag, user data, and error
   */
  const setPassword = async (username: string, password: string): Promise<{
    data?: { user: any };
    error?: Error;
  }> => {
    try {
      // Check if device auth is enabled
      if (!CONFIG.USE_DEVICE_AUTH) {
        throw new Error('Device authentication is not enabled');
      }

      // Check if hybrid auth is enabled
      if (!CONFIG.USE_HYBRID_AUTH) {
        throw new Error('Hybrid authentication is not enabled');
      }

      // Check if user is logged in
      if (!user) {
        throw new Error('User must be logged in to set password');
      }

      // Get device info
      const deviceInfo = await deviceAuth.getDeviceInfo();

      // Request timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Call backend API to set password
        const response = await fetch(`${CONFIG.API_URL}/auth/set-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            username,
            password,
            deviceId: deviceInfo.deviceId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Set password failed (${response.status})`;
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log('[setPassword] ✅ Backend response received:', {
          hasUser: !!responseData.user,
          userId: responseData.user?.id,
          username: responseData.user?.username,
        });

        if (!responseData.user) {
          console.error('[setPassword] ❌ Invalid response structure:', responseData);
          throw new Error('Invalid response from server');
        }

        const updatedUser = responseData.user;

        console.log('[setPassword] 📝 Updating user in AuthContext with username:', username);
        // Update user in state (now has username)
        setUser({ ...user, username } as any);
        console.log('[setPassword] ✅ User updated with username');

        // Log audit event
        if (deviceId) {
          console.log(`Password set for user ${username}`);
        }

        return { data: { user: updatedUser } };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Set password timed out. Please check your network connection.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Set password failed:', error);
      return { error: error as Error };
    }
  };

  /**
   * Login with Hybrid Authentication (Phase 1)
   *
   * Two-factor authentication combining:
   * - Layer 1: Device token signature verification
   * - Layer 2: Username/password verification
   *
   * Both layers must pass for successful authentication.
   *
   * @param username - Username for the account
   * @param password - Password for the account
   * @returns Object with success flag, user data, and error
   */
  const loginWithHybridAuth = async (username: string, password: string): Promise<{
    data?: { user: any; tokens: any };
    error?: Error;
  }> => {
    try {
      // Check if device auth is enabled
      if (!CONFIG.USE_DEVICE_AUTH) {
        throw new Error('Device authentication is not enabled');
      }

      // Check if hybrid auth is enabled
      if (!CONFIG.USE_HYBRID_AUTH) {
        throw new Error('Hybrid authentication is not enabled');
      }

      // Check platform support
      if (!deviceAuth.isDeviceAuthSupported()) {
        throw new Error('Device authentication not supported on this platform');
      }

      // Get device keypair
      const keypair = await deviceAuth.getDeviceKeypair();
      if (!keypair) {
        throw new Error('No device keypair found. Use registerWithDevice() first.');
      }

      // Get device info
      const deviceInfo = await deviceAuth.getDeviceInfo();

      // Request timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Step 1: Get challenge from backend
        const challengeResponse = await fetch(`${CONFIG.API_URL}/auth/challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: keypair.publicKey,
          }),
          signal: controller.signal,
        });

        if (!challengeResponse.ok) {
          const errorData = await challengeResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Challenge request failed (${challengeResponse.status})`;
          throw new Error(errorMessage);
        }

        const challengeData = await challengeResponse.json();
        if (!challengeData.challenge) {
          throw new Error('Invalid challenge response from server');
        }

        const { challenge } = challengeData;

        // Step 2: Sign challenge with device private key
        const signature = await deviceAuth.signChallenge(challenge, keypair.privateKey);

        // Step 3: Send hybrid authentication request (device signature + username/password)
        const loginResponse = await fetch(`${CONFIG.API_URL}/auth/login-hybrid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            publicKey: keypair.publicKey,
            challenge,
            signature,
            deviceId: deviceInfo.deviceId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!loginResponse.ok) {
          const errorData = await loginResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Hybrid authentication failed (${loginResponse.status})`;
          throw new Error(errorMessage);
        }

        const loginData = await loginResponse.json();
        if (!loginData.user || !loginData.tokens) {
          throw new Error('Invalid authentication response from server');
        }

        const { user: authenticatedUser, tokens } = loginData;

        // Create session object
        const sessionData = {
          user: authenticatedUser,
          tokens,
        };

        // Store session in secure storage for restoration
        await deviceAuth.storeSession(sessionData);

        // Update auth state
        setUser(authenticatedUser as any);
        setSession(sessionData as any);

        // Log login audit
        if (deviceId) {
          await auditHelpers.loginSuccess(authenticatedUser.id, username, deviceId);
        }

        return { data: { user: authenticatedUser, tokens } };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Hybrid authentication timed out. Please check your network connection.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Hybrid login failed:', error);

      // Log failed login audit
      if (deviceId) {
        await auditHelpers.loginFailed(username, (error as Error).message, deviceId);
      }

      return { error: error as Error };
    }
  };

  /**
   * Check if device can auto-login
   *
   * Returns true if device has a stored keypair, meaning user can login
   * automatically without any UI interaction.
   */
  const canAutoLogin = (): boolean => {
    return CONFIG.USE_DEVICE_AUTH && hasDeviceKeypair;
  };

  // ============================================================================
  // SIGN OUT (Works for both Supabase and Device Auth)
  // ============================================================================

  const signOut = async () => {
    try {
      // Log logout before signing out
      if (user && deviceId) {
        await auditHelpers.logout(user.id, user.email || '', deviceId);
      }

      if (CONFIG.USE_DEVICE_AUTH && deviceAuth.isDeviceAuthSupported()) {
        // Device auth logout: Delete device keypair and session
        await deviceAuth.deleteDeviceKeypair();
        await deviceAuth.deleteSession();
        setHasDeviceKeypair(false);
        clearAuth();
        return { error: null };
      } else {
        // Supabase logout
        const { error } = await supabase.auth.signOut();
        if (!error) {
          clearAuth();
        }
        return { error };
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      return { error: error as Error };
    }
  };

  return {
    user,
    session,
    isLoading,
    // Supabase methods (legacy)
    signUp,
    signInWithPassword,
    resetPassword,
    updatePassword,
    signInWithOTP,
    verifyOTP,
    // Device auth methods (privacy-first)
    registerWithDevice,
    loginWithDevice,
    canAutoLogin,
    hasDeviceKeypair,
    // Hybrid auth methods (Phase 1: two-factor authentication)
    setPassword,
    loginWithHybridAuth,
    // Shared methods
    signOut,
  };
};
