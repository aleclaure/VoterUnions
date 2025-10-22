import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform as RNPlatform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { passwordSchema, emailSchema, validateData } from '../lib/validations';
import { rateLimiter } from '../services/rateLimit';
import { auditHelpers } from '../services/auditLog';
import { useDeviceId } from '../hooks/useDeviceId';
import { CONFIG } from '../config';
import * as platformDeviceAuth from '../services/platformDeviceAuth';

export const AuthScreen = () => {
  const [authMethod, setAuthMethod] = useState<'device' | 'email'>('device');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    signUp,
    signInWithPassword,
    resetPassword,
    registerWithDevice,
    loginWithDevice,
    canAutoLogin,
    hasDeviceKeypair,
  } = useAuth();
  const { deviceId } = useDeviceId();

  // Auto-login check on mount (if device keypair exists)
  useEffect(() => {
    const checkAutoLogin = async () => {
      if (CONFIG.USE_DEVICE_AUTH && canAutoLogin()) {
        setLoading(true);
        const result = await loginWithDevice();
        setLoading(false);

        if (result.error) {
          console.log('Auto-login failed:', result.error.message);
          // Don't show alert, just let user manually login
        }
      }
    };

    checkAutoLogin();
  }, []);

  const handleSignUp = async () => {
    // Check rate limit
    const rateLimit = await rateLimiter.checkRateLimit('signup', email);
    if (rateLimit.isBlocked && rateLimit.timeRemaining) {
      const timeStr = rateLimiter.formatTimeRemaining(rateLimit.timeRemaining);
      Alert.alert('Too Many Attempts', `Please try again in ${timeStr}`);
      await auditHelpers.rateLimitTriggered(email, 'signup', deviceId);
      return;
    }

    // Validate email
    const emailValidation = validateData(emailSchema, email);
    if (!emailValidation.success) {
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    // Validate password strength
    const passwordValidation = validateData(passwordSchema, password);
    if (!passwordValidation.success) {
      Alert.alert('Weak Password', passwordValidation.error);
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      await rateLimiter.recordAttempt('signup', email);
      await auditHelpers.signupFailed(email, error.message, deviceId);
    } else if (data.user) {
      await rateLimiter.clearLimit('signup', email);
      await auditHelpers.signupSuccess(data.user.id, email, deviceId);
      Alert.alert('Success', 'Account created! Please check your email to verify.');
    }
  };

  const handleSignIn = async () => {
    // Check rate limit
    const rateLimit = await rateLimiter.checkRateLimit('login', email);
    if (rateLimit.isBlocked && rateLimit.timeRemaining) {
      const timeStr = rateLimiter.formatTimeRemaining(rateLimit.timeRemaining);
      Alert.alert('Account Locked', `Too many failed attempts. Please try again in ${timeStr}`);
      await auditHelpers.rateLimitTriggered(email, 'login', deviceId);
      return;
    }

    // Validate email format
    const emailValidation = validateData(emailSchema, email);
    if (!emailValidation.success) {
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    const { error, data } = await signInWithPassword(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      await rateLimiter.recordAttempt('login', email);
      await auditHelpers.loginFailed(email, error.message, deviceId);
    } else if (data?.user) {
      await rateLimiter.clearLimit('login', email);
      await auditHelpers.loginSuccess(data.user.id, email, deviceId);
    }
  };

  const handleForgotPassword = async () => {
    // Check rate limit
    const rateLimit = await rateLimiter.checkRateLimit('passwordReset', email);
    if (rateLimit.isBlocked && rateLimit.timeRemaining) {
      const timeStr = rateLimiter.formatTimeRemaining(rateLimit.timeRemaining);
      Alert.alert('Too Many Requests', `Please try again in ${timeStr}`);
      await auditHelpers.rateLimitTriggered(email, 'password_reset', deviceId);
      return;
    }

    // Validate email format
    const emailValidation = validateData(emailSchema, email);
    if (!emailValidation.success) {
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      await rateLimiter.recordAttempt('passwordReset', email);
    } else {
      await rateLimiter.clearLimit('passwordReset', email);
      await auditHelpers.passwordResetRequested(email, deviceId);
      Alert.alert('Success', 'Password reset link sent to your email');
      setShowForgotPassword(false);
    }
  };

  // ============================================================================
  // DEVICE TOKEN AUTHENTICATION HANDLERS
  // ============================================================================

  const handleDeviceRegister = async () => {
    setLoading(true);
    const result = await registerWithDevice();
    setLoading(false);

    if (result.error) {
      Alert.alert(
        'Registration Failed',
        result.error.message || 'Could not register device. Please try again.'
      );
    } else {
      Alert.alert(
        'Success!',
        `Welcome! Your device has been registered securely.\n\nPlatform: ${RNPlatform.OS}\nDevice ID: ${deviceId?.substring(0, 8)}...`
      );
    }
  };

  const handleDeviceLogin = async () => {
    setLoading(true);
    const result = await loginWithDevice();
    setLoading(false);

    if (result.error) {
      Alert.alert(
        'Login Failed',
        result.error.message || 'Could not authenticate device. Please register first.'
      );
    } else {
      Alert.alert(
        'Welcome Back!',
        `Successfully authenticated with your device.\n\nPlatform: ${RNPlatform.OS}`
      );
    }
  };

  // Get platform info for display
  const platformInfo = platformDeviceAuth.getPlatformInfo();
  const isDeviceAuthSupported = platformDeviceAuth.isDeviceAuthSupported();

  if (showForgotPassword) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Voter Unions</Text>
      <Text style={styles.subtitle}>Organize. Debate. Act.</Text>

      {/* Authentication Method Selector */}
      {CONFIG.USE_DEVICE_AUTH && isDeviceAuthSupported && (
        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[styles.methodButton, authMethod === 'device' && styles.methodButtonActive]}
            onPress={() => setAuthMethod('device')}
          >
            <Text style={[styles.methodText, authMethod === 'device' && styles.methodTextActive]}>
              🔐 Device Token
            </Text>
            <Text style={styles.methodSubtext}>Privacy-First</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodButton, authMethod === 'email' && styles.methodButtonActive]}
            onPress={() => setAuthMethod('email')}
          >
            <Text style={[styles.methodText, authMethod === 'email' && styles.methodTextActive]}>
              📧 Email/Password
            </Text>
            <Text style={styles.methodSubtext}>Traditional</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Device Token Authentication UI */}
      {authMethod === 'device' && CONFIG.USE_DEVICE_AUTH && isDeviceAuthSupported ? (
        <View style={styles.form}>
          {/* Platform Info Badge */}
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>
              {platformInfo.isWeb ? '🌐 Web Browser' : '📱 Native App'} • {platformInfo.platform}
            </Text>
            <Text style={styles.infoBadgeSubtext}>
              {hasDeviceKeypair ? '✓ Device Registered' : 'No device keypair found'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🔐 Privacy-First Authentication</Text>
            <Text style={styles.infoText}>
              • No email or password required{'\n'}
              • Cryptographic device token (P-256 ECDSA){'\n'}
              • {platformInfo.isWeb ? 'Encrypted in IndexedDB' : 'Hardware-backed secure storage'}{'\n'}
              • Auto-login on this device
            </Text>
          </View>

          {/* Separate Register and Login Buttons */}
          {!hasDeviceKeypair ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
                onPress={handleDeviceRegister}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Registering Device...' : '🆕 Register This Device'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Creates a new account for this device with cryptographic authentication
              </Text>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonSuccess, loading && styles.buttonDisabled]}
                onPress={handleDeviceLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Authenticating...' : '🔓 Login with Device Token'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Authenticate using your device's cryptographic key
              </Text>
            </>
          )}

          <TouchableOpacity onPress={() => setAuthMethod('email')}>
            <Text style={styles.linkText}>Use Email/Password instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Email/Password Authentication UI */
        <>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
              onPress={() => setIsSignUp(true)}
            >
              <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
              onPress={() => setIsSignUp(false)}
            >
              <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
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

            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {CONFIG.USE_DEVICE_AUTH && isDeviceAuthSupported && (
              <TouchableOpacity onPress={() => setAuthMethod('device')}>
                <Text style={styles.linkText}>Use Device Token instead</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#64748b',
  },
  // Authentication method selector styles
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 6,
    marginBottom: 24,
    gap: 8,
  },
  methodButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#2563eb',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  methodTextActive: {
    color: '#2563eb',
  },
  methodSubtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
  // Platform info badge
  infoBadge: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  infoBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  infoBadgeSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  // Info box for device auth explanation
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#2563eb',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonSuccess: {
    backgroundColor: '#059669',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: -8,
  },
  linkText: {
    color: '#2563eb',
    textAlign: 'center',
    fontSize: 14,
  },
});
