/**
 * Device Registration Screen
 * 
 * Privacy-first authentication screen that creates accounts using
 * cryptographic device identity instead of email/password.
 * 
 * Features:
 * - No email collection
 * - No password creation
 * - One-tap registration
 * - Hardware-backed security
 * - Platform gating (native-only)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { CONFIG } from '../config';
import { isDeviceAuthSupported } from '../services/platformDeviceAuth';
import { ProgressLoadingScreen } from '../components/ProgressLoadingScreen';

export const DeviceRegisterScreen = () => {
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<'generating' | 'creating' | 'authenticating' | 'verifying'>('generating');
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { registerWithDevice, setPassword: setPasswordMethod, hasDeviceKeypair } = useAuth();

  // Check if device auth is supported
  const isPlatformSupported = isDeviceAuthSupported();
  const isDeviceAuthEnabled = CONFIG.USE_DEVICE_AUTH;

  const handleRegister = async () => {
    console.log('🔐 [DeviceRegister] handleRegister called!', {
      username: username || '(empty)',
      hasPassword: !!password,
      hybridAuthEnabled: CONFIG.USE_HYBRID_AUTH,
      usernameRequired: CONFIG.REQUIRE_USERNAME,
    });

    // Phase 1: Hybrid Auth - Validate username/password if enabled
    if (CONFIG.USE_HYBRID_AUTH) {
      console.log('🔐 [DeviceRegister] Hybrid auth is enabled, validating credentials...');
      // If required, check fields are filled
      if (CONFIG.REQUIRE_USERNAME && (!username || !password)) {
        console.error('❌ [DeviceRegister] Validation failed: Missing username or password');
        Alert.alert(
          'Missing Fields',
          'Please enter both username and password'
        );
        return;
      }
      console.log('✅ [DeviceRegister] Validation passed: Username and password provided');

      // If provided (even if optional), validate them
      if (username || password) {
        // Both must be provided together
        if (!username || !password) {
          Alert.alert(
            'Incomplete',
            'Please provide both username and password, or leave both empty'
          );
          return;
        }

        // Validate username format
        if (username.length < 3) {
          Alert.alert('Invalid Username', 'Username must be at least 3 characters');
          return;
        }
        if (username.length > 30) {
          Alert.alert('Invalid Username', 'Username must be at most 30 characters');
          return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          Alert.alert(
            'Invalid Username',
            'Username can only contain letters, numbers, underscores, and hyphens'
          );
          return;
        }

        // Validate password strength
        if (password.length < 8) {
          Alert.alert('Weak Password', 'Password must be at least 8 characters');
          return;
        }
        if (!/[A-Z]/.test(password)) {
          Alert.alert('Weak Password', 'Password must contain at least one uppercase letter');
          return;
        }
        if (!/[a-z]/.test(password)) {
          Alert.alert('Weak Password', 'Password must contain at least one lowercase letter');
          return;
        }
        if (!/[0-9]/.test(password)) {
          Alert.alert('Weak Password', 'Password must contain at least one number');
          return;
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
          Alert.alert('Weak Password', 'Password must contain at least one special character');
          return;
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
          Alert.alert('Password Mismatch', 'Passwords do not match');
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Phase 5: Show progress - Step 1: Generating encryption keys
      setProgressStep('generating');
      setProgress(0);

      // Simulate key generation progress (actual operation is fast)
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(33);

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(66);

      // Step 1: Register device (always required)
      console.log('🔐 [DeviceRegister] Step 1: Calling registerWithDevice...');
      const { data, error } = await registerWithDevice();
      setProgress(100);
      console.log('🔐 [DeviceRegister] Step 1: registerWithDevice completed', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
      });

      if (error) {
        console.error('❌ [DeviceRegister] Registration failed:', error.message);
        Alert.alert('Registration Failed', error.message);
        return;
      }

      if (!data) {
        console.error('❌ [DeviceRegister] No data returned from registration');
        Alert.alert('Error', 'Registration failed - no data returned');
        return;
      }

      console.log('✅ [DeviceRegister] Step 1 SUCCESS: Device registered, user logged in');

      // Phase 5: Show progress - Step 2: Creating encrypted account
      setProgressStep('creating');
      setProgress(0);

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(50);

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(100);

      // Step 2: If hybrid auth enabled and credentials provided, set password
      if (CONFIG.USE_HYBRID_AUTH && username && password) {
        console.log('🔐 [DeviceRegister] Step 2: Setting password for hybrid auth...');
        // Phase 5: Show progress - Step 3: Verifying credentials
        setProgressStep('verifying');
        setProgress(0);

        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress(50);
        // Call /auth/set-password endpoint
        console.log('🔐 [DeviceRegister] Calling setPassword with username:', username);
        const { error: passwordError } = await setPasswordMethod(username, password);
        setProgress(100);
        console.log('🔐 [DeviceRegister] setPassword completed', {
          hasError: !!passwordError,
          errorMessage: passwordError?.message,
        });

        if (passwordError) {
          console.error('❌ [DeviceRegister] Password setup failed:', passwordError.message);
          Alert.alert(
            'Password Setup Failed',
            passwordError.message || 'Failed to set username and password. Your device is registered, but you\'ll need to try setting up hybrid authentication again.'
          );
          return;
        }

        console.log('✅ [DeviceRegister] Step 2 SUCCESS: Password set');
        console.log('✅ [DeviceRegister] Registration successful with hybrid auth!');
        console.log('✅ [DeviceRegister] User should now be logged in, navigation will happen automatically');
      } else {
        console.log('✅ [DeviceRegister] Registration successful with device-only auth!');
        console.log('✅ [DeviceRegister] User should now be logged in, navigation will happen automatically');
      }

      // Don't show alert - let AppNavigator detect user state and navigate automatically
      // The user is now logged in (registerWithDevice set user/session in AuthContext)
      // AppNavigator will re-render and show Onboarding or Main screen
    } catch (error) {
      console.error('❌ [DeviceRegister] Unexpected error in handleRegister:', error);
      console.error('❌ [DeviceRegister] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      Alert.alert(
        'Error',
        `An unexpected error occurred: ${(error as Error).message}`
      );
    } finally {
      console.log('🔐 [DeviceRegister] Finally block - setting loading to false');
      setLoading(false);
    }
  };

  // Show error if device auth is disabled
  if (!isDeviceAuthEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Device Auth Disabled</Text>
          <Text style={styles.errorText}>
            Device Token Authentication is currently disabled.
          </Text>
          <Text style={styles.errorText}>
            This feature is in migration (Week 0-7). It will be enabled
            once the migration is complete.
          </Text>
          <Text style={styles.hint}>
            For now, please use the standard email/password authentication.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if platform is not supported (web)
  if (!isPlatformSupported) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🌐</Text>
          <Text style={styles.errorTitle}>Web Platform Detected</Text>
          <Text style={styles.errorText}>
            Device Token Authentication requires hardware-backed secure
            storage, which is only available on iOS and Android.
          </Text>
          <Text style={styles.hint}>
            To use this feature:
          </Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instruction}>
              1. Install Expo Go on your iOS or Android device
            </Text>
            <Text style={styles.instruction}>
              2. Scan the QR code to open the app
            </Text>
            <Text style={styles.instruction}>
              3. Create your account on your device
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if device already registered
  if (hasDeviceKeypair) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>✅</Text>
          <Text style={styles.errorTitle}>Already Registered</Text>
          <Text style={styles.errorText}>
            This device has already been registered. You should be logged
            in automatically.
          </Text>
          <Text style={styles.hint}>
            If you want to create a new account, please log out first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Phase 5: Show progress loading screen during registration
  if (loading) {
    return (
      <ProgressLoadingScreen
        step={progressStep}
        progress={progress}
        subtitle={
          progressStep === 'generating'
            ? 'P-256 ECDSA keypair generation'
            : progressStep === 'creating'
            ? 'Storing encrypted credentials'
            : 'Setting up two-factor authentication'
        }
      />
    );
  }

  // Main registration screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Privacy-First Authentication</Text>
        </View>

        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>🔒 How It Works</Text>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎭</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>No Email Collection</Text>
              <Text style={styles.featureText}>
                We don't ask for your email, phone, or any personal information.
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔐</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Cryptographic Identity</Text>
              <Text style={styles.featureText}>
                Your device generates a unique cryptographic key stored in
                hardware-backed secure storage.
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⚡</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>One-Tap Login</Text>
              <Text style={styles.featureText}>
                Future logins are automatic - no passwords to remember!
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Device-Specific</Text>
              <Text style={styles.featureText}>
                Your account is tied to this device. To use multiple devices,
                you'll create separate accounts.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.security}>
          <Text style={styles.securityTitle}>🛡️ Security Details</Text>
          <Text style={styles.securityText}>
            • NIST P-256 elliptic curve cryptography
          </Text>
          <Text style={styles.securityText}>
            • {Platform.OS === 'web'
              ? 'IndexedDB + AES-256-GCM encrypted storage'
              : `Hardware-backed key storage (${Platform.OS === 'ios' ? 'iOS Keychain' : 'Android Keystore'})`
            }
          </Text>
          <Text style={styles.securityText}>
            • Deterministic signatures (RFC 6979)
          </Text>
          <Text style={styles.securityText}>
            • Zero-knowledge authentication
          </Text>
        </View>

        {/* Phase 1: Hybrid Auth - Username/Password Fields */}
        {CONFIG.USE_HYBRID_AUTH && (
          <View style={styles.hybridAuthSection}>
            <Text style={styles.sectionTitle}>
              🔐 Additional Security Layer
            </Text>
            <Text style={styles.sectionDescription}>
              {CONFIG.REQUIRE_USERNAME
                ? 'Create a username and password for two-factor authentication'
                : 'Optionally add a username and password for extra security'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Username {CONFIG.REQUIRE_USERNAME && '*'}
              </Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Text style={styles.inputHint}>
                3-30 characters, letters, numbers, _ and -
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Password {CONFIG.REQUIRE_USERNAME && '*'}
              </Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Text style={styles.inputHint}>
                8+ characters, uppercase, lowercase, number, special char
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Confirm Password {CONFIG.REQUIRE_USERNAME && '*'}
              </Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By creating an account, you agree that your identity is tied to
          this device. You cannot transfer your account to another device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  explainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  explainerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  feature: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  security: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 6,
    paddingLeft: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionsList: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 16,
  },
  // Phase 1: Hybrid Auth Styles
  hybridAuthSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
