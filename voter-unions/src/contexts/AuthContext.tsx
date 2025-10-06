import React, { createContext, useState, useContext, ReactNode } from 'react';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = () => {
    setUser(null);
    setSession(null);
    setIsLoading(false);
  };

  const value: AuthState = {
    user,
    session,
    isLoading,
    setUser,
    setSession,
    setIsLoading,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthStore = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthStore must be used within an AuthProvider');
  }
  return context;
};
