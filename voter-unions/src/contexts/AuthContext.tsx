import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [session, setSessionState] = useState<any | null>(null);
  const [isLoading, setIsLoadingState] = useState(true);

  const setUser = useCallback((user: User | null) => {
    setUserState(user);
  }, []);

  const setSession = useCallback((session: any | null) => {
    setSessionState(session);
  }, []);

  const setIsLoading = useCallback((isLoading: boolean) => {
    setIsLoadingState(isLoading);
  }, []);

  const clearAuth = useCallback(() => {
    setUserState(null);
    setSessionState(null);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    session,
    isLoading,
    setUser,
    setSession,
    setIsLoading,
    clearAuth,
  }), [user, session, isLoading, setUser, setSession, setIsLoading, clearAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthStore = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthStore must be used within an AuthProvider');
  }
  return context;
};
