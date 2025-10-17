import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useDeviceId } from '../../hooks/useDeviceId';
import { useEmailVerificationGuard } from '../../hooks/useEmailVerificationGuard';
import { Policy, PolicyVote } from '../../types';
import { stripHtml } from '../../lib/inputSanitization';

export const PrioritiesTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { deviceId } = useDeviceId();
  const { guardAction } = useEmailVerificationGuard();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPolicyTitle, setNewPolicyTitle] = useState('');
  const [newPolicyDescription, setNewPolicyDescription] = useState('');
  const [newPolicyIssueArea, setNewPolicyIssueArea] = useState('');

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .is('deleted_at', null)
        .order('vote_count', { ascending: false });

      if (error) throw error;
      return data as Policy[];
    },
  });

  const { data: userVotes } = useQuery({
    queryKey: ['policy-votes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('policy_votes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as PolicyVote[];
    },
    enabled: !!user,
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (policy: { title: string; description: string; issue_area: string }) => {
      // Sanitize inputs to prevent XSS attacks
      const sanitizedPolicy = {
        title: stripHtml(policy.title),
        description: stripHtml(policy.description),
        issue_area: stripHtml(policy.issue_area),
      };
      
      const { data, error } = await supabase
        .from('policies')
        .insert([
          {
            title: sanitizedPolicy.title,
            description: sanitizedPolicy.description,
            issue_area: sanitizedPolicy.issue_area,
            created_by: user?.id,
            vote_count: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      setShowCreateModal(false);
      setNewPolicyTitle('');
      setNewPolicyDescription('');
      setNewPolicyIssueArea('');
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({
      policyId,
      voteType,
    }: {
      policyId: string;
      voteType: 'upvote' | 'downvote';
    }) => {
      // Email verification guard
      const allowed = await guardAction('VOTE');
      if (!allowed) throw new Error('Email verification required');
      
      const existingVote = userVotes?.find((v) => v.policy_id === policyId);

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from('policy_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('policy_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
        }
      } else {
        if (!deviceId) {
          throw new Error('Device verification in progress. Please wait and try again.');
        }
        
        const { error } = await supabase.from('policy_votes').insert([
          {
            policy_id: policyId,
            user_id: user?.id,
            vote_type: voteType,
            device_id: deviceId,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy-votes'] });
    },
  });

  const getUserVote = (policyId: string) => {
    return userVotes?.find((v) => v.policy_id === policyId);
  };

  const handleCreatePolicy = () => {
    if (!newPolicyTitle.trim() || !newPolicyDescription.trim() || !newPolicyIssueArea.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    createPolicyMutation.mutate({
      title: newPolicyTitle,
      description: newPolicyDescription,
      issue_area: newPolicyIssueArea,
    });
  };

  const renderPolicy = ({ item }: { item: Policy }) => {
    const userVote = getUserVote(item.id);

    return (
      <View style={styles.policyCard}>
        <View style={styles.policyHeader}>
          <Text style={styles.issueArea}>{item.issue_area}</Text>
          <Text style={styles.voteCount}>{item.vote_count || 0} votes</Text>
        </View>
        <Text style={styles.policyTitle}>{item.title}</Text>
        <Text style={styles.policyDescription}>{item.description}</Text>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              userVote?.vote_type === 'upvote' && styles.upvoteActive,
            ]}
            onPress={() => voteMutation.mutate({ policyId: item.id, voteType: 'upvote' })}
          >
            <Text
              style={[
                styles.voteButtonText,
                userVote?.vote_type === 'upvote' && styles.voteButtonTextActive,
              ]}
            >
              👍 Upvote
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.voteButton,
              userVote?.vote_type === 'downvote' && styles.downvoteActive,
            ]}
            onPress={() => voteMutation.mutate({ policyId: item.id, voteType: 'downvote' })}
          >
            <Text
              style={[
                styles.voteButtonText,
                userVote?.vote_type === 'downvote' && styles.voteButtonTextActive,
              ]}
            >
              👎 Downvote
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Policy Priorities</Text>
        <Text style={styles.headerSubtitle}>Vote on what matters most</Text>
      </View>

      <FlatList
        data={policies}
        renderItem={renderPolicy}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No policies yet. Be the first to propose one!</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Propose Policy Priority</Text>

            <TextInput
              style={styles.input}
              placeholder="Issue Area (e.g., Healthcare, Housing)"
              value={newPolicyIssueArea}
              onChangeText={setNewPolicyIssueArea}
            />

            <TextInput
              style={styles.input}
              placeholder="Policy Title"
              value={newPolicyTitle}
              onChangeText={setNewPolicyTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newPolicyDescription}
              onChangeText={setNewPolicyDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreatePolicy}
                disabled={createPolicyMutation.isPending}
              >
                {createPolicyMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Propose</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  policyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueArea: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  voteCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  policyDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  upvoteActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  downvoteActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  voteButtonTextActive: {
    color: '#ffffff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#2563eb',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
