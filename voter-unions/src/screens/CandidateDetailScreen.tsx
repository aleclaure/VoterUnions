import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';

export const CandidateDetailScreen = ({ route, navigation }: any) => {
  const { candidateId } = route.params;
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: userUnions } = useQuery({
    queryKey: ['user-unions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('union_members')
        .select('union_id, unions(name)')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const pledgeMutation = useMutation({
    mutationFn: async (data: { unionId: string; pledgeType: 'support' | 'oppose' }) => {
      const { error } = await supabase
        .from('pledges')
        .upsert({
          union_id: data.unionId,
          user_id: user?.id,
          candidate_id: candidateId,
          pledge_type: data.pledgeType,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] });
      Alert.alert('Success', 'Pledge recorded!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handlePledge = (pledgeType: 'support' | 'oppose') => {
    if (!userUnions || userUnions.length === 0) {
      Alert.alert('Error', 'You must be a member of a union to pledge');
      return;
    }

    if (userUnions.length === 1) {
      pledgeMutation.mutate({ unionId: userUnions[0].union_id, pledgeType });
    } else {
      Alert.alert(
        'Select Union',
        'Choose which union to pledge with',
        userUnions.map((u: any) => ({
          text: u.unions.name,
          onPress: () => pledgeMutation.mutate({ unionId: u.union_id, pledgeType }),
        }))
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Candidate not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{candidate.name}</Text>
        <Text style={styles.position}>{candidate.position}</Text>
        <Text style={styles.description}>{candidate.description}</Text>

        <View style={styles.pledgeButtons}>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => handlePledge('support')}
            disabled={pledgeMutation.isPending}
          >
            <Text style={styles.supportText}>
              {pledgeMutation.isPending ? 'Pledging...' : 'Pledge Support'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.opposeButton}
            onPress={() => handlePledge('oppose')}
            disabled={pledgeMutation.isPending}
          >
            <Text style={styles.opposeText}>
              {pledgeMutation.isPending ? 'Pledging...' : 'Pledge Oppose'}
            </Text>
          </TouchableOpacity>
        </View>
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
  backText: {
    fontSize: 16,
    color: '#2563eb',
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  position: {
    fontSize: 18,
    color: '#2563eb',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 24,
  },
  pledgeButtons: {
    gap: 12,
  },
  supportButton: {
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  supportText: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '600',
  },
  opposeButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  opposeText: {
    color: '#dc2626',
    fontSize: 16,
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
