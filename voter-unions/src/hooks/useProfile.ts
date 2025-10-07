import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { Profile } from '../types';

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const updateProfile = async (updates: Partial<Profile>) => {
    return updateProfileMutation.mutateAsync(updates);
  };

  const needsOnboarding = !profile?.display_name;

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    needsOnboarding,
    isUpdating: updateProfileMutation.isPending,
  };
};

// Hook to fetch any user's profile by ID
export const useUserProfile = (userId: string | null | undefined) => {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, return null instead of throwing
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile,
    isLoading,
    error,
  };
};

// Hook to fetch multiple profiles at once (for lists)
export const useProfiles = (userIds: string[]) => {
  const {
    data: profiles,
    isLoading,
    error,
  } = useQuery<Record<string, Profile>>({
    queryKey: ['profiles', userIds.sort().join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return {};

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error) throw error;

      // Convert array to map for easy lookup
      const profilesMap: Record<string, Profile> = {};
      data.forEach((profile) => {
        profilesMap[profile.id] = profile as Profile;
      });

      return profilesMap;
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profiles: profiles || {},
    isLoading,
    error,
  };
};
