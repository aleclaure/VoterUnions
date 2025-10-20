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
import { isDeviceAuthSupported } from '../services/deviceAuth';

export const DeviceRegisterScreen = () => {
  const [loading, setLoading] = useState(false);
  const { registerWithDevice, hasDeviceKeypair } = useAuth();

  // Check if device auth is supported
  const isPlatformSupported = isDeviceAuthSupported();
  const isDeviceAuthEnabled = CONFIG.USE_DEVICE_AUTH;

  const handleRegister = async () => {
    setLoading(true);

    try {
      const { data, error } = await registerWithDevice();

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else if (data) {
        Alert.alert(
          'Account Created! 🎉',
          'Your device has been registered. You can now use the app with complete privacy - no email or password needed!',
          [{ text: 'Get Started', onPress: () => {} }]
        );
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
            • Hardware-backed key storage (
            {Platform.OS === 'ios' ? 'iOS Keychain' : 'Android Keystore'})
          </Text>
          <Text style={styles.securityText}>
            • Deterministic signatures (RFC 6979)
          </Text>
          <Text style={styles.securityText}>
            • Zero-knowledge authentication
          </Text>
        </View>

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
});
