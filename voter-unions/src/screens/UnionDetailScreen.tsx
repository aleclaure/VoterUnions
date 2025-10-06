import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { Union } from '../types';

export const UnionDetailScreen = ({ route, navigation }: any) => {
  const { unionId } = route.params;
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: union, isLoading } = useQuery({
    queryKey: ['union', unionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unions')
        .select('*')
        .eq('id', unionId)
        .single();
      if (error) throw error;
      return data as Union;
    },
  });

  const { data: membership } = useQuery({
    queryKey: ['membership', unionId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('union_members')
        .select('*')
        .eq('union_id', unionId)
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('union_members')
        .insert({
          union_id: unionId,
          user_id: user?.id,
          role: 'member',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership', unionId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['union', unionId] });
      Alert.alert('Success', 'You have joined the union!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading union...</Text>
      </View>
    );
  }

  if (!union) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Union not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{union.name}</Text>
        <Text style={styles.description}>{union.description}</Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>{union.member_count} members</Text>
          <Text style={styles.metaText}>{union.is_public ? 'Public' : 'Private'}</Text>
        </View>

        {!membership && union.is_public && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
          >
            <Text style={styles.joinButtonText}>
              {joinMutation.isPending ? 'Joining...' : 'Join Union'}
            </Text>
          </TouchableOpacity>
        )}

        {membership && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Member • {membership.role}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 20,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  metaText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  joinButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberBadge: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  memberBadgeText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748b',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#dc2626',
  },
});
