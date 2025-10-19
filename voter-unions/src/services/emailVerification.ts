import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { CONFIG } from '../config';

/**
 * Email Verification Service
 * Enforces email verification for protected actions
 * 
 * Feature Flag: CONFIG.REQUIRE_EMAIL_VERIFICATION
 * - When true: Email verification is enforced (production default)
 * - When false: Email verification is disabled (development/migration mode)
 */

export interface VerificationStatus {
  isVerified: boolean;
  needsVerification: boolean;
  message?: string;
}

/**
 * Check if user's email is verified
 * 
 * Feature Flag Check:
 * If REQUIRE_EMAIL_VERIFICATION is false, this always returns isVerified: true
 * This allows disabling email verification during development/migration.
 */
export const checkEmailVerification = async (user: User | null): Promise<VerificationStatus> => {
  if (!user) {
    return {
      isVerified: false,
      needsVerification: false,
      message: 'User not authenticated',
    };
  }

  // 🎛️ FEATURE FLAG: Check if email verification is required
  if (!CONFIG.REQUIRE_EMAIL_VERIFICATION) {
    // Email verification disabled (development/migration mode)
    return {
      isVerified: true,
      needsVerification: false,
      message: 'Email verification disabled by feature flag',
    };
  }

  // Check Supabase auth email verification status
  const isVerified = user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;

  if (!isVerified) {
    return {
      isVerified: false,
      needsVerification: true,
      message: 'Please verify your email address to perform this action. Check your inbox for the verification link.',
    };
  }

  return {
    isVerified: true,
    needsVerification: false,
  };
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to resend verification email',
    };
  }
};

/**
 * Refresh user session to get latest verification status
 * Call this after user verifies their email
 */
export const refreshVerificationStatus = async (): Promise<{ success: boolean; isVerified: boolean }> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Failed to refresh session:', error);
      return { success: false, isVerified: false };
    }

    const isVerified = data?.user?.email_confirmed_at !== null && data?.user?.email_confirmed_at !== undefined;
    
    return {
      success: true,
      isVerified,
    };
  } catch (error: any) {
    console.error('Error refreshing verification status:', error);
    return { success: false, isVerified: false };
  }
};

/**
 * Actions that require email verification
 */
export const PROTECTED_ACTIONS = {
  CREATE_POST: 'create post',
  CREATE_COMMENT: 'create comment',
  CREATE_CHANNEL: 'create channel',
  CREATE_DEBATE: 'create debate',
  CREATE_ARGUMENT: 'create argument',
  VOTE: 'vote',
  CREATE_UNION: 'create union',
  CREATE_BOYCOTT: 'create boycott proposal',
  CREATE_STRIKE: 'create strike proposal',
  UPDATE_PROFILE: 'update profile',
  CREATE_POWER_PLEDGE: 'create power pledge',
} as const;

/**
 * Guard function for protected actions
 * Returns true if action is allowed, false otherwise
 */
export const canPerformAction = async (
  user: User | null,
  action: keyof typeof PROTECTED_ACTIONS
): Promise<{ allowed: boolean; message?: string }> => {
  const verification = await checkEmailVerification(user);

  if (!verification.isVerified) {
    return {
      allowed: false,
      message: verification.message || `Email verification required to ${PROTECTED_ACTIONS[action]}`,
    };
  }

  return {
    allowed: true,
  };
};

/**
 * Hook to check verification status and show UI prompts
 */
export const getVerificationPrompt = (verification: VerificationStatus): {
  show: boolean;
  title: string;
  message: string;
  action: string;
} | null => {
  if (!verification.needsVerification) {
    return null;
  }

  return {
    show: true,
    title: 'Email Verification Required',
    message: verification.message || 'Please verify your email to continue',
    action: 'Resend Verification Email',
  };
};
