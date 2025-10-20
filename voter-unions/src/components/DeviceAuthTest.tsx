/**
 * Device Auth Test Component
 * 
 * This component tests the device authentication crypto setup.
 * It verifies that:
 * - Platform support detection works
 * - RNG is working (generates different keys)
 * - Key generation works
 * - Signing works
 * - Verification works
 * - Secure storage works
 * 
 * Run this in Expo Go to verify Day 1 setup is complete.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { testDeviceAuth } from '../services/deviceAuth';

export default function DeviceAuthTest() {
  const [testResults, setTestResults] = useState<{
    success: boolean;
    details: string[];
    errors: string[];
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const results = await testDeviceAuth();
      setTestResults(results);
    } catch (error) {
      setTestResults({
        success: false,
        details: [],
        errors: [`Unexpected error: ${error}`],
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Auth Test</Text>
      <Text style={styles.subtitle}>Day 1: Crypto Setup Verification</Text>
      
      <View style={styles.platformInfo}>
        <Text style={styles.platformText}>Platform: {Platform.OS}</Text>
        <Text style={styles.platformText}>
          {Platform.OS === 'web' ? '❌ Not Supported' : '✅ Supported'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runTests}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Running Tests...' : 'Run Crypto Tests'}
        </Text>
      </TouchableOpacity>

      {testResults && (
        <ScrollView style={styles.resultsContainer}>
          <View style={[
            styles.resultHeader,
            testResults.success ? styles.successHeader : styles.errorHeader
          ]}>
            <Text style={styles.resultHeaderText}>
              {testResults.success ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}
            </Text>
          </View>

          {testResults.details.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details:</Text>
              {testResults.details.map((detail, index) => (
                <Text key={index} style={styles.detailText}>
                  {detail}
                </Text>
              ))}
            </View>
          )}

          {testResults.errors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Errors:</Text>
              {testResults.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  {error}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This test verifies that the crypto polyfill, @noble/curves,
          and secure storage are working correctly on this device.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  platformInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  platformText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultHeader: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  successHeader: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  errorHeader: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  resultHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#d9534f',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
