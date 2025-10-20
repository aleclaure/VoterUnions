import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { auditHelpers } from '../services/auditLog';
import { useDeviceId } from './useDeviceId';
import { CONFIG } from '../config';
import * as deviceAuth from '../services/deviceAuth';

export const useAuth = () => {
  const { user, session, isLoading, setUser, setSession, setIsLoading, clearAuth } = useAuthStore();
  const { deviceId } = useDeviceId();
  const [hasDeviceKeypair, setHasDeviceKeypair] = useState(false);

  useEffect(() => {
    // Initialize authentication based on CONFIG flag
    const initializeAuth = async () => {
      if (CONFIG.USE_DEVICE_AUTH && deviceAuth.isDeviceAuthSupported()) {
        // Check if device keypair exists
        const keypair = await deviceAuth.getDeviceKeypair();
        setHasDeviceKeypair(!!keypair);
        
        if (keypair) {
          // Restore session from secure storage
          const storedSession = await deviceAuth.getStoredSession();
          if (storedSession) {
            setUser(storedSession.user as any);
            setSession(storedSession as any);
          }
        }
        
        setIsLoading(false);
      } else {
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
        
        if (!responseData.user || !responseData.tokens) {
          throw new Error('Invalid response from server');
        }
        
        const { user, tokens } = responseData;

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
        setHasDeviceKeypair(true);

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
    // Shared methods
    signOut,
  };
};
