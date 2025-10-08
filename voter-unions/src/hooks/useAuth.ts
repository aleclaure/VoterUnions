import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';

export const useAuth = () => {
  const { user, session, isLoading, setUser, setSession, setIsLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Auto-fix: Populate username_normalized if missing
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username_normalized, display_name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.display_name && !profile?.username_normalized) {
          console.log('Auto-fixing username_normalized for user:', profile.display_name);
          await supabase
            .from('profiles')
            .update({ username_normalized: profile.display_name.toLowerCase() })
            .eq('id', session.user.id);
        }
      }
      
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Auto-fix: Populate username_normalized if missing
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username_normalized, display_name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.display_name && !profile?.username_normalized) {
          console.log('Auto-fixing username_normalized for user:', profile.display_name);
          await supabase
            .from('profiles')
            .update({ username_normalized: profile.display_name.toLowerCase() })
            .eq('id', session.user.id);
        }
      }
      
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
