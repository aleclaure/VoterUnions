import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useEmailVerificationGuard } from '../../hooks/useEmailVerificationGuard';
import { WorkerProposal } from '../../types';

export default function WorkerProposalsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { guardAction } = useEmailVerificationGuard();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    employer_name: '',
    industry: '',
    location: '',
    workplace_size: '',
    demands: '',
    background: '',
    worker_testimonies: '',
  });

  const { data: proposals = [], isLoading } = useQuery<WorkerProposal[]>({
    queryKey: ['worker-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_proposals')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createProposal = useMutation({
    mutationFn: async (proposal: typeof formData) => {
      // Email verification guard
      const allowed = await guardAction('CREATE_STRIKE');
      if (!allowed) throw new Error('Email verification required');
      
      const testimoniesArray = proposal.worker_testimonies
        ? proposal.worker_testimonies.split('\n').filter(t => t.trim())
        : [];

      const { data, error } = await supabase
        .from('worker_proposals')
        .insert([{
          ...proposal,
          worker_testimonies: testimoniesArray.length > 0 ? testimoniesArray : null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-proposals'] });
      setFormData({
        title: '',
        employer_name: '',
        industry: '',
        location: '',
        workplace_size: '',
        demands: '',
        background: '',
        worker_testimonies: '',
      });
      setShowForm(false);
      Alert.alert('Success', 'Worker proposal created! Others can now endorse and organize.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create proposal');
    },
  });

  const submitToVoting = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from('worker_proposals')
        .update({ status: 'voting' })
        .eq('id', proposalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-proposals'] });
      Alert.alert('Success', 'Proposal moved to Organize & Vote! Workers can now vote on action.');
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.employer_name.trim() || !formData.demands.trim()) {
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Worker Proposals</Text>
          <Text style={styles.headerSubtitle}>No one fights alone.</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowForm(!showForm)}>
            <Text style={styles.createButtonText}>{showForm ? '✕ Cancel' : '+ New Proposal'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Submit Worker Proposal</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="e.g., Demand Living Wage at Amazon FC"
            />

            <Text style={styles.label}>Employer/Company *</Text>
            <TextInput
              style={styles.input}
              value={formData.employer_name}
              onChangeText={(text) => setFormData({ ...formData, employer_name: text })}
              placeholder="e.g., Amazon, Walmart, Google"
            />

            <Text style={styles.label}>Industry *</Text>
            <TextInput
              style={styles.input}
              value={formData.industry}
              onChangeText={(text) => setFormData({ ...formData, industry: text })}
              placeholder="e.g., Retail, Tech, Healthcare"
            />

            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="e.g., Seattle, WA or National"
            />

            <Text style={styles.label}>Workplace Size</Text>
            <TextInput
              style={styles.input}
              value={formData.workplace_size}
              onChangeText={(text) => setFormData({ ...formData, workplace_size: text })}
              placeholder="e.g., 500+ workers"
            />

            <Text style={styles.label}>Demands *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.demands}
              onChangeText={(text) => setFormData({ ...formData, demands: text })}
              placeholder="List your demands: fair pay, safe conditions, union recognition..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Background/Context</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.background}
              onChangeText={(text) => setFormData({ ...formData, background: text })}
              placeholder="Describe the current situation..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Worker Testimonies (one per line, optional anonymity)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.worker_testimonies}
              onChangeText={(text) => setFormData({ ...formData, worker_testimonies: text })}
              placeholder="Share worker stories (one per line)..."
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Proposal</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.proposalsList}>
          {proposals.map((proposal) => (
            <View key={proposal.id} style={styles.proposalCard}>
              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={styles.proposalMeta}>
                {proposal.employer_name} · {proposal.industry} · {proposal.location}
              </Text>
              <Text style={styles.proposalDemands} numberOfLines={2}>{proposal.demands}</Text>
              
              <View style={styles.voteStats}>
                <Text style={styles.voteStat}>
                  {proposal.vote_count} votes · {proposal.activation_percentage.toFixed(0)}% for strike
                </Text>
              </View>

              {user?.id === proposal.created_by && proposal.status === 'open' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => submitToVoting.mutate(proposal.id)}
                >
                  <Text style={styles.actionButtonText}>Move to Voting →</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.status}>Status: {proposal.status}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6b7280' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  createButton: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  textArea: { height: 80 },
  submitButton: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  proposalsList: { padding: 16 },
  proposalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  proposalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  proposalMeta: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  proposalDemands: { fontSize: 14, color: '#374151', marginBottom: 12 },
  voteStats: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  voteStat: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  actionButton: { backgroundColor: '#10b981', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  status: { fontSize: 12, color: '#6b7280', marginTop: 8, textTransform: 'capitalize' },
});
