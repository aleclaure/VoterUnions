import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { 
  checkEmailVerification, 
  canPerformAction, 
  PROTECTED_ACTIONS,
  resendVerificationEmail 
} from '../services/emailVerification';

/**
 * Hook to guard protected actions with email verification
 * Returns verification status and guard function
 */
export const useEmailVerificationGuard = () => {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      const status = await checkEmailVerification(user);
      setIsVerified(status.isVerified);
    };

    checkVerification();
  }, [user]);

  /**
   * Guard function - call before protected actions
   * Shows alert if not verified, returns true if action allowed
   */
  const guardAction = async (
    action: keyof typeof PROTECTED_ACTIONS
  ): Promise<boolean> => {
    setIsChecking(true);
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
                    'Please check your inbox for the verification link.'
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
