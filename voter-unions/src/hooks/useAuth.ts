import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { auditHelpers } from '../services/auditLog';
import { useDeviceId } from './useDeviceId';

export const useAuth = () => {
  const { user, session, isLoading, setUser, setSession, setIsLoading, clearAuth } = useAuthStore();
  const { deviceId } = useDeviceId();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setIsLoading]);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });
    return { data, error };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined,
    });
    return { data, error };
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const signInWithOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    return { error };
  };

  const verifyOTP = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { data, error };
  };

  const signOut = async () => {
    // Log logout before signing out
    if (user && deviceId) {
      await auditHelpers.logout(user.id, user.email || '', deviceId);
    }
    
    const { error } = await supabase.auth.signOut();
    if (!error) {
      clearAuth();
    }
    return { error };
  };

  return {
    user,
    session,
    isLoading,
    signUp,
    signInWithPassword,
    resetPassword,
    updatePassword,
    signInWithOTP,
    verifyOTP,
    signOut,
  };
};
