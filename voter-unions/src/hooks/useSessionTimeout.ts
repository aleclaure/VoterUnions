import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../contexts/AuthContext';
import { useAuth } from './useAuth';
import { auditHelpers } from '../services/auditLog';
import { useDeviceId } from './useDeviceId';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000; // Warn 5 minutes before timeout

export const useSessionTimeout = () => {
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const { deviceId } = useDeviceId();
  const navigation = useNavigation();
  const timeoutRef = useRef<number | undefined>(undefined);
  const warningTimeoutRef = useRef<number | undefined>(undefined);

  const warningShownRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const resetTimer = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timer (5 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        Alert.alert(
          'Session Expiring Soon',
          'Your session will expire in 5 minutes due to inactivity. Please interact with the app to stay logged in.',
          [{ text: 'OK', onPress: () => resetTimer() }]
        );
      }
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(async () => {
      console.log('🔒 Session expired due to inactivity');
      
      // Log audit event
      if ((user.email || user.username) && deviceId) {
        await auditHelpers.sessionExpired(user.id, user.email || user.username!, deviceId);
      }
      
      // Sign out user
      await signOut();
    }, SESSION_TIMEOUT_MS);
  }, [user, signOut, deviceId]);

  // Track navigation as user activity
  useEffect(() => {
    if (!user) return;

    const unsubscribe = navigation.addListener('state', () => {
      // User navigated - reset timer
      resetTimer();
    });

    return unsubscribe;
  }, [navigation, user, resetTimer]);

  useEffect(() => {
    if (!user) return;

    // Start timer on mount
    resetTimer();

    // Handle app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        
        if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
          // Session expired while in background
          console.log('🔒 Session expired while app was in background');

          if ((user.email || user.username) && deviceId) {
            await auditHelpers.sessionExpired(user.id, user.email || user.username!, deviceId);
          }
          
          await signOut();
        } else {
          // Session still valid, reset timer
          resetTimer();
        }
      }
      
      appStateRef.current = nextAppState;
    });

    // Cleanup
    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, resetTimer, signOut, deviceId]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
};
