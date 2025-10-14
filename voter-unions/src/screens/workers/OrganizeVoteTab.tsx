import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { WorkerProposal, WorkerVote } from '../../types';

export default function OrganizeVoteTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery<WorkerProposal[]>({
    queryKey: ['worker-proposals-voting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_proposals')
        .select('*')
        .in('status', ['open', 'voting'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: myVotes = [] } = useQuery<WorkerVote[]>({
    queryKey: ['my-worker-votes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('worker_votes')
        .select('*')
        .eq('voter_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const castVote = useMutation({
    mutationFn: async ({ proposalId, voteType }: { proposalId: string; voteType: 'strike_planning' | 'file_petition' | 'negotiate_first' }) => {
      const { data, error } = await supabase
        .from('worker_votes')
        .upsert({
          proposal_id: proposalId,
          voter_id: user?.id,
          vote_type: voteType,
        }, {
          onConflict: 'proposal_id,voter_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-proposals-voting'] });
      queryClient.invalidateQueries({ queryKey: ['my-worker-votes'] });
      Alert.alert('Success', 'Your vote has been recorded!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to cast vote');
    },
  });

  const launchStrike = useMutation({
    mutationFn: async (proposal: WorkerProposal) => {
      if (proposal.activation_percentage < 60) {
        throw new Error('Strike requires 60% of workers voting for strike planning');
      }

      const { data, error } = await supabase
        .from('active_strikes')
        .insert([{
          proposal_id: proposal.id,
          created_by: user?.id,
          strike_location: proposal.location,
          company_name: proposal.employer_name,
          current_demands: proposal.demands,
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('worker_proposals')
        .update({ status: 'activated' })
        .eq('id', proposal.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-proposals-voting'] });
      Alert.alert('Success', 'Strike launched! Check Active Strikes tab to coordinate.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to launch strike');
    },
  });

  const getUserVote = (proposalId: string) => {
    return myVotes.find(v => v.proposal_id === proposalId);
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
        <View style={styles.proposalsList}>
          {proposals.map((proposal) => {
            const userVote = getUserVote(proposal.id);
            const canLaunch = proposal.activation_percentage >= 60 && user?.id === proposal.created_by;

            return (
              <View key={proposal.id} style={styles.proposalCard}>
                <Text style={styles.proposalTitle}>{proposal.title}</Text>
                <Text style={styles.proposalMeta}>
                  {proposal.employer_name} · {proposal.industry} · {proposal.location}
                </Text>
                <Text style={styles.proposalDemands} numberOfLines={2}>{proposal.demands}</Text>

                <View style={styles.voteStats}>
                  <Text style={styles.voteLabel}>Vote Results ({proposal.vote_count} total):</Text>
                  <View style={styles.voteRow}>
                    <Text style={styles.voteOption}>
                      ✊ Strike Planning: {proposal.votes_strike_planning} ({proposal.activation_percentage.toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.voteRow}>
                    <Text style={styles.voteOption}>
                      📝 File Petition: {proposal.votes_file_petition}
                    </Text>
                  </View>
                  <View style={styles.voteRow}>
                    <Text style={styles.voteOption}>
                      🤝 Negotiate First: {proposal.votes_negotiate_first}
                    </Text>
                  </View>
                </View>

                {userVote && (
                  <Text style={styles.myVote}>
                    Your vote: {userVote.vote_type.replace('_', ' ')}
                  </Text>
                )}

                {!userVote && (
                  <View style={styles.voteButtons}>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.strikeButton]}
                      onPress={() => castVote.mutate({ proposalId: proposal.id, voteType: 'strike_planning' })}
                    >
                      <Text style={styles.voteButtonText}>✊ Strike</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.petitionButton]}
                      onPress={() => castVote.mutate({ proposalId: proposal.id, voteType: 'file_petition' })}
                    >
                      <Text style={styles.voteButtonText}>📝 Petition</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.negotiateButton]}
                      onPress={() => castVote.mutate({ proposalId: proposal.id, voteType: 'negotiate_first' })}
                    >
                      <Text style={styles.voteButtonText}>🤝 Negotiate</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {canLaunch && (
                  <TouchableOpacity
                    style={styles.launchButton}
                    onPress={() => launchStrike.mutate(proposal)}
                  >
                    <Text style={styles.launchButtonText}>🚨 Launch Strike (60% Reached!)</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
  proposalsList: { padding: 16 },
  proposalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  proposalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  proposalMeta: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  proposalDemands: { fontSize: 14, color: '#374151', marginBottom: 12 },
  voteStats: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  voteLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  voteRow: { marginBottom: 4 },
  voteOption: { fontSize: 14, color: '#6b7280' },
  myVote: { fontSize: 14, color: '#10b981', fontWeight: '600', marginTop: 12, textTransform: 'capitalize' },
  voteButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  voteButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  strikeButton: { backgroundColor: '#dc2626' },
  petitionButton: { backgroundColor: '#2563eb' },
  negotiateButton: { backgroundColor: '#10b981' },
  voteButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  launchButton: { backgroundColor: '#dc2626', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  launchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
