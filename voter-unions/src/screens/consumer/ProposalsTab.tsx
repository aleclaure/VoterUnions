import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BoycottProposal, BoycottComment } from '../../types';

export default function ProposalsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    target_company: '',
    target_industry: '',
    demand_summary: '',
    evidence: '',
    proposed_alternatives: '',
  });

  // Fetch proposals
  const { data: proposals = [], isLoading } = useQuery<BoycottProposal[]>({
    queryKey: ['boycott-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boycott_proposals')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Create proposal mutation
  const createProposal = useMutation({
    mutationFn: async (proposal: typeof formData) => {
      const { data, error } = await supabase
        .from('boycott_proposals')
        .insert([{
          ...proposal,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boycott-proposals'] });
      setFormData({
        title: '',
        target_company: '',
        target_industry: '',
        demand_summary: '',
        evidence: '',
        proposed_alternatives: '',
      });
      setShowForm(false);
      Alert.alert('Success', 'Boycott proposal created! Community can now discuss and refine it.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create proposal');
    },
  });

  // Submit to voting
  const submitToVoting = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from('boycott_proposals')
        .update({ status: 'in_voting' })
        .eq('id', proposalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boycott-proposals'] });
      Alert.alert('Success', 'Proposal submitted to Vote & Launch! Community can now vote to activate.');
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.target_company.trim() || !formData.demand_summary.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    createProposal.mutate(formData);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading proposals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Consumer Proposals</Text>
          <Text style={styles.headerSubtitle}>Every purchase is a political act.</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Text style={styles.createButtonText}>
              {showForm ? '✕ Cancel' : '+ New Proposal'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Submit Boycott Proposal</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="e.g., Boycott FastFashion Inc."
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Target Company *</Text>
            <TextInput
              style={styles.input}
              value={formData.target_company}
              onChangeText={(text) => setFormData({ ...formData, target_company: text })}
              placeholder="e.g., FastFashion Inc."
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Industry (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.target_industry}
              onChangeText={(text) => setFormData({ ...formData, target_industry: text })}
              placeholder="e.g., Fast Fashion, Tech, Energy"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Demand Summary *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.demand_summary}
              onChangeText={(text) => setFormData({ ...formData, demand_summary: text })}
              placeholder="What do we demand from this company?"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Evidence (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.evidence}
              onChangeText={(text) => setFormData({ ...formData, evidence: text })}
              placeholder="Links or sources documenting exploitative behavior"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Proposed Alternatives (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.proposed_alternatives}
              onChangeText={(text) => setFormData({ ...formData, proposed_alternatives: text })}
              placeholder="Suggest ethical alternatives (local co-ops, worker-owned, etc.)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={createProposal.isPending}
            >
              <Text style={styles.submitButtonText}>
                {createProposal.isPending ? 'Creating...' : 'Submit Proposal'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Proposals List */}
        <View style={styles.proposalsSection}>
          <Text style={styles.sectionTitle}>
            {proposals.length} {proposals.length === 1 ? 'Proposal' : 'Proposals'}
          </Text>

          {proposals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No proposals yet</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to propose a boycott campaign</Text>
            </View>
          ) : (
            proposals.map((proposal) => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {proposal.status === 'draft' && '📝 Draft'}
                      {proposal.status === 'in_voting' && '🗳️ Voting'}
                      {proposal.status === 'approved' && '✅ Approved'}
                      {proposal.status === 'rejected' && '❌ Rejected'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.proposalTitle}>{proposal.title}</Text>

                <View style={styles.targetSection}>
                  <Text style={styles.targetLabel}>Target:</Text>
                  <Text style={styles.targetText}>{proposal.target_company}</Text>
                  {proposal.target_industry && (
                    <Text style={styles.industryText}>({proposal.target_industry})</Text>
                  )}
                </View>

                <Text style={styles.demandText}>{proposal.demand_summary}</Text>

                {proposal.evidence && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.evidenceLabel}>📎 Evidence:</Text>
                    <Text style={styles.evidenceText}>{proposal.evidence}</Text>
                  </View>
                )}

                {proposal.proposed_alternatives && (
                  <View style={styles.alternativesSection}>
                    <Text style={styles.alternativesLabel}>💡 Alternatives:</Text>
                    <Text style={styles.alternativesText}>{proposal.proposed_alternatives}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                {proposal.status === 'draft' && proposal.created_by === user?.id && (
                  <TouchableOpacity
                    style={styles.submitToVotingButton}
                    onPress={() => submitToVoting.mutate(proposal.id)}
                  >
                    <Text style={styles.submitToVotingButtonText}>
                      Submit to Vote & Launch →
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.proposalFooter}>
                  <Text style={styles.timestampText}>
                    Created {new Date(proposal.created_at).toLocaleDateString()}
                  </Text>
                  <View style={styles.commentCount}>
                    <Text style={styles.commentCountText}>💬 Discuss</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  proposalCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  targetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 6,
  },
  targetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginRight: 6,
  },
  industryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  demandText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  evidenceSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  evidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  evidenceText: {
    fontSize: 12,
    color: '#78350f',
  },
  alternativesSection: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  alternativesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  alternativesText: {
    fontSize: 12,
    color: '#1e3a8a',
  },
  submitToVotingButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitToVotingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  proposalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  timestampText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCountText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
