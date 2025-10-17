import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, AppState } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { checkEmailVerification, resendVerificationEmail, refreshVerificationStatus } from '../services/emailVerification';

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Reusable verification check
  const checkVerification = useCallback(async () => {
    const status = await checkEmailVerification(user);
    setIsVerified(status.isVerified);
    return status.isVerified;
  }, [user]);

  // Check on mount and user change
  useEffect(() => {
    checkVerification();
  }, [checkVerification]);

  // Recheck when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Refresh session and get fresh verification status
        const refreshResult = await refreshVerificationStatus();
        // Update local state with fresh result
        setIsVerified(refreshResult.isVerified);
        // Auto-dismiss banner if now verified
        if (refreshResult.isVerified) {
          setDismissed(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleResendVerification = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    setIsResending(true);
    const result = await resendVerificationEmail(user.email);
    setIsResending(false);

    if (result.success) {
      Alert.alert(
        'Verification Email Sent',
        'Please check your inbox and click the verification link. After verifying, return to the app to unlock all features.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Refresh session and get fresh verification status
              const refreshResult = await refreshVerificationStatus();
              // Update local state with fresh result
              setIsVerified(refreshResult.isVerified);
              // Auto-dismiss if verified
              if (refreshResult.isVerified) {
                setDismissed(true);
              }
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to send verification email');
    }
  };

  if (isVerified || dismissed || !user) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.message}>
            Check your inbox for a verification link. Some features are limited until verified.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.resendButton} 
          onPress={handleResendVerification}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Text style={styles.resendText}>Resend Email</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dismissButton} 
          onPress={() => setDismissed(true)}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  resendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  resendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 18,
    color: '#92400e',
  },
});
