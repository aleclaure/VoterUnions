/**
 * Progress Loading Screen Component
 *
 * Displays cryptographic operations in progress with animated progress bar.
 * Used during device registration and hybrid authentication to show:
 * - Encryption token generation
 * - Account creation
 * - Token authentication
 *
 * Phase 5: Enhanced user experience with visual feedback
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  SafeAreaView,
} from 'react-native';

interface ProgressLoadingScreenProps {
  /**
   * Current step in the authentication process
   */
  step: 'generating' | 'creating' | 'authenticating' | 'verifying';

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Optional subtitle for additional context
   */
  subtitle?: string;
}

/**
 * Get display text for each step
 */
const getStepInfo = (step: ProgressLoadingScreenProps['step']) => {
  switch (step) {
    case 'generating':
      return {
        icon: '🔐',
        title: 'Generating Encryption Keys',
        description: 'Creating your secure cryptographic identity...',
      };
    case 'creating':
      return {
        icon: '✨',
        title: 'Creating Encrypted Account',
        description: 'Securing your account with hardware-backed encryption...',
      };
    case 'authenticating':
      return {
        icon: '🔓',
        title: 'Authenticating Token',
        description: 'Verifying your cryptographic signature...',
      };
    case 'verifying':
      return {
        icon: '🛡️',
        title: 'Verifying Credentials',
        description: 'Checking username and password...',
      };
  }
};

export const ProgressLoadingScreen: React.FC<ProgressLoadingScreenProps> = ({
  step,
  progress,
  subtitle,
}) => {
  const stepInfo = getStepInfo(step);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <Text style={styles.icon}>{stepInfo.icon}</Text>

        {/* Title */}
        <Text style={styles.title}>{stepInfo.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{stepInfo.description}</Text>

        {/* Subtitle (optional) */}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Progress Bar Container */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progress, 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Activity Indicator */}
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />

        {/* Technical Details */}
        <View style={styles.technicalDetails}>
          <Text style={styles.technicalText}>🔒 P-256 ECDSA Cryptography</Text>
          <Text style={styles.technicalText}>🔐 Hardware-Backed Security</Text>
          <Text style={styles.technicalText}>⚡ Zero-Knowledge Proof</Text>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  spinner: {
    marginBottom: 32,
  },
  technicalDetails: {
    alignItems: 'center',
    gap: 8,
  },
  technicalText: {
    fontSize: 12,
    color: '#999',
  },
});
