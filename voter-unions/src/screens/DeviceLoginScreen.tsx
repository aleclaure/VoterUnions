/**
 * Device Login Screen
 * 
 * Privacy-first login screen that authenticates users via cryptographic
 * signatures instead of passwords.
 * 
 * Features:
 * - Auto-login detection (if device keypair exists)
 * - One-tap manual login
 * - No password entry
 * - Platform gating (native-only)
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { CONFIG } from '../config';
import { isDeviceAuthSupported } from '../services/platformDeviceAuth';
import { ProgressLoadingScreen } from '../components/ProgressLoadingScreen';

export const DeviceLoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  const [progressStep, setProgressStep] = useState<'generating' | 'creating' | 'authenticating' | 'verifying'>('authenticating');
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { loginWithDevice, loginWithHybridAuth, canAutoLogin, hasDeviceKeypair } = useAuth();

  // Check if device auth is supported
  const isPlatformSupported = isDeviceAuthSupported();
  const isDeviceAuthEnabled = CONFIG.USE_DEVICE_AUTH;

  // Auto-login on mount if possible
  // Phase 1: Disable auto-login for hybrid auth (requires username/password)
  useEffect(() => {
    const attemptAutoLogin = async () => {
      // Skip auto-login if hybrid auth is enabled
      if (CONFIG.USE_HYBRID_AUTH) {
        console.log('Skipping auto-login: hybrid auth enabled (username/password required)');
        return;
      }

      if (canAutoLogin()) {
        setAutoLoggingIn(true);
        try {
          // Phase 5: Show progress during auto-login
          setProgressStep('authenticating');
          setProgress(0);

          await new Promise(resolve => setTimeout(resolve, 300));
          setProgress(50);

          const { error } = await loginWithDevice();
          setProgress(100);

          if (error) {
            console.error('Auto-login failed:', error);
            Alert.alert(
              'Auto-Login Failed',
              'Could not log in automatically. Please try manually.'
            );
          }
        } catch (error) {
          console.error('Auto-login error:', error);
        } finally {
          setAutoLoggingIn(false);
        }
      }
    };

    attemptAutoLogin();
  }, [canAutoLogin, loginWithDevice]);

  const handleManualLogin = async () => {
    // Phase 1: Hybrid Auth - Validate username/password if enabled
    if (CONFIG.USE_HYBRID_AUTH) {
      if (!username || !password) {
        Alert.alert(
          'Missing Credentials',
          'Please enter both username and password'
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Phase 5: Show progress - Step 1: Authenticating token
      setProgressStep('authenticating');
      setProgress(0);

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(33);

      // Phase 1: Use hybrid login if enabled, otherwise device-only
      if (CONFIG.USE_HYBRID_AUTH) {
        // Phase 5: Show progress - Step 2: Verifying credentials
        setProgressStep('verifying');
        setProgress(50);

        // Call hybrid login method (verifies both device token AND username/password)
        const { data, error } = await loginWithHybridAuth(username, password);
        setProgress(100);

        if (error) {
          Alert.alert('Login Failed', error.message);
        } else if (data) {
          // Success - user is now logged in, AppNavigator will navigate automatically
          console.log('✅ [DeviceLogin] Hybrid login successful!');
          console.log('✅ [DeviceLogin] User logged in, navigation will happen automatically');
        }
      } else {
        // Device-only login (current implementation)
        const { data, error } = await loginWithDevice();
        setProgress(100);

        if (error) {
          Alert.alert('Login Failed', error.message);
        } else if (data) {
          // Success - user is now logged in, AppNavigator will navigate automatically
          console.log('✅ [DeviceLogin] Device-only login successful!');
          console.log('✅ [DeviceLogin] User logged in, navigation will happen automatically');
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
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
              3. Log in on your device
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if device not registered
  if (!hasDeviceKeypair) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🆕</Text>
          <Text style={styles.errorTitle}>Device Not Registered</Text>
          <Text style={styles.errorText}>
            This device hasn't been registered yet. You need to create an
            account first.
          </Text>
          <Text style={styles.hint}>
            Please use the "Create Account" option to register this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Phase 5: Show auto-login progress
  if (autoLoggingIn) {
    return (
      <ProgressLoadingScreen
        step={progressStep}
        progress={progress}
        subtitle="Verifying device signature automatically"
      />
    );
  }

  // Phase 5: Show manual login progress
  if (loading) {
    return (
      <ProgressLoadingScreen
        step={progressStep}
        progress={progress}
        subtitle={
          progressStep === 'authenticating'
            ? 'Signing challenge with device key'
            : 'Verifying username and password'
        }
      />
    );
  }

  // Main login screen (manual login option)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Device Token Authentication</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🔐</Text>
          <Text style={styles.infoTitle}>Device Recognized</Text>
          <Text style={styles.infoText}>
            This device has a registered cryptographic identity. 
            Tap below to log in with a secure signature - no password needed!
          </Text>
        </View>

        {/* Phase 1: Show features for device-only auth */}
        {!CONFIG.USE_HYBRID_AUTH && (
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>No password entry</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureText}>Instant authentication</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={styles.featureText}>
                {Platform.OS === 'web'
                  ? 'IndexedDB + AES-256-GCM encryption'
                  : `Hardware-backed security (${Platform.OS === 'ios' ? 'Keychain' : 'Keystore'})`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Phase 1: Hybrid Auth - Username/Password Fields */}
        {CONFIG.USE_HYBRID_AUTH && (
          <View style={styles.hybridAuthSection}>
            <Text style={styles.sectionTitle}>
              🔐 Two-Factor Authentication
            </Text>
            <Text style={styles.sectionDescription}>
              Enter your username and password. Your device signature will be verified automatically.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
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
            </View>

            <View style={styles.securityNote}>
              <Text style={styles.securityNoteIcon}>🛡️</Text>
              <Text style={styles.securityNoteText}>
                Both your device token and password are required for login
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleManualLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.technicalNote}>
          Your device will sign a challenge with its private key to prove
          identity. The private key never leaves secure storage.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
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
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  technicalNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    fontWeight: '500',
  },
  loadingHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 24,
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
    marginBottom: 20,
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  securityNoteIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#2e7d32',
    flex: 1,
    lineHeight: 18,
  },
});
