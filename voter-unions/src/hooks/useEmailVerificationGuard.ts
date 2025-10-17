import { useState, useEffect, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import { useAuth } from './useAuth';
import { 
  checkEmailVerification, 
  canPerformAction, 
  PROTECTED_ACTIONS,
  resendVerificationEmail,
  refreshVerificationStatus
} from '../services/emailVerification';

/**
 * Hook to guard protected actions with email verification
 * Returns verification status and guard function
 */
export const useEmailVerificationGuard = () => {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // Reusable verification check function
  const checkVerification = useCallback(async () => {
    const status = await checkEmailVerification(user);
    setIsVerified(status.isVerified);
    return status.isVerified;
  }, [user]);

  // Check verification on mount and when user changes
  useEffect(() => {
    checkVerification();
  }, [checkVerification]);

  // Recheck verification when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh session and get fresh user
        const refreshResult = await refreshVerificationStatus();
        // Update local verification state with fresh result
        setIsVerified(refreshResult.isVerified);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Guard function - call before protected actions
   * Shows alert if not verified, returns true if action allowed
   */
  const guardAction = async (
    action: keyof typeof PROTECTED_ACTIONS
  ): Promise<boolean> => {
    setIsChecking(true);
    
    // First check local refreshed state (more up-to-date than context user)
    if (isVerified) {
      setIsChecking(false);
      return true;
    }
    
    // Fallback to checking context user (for initial load)
    const result = await canPerformAction(user, action);
    setIsChecking(false);

    if (!result.allowed) {
      Alert.alert(
        'Email Verification Required',
        result.message || 'Please verify your email to perform this action.',
        [
          {
            text: 'Resend Email',
            onPress: async () => {
              if (user?.email) {
                const resendResult = await resendVerificationEmail(user.email);
                if (resendResult.success) {
                  Alert.alert(
                    'Verification Email Sent',
                    'Please check your inbox and click the verification link. After verifying, return to the app and try again.',
                    [
                      {
                        text: 'OK',
                        onPress: async () => {
                          // Refresh session and get fresh verification status
                          const refreshResult = await refreshVerificationStatus();
                          // Update local state with fresh result
                          setIsVerified(refreshResult.isVerified);
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert('Error', resendResult.error || 'Failed to send email');
                }
              }
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return false;
    }

    return true;
  };

  return {
    isVerified,
    isChecking,
    guardAction,
  };
};
