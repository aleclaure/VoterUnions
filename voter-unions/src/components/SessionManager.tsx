import { useEffect } from 'react';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useAuthStore } from '../contexts/AuthContext';

/**
 * SessionManager component that must be rendered inside NavigationContainer
 * Manages session timeout and automatic logout for logged-in users
 */
export const SessionManager = () => {
  const { user } = useAuthStore();
  
  // Only initialize session timeout if user is logged in
  useSessionTimeout();
  
  // This component doesn't render anything
  return null;
};
