import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useProfile, useUserProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useQuery } from '@tanstack/react-query';

interface ProfileScreenProps {
  route?: {
    params?: {
      userId?: string;
    };
  };
}

export const ProfileScreen = ({ route }: ProfileScreenProps) => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const userId = route?.params?.userId || user?.id;
  const isOwnProfile = userId === user?.id;

  // Use appropriate hook based on whether it's own profile or another user's
  const { profile: ownProfile } = useProfile();
  const { profile: otherProfile, isLoading: otherLoading } = useUserProfile(
    isOwnProfile ? null : userId
  );

  const profile = isOwnProfile ? ownProfile : otherProfile;
  const isLoading = isOwnProfile ? false : otherLoading;

  // Fetch user statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const [debatesResult, argumentsResult, unionsResult] = await Promise.all([
        supabase
          .from('debates')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId),
        supabase
          .from('arguments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('union_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      return {
        debatesCreated: debatesResult.count || 0,
        argumentsPosted: argumentsResult.count || 0,
        unionsJoined: unionsResult.count || 0,
      };
    },
    enabled: !!userId,
  });

  const handleEditProfile = () => {
    navigation.navigate('EditProfile' as never);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading || statsLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.errorText}>Profile not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        {isOwnProfile && (
          <TouchableOpacity onPress={handleEditProfile}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile.display_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>@{profile.display_name}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.debatesCreated || 0}</Text>
              <Text style={styles.statLabel}>Debates Created</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.argumentsPosted || 0}</Text>
              <Text style={styles.statLabel}>Arguments Posted</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.unionsJoined || 0}</Text>
              <Text style={styles.statLabel}>Unions Joined</Text>
            </View>
          </View>
        </View>

        {/* Account Info */}
        {isOwnProfile && (
          <View style={styles.accountSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Sign Out Button */}
        {isOwnProfile && (
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  statsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  accountSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  signOutButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 100,
  },
});
