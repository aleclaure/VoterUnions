import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

/**
 * Hook for hard deleting user account (GDPR Right to Erasure - Article 17)
 * 
 * Client-side deletion removes:
 * - All user-generated content (posts, comments, votes, etc.)
 * - Profile and union memberships
 * - Bookmarks and reactions
 * - Anonymizes audit logs
 * 
 * LIMITATION: Cannot delete auth.users from client code
 * - Email and hashed password remain in auth.users table
 * - Requires backend Edge Function with service-role key for full compliance
 * - Production deployments MUST implement privileged auth.users deletion
 * 
 * The account becomes unusable immediately (no profile),
 * but PII in auth.users persists until backend cleanup.
 */
export const useDeleteAccount = () => {
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = async (): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    setIsDeleting(true);
    try {
      // Call the database function to cascade delete all user data
      const { error: functionError } = await supabase.rpc('hard_delete_account', {
        user_uuid: user.id,
      });

      if (functionError) {
        throw new Error(`Failed to delete account: ${functionError.message}`);
      }

      // Note: Deleting from auth.users requires admin privileges (server-side)
      // For MVP, we delete all profile/content data, which makes the auth account unusable
      // In production, you would call a Supabase Edge Function to handle auth deletion
      // For now, the account is effectively deleted (no profile, no content)

      // Sign out the user immediately
      await signOut();
    } catch (error: any) {
      console.error('Account deletion error:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteAccount,
    isDeleting,
  };
};
