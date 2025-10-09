import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BoycottProposal, BoycottVote } from '../../types';

export default function VoteLaunchTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch proposals in voting phase
  const { data: proposals = [], isLoading } = useQuery<BoycottProposal[]>({
    queryKey: ['boycott-proposals-voting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boycott_proposals')
        .select('*')
        .eq('status', 'in_voting')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's votes
  const { data: userVotes = [] } = useQuery<BoycottVote[]>({
    queryKey: ['boycott-votes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('boycott_votes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ proposalId, voteType }: { proposalId: string; voteType: string }) => {
      const { data, error } = await supabase
        .from('boycott_votes')
        .upsert({
          proposal_id: proposalId,
          user_id: user?.id,
          vote_type: voteType,
        }, {
          onConflict: 'proposal_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boycott-proposals-voting'] });
      queryClient.invalidateQueries({ queryKey: ['boycott-votes'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to vote');
    },
  });

  // Launch campaign mutation
  const launchCampaign = useMutation({
    mutationFn: async (proposal: BoycottProposal) => {
      // Verify 60% threshold
      if (proposal.activation_percentage < 60) {
        throw new Error('Campaign requires 60% activation threshold to launch');
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('boycott_campaigns')
        .insert([{
          proposal_id: proposal.id,
          title: proposal.title,
          target_company: proposal.target_company,
          target_industry: proposal.target_industry,
          demands: proposal.demand_summary,
          consumer_actions: proposal.proposed_alternatives,
          status: 'active',
          union_id: proposal.union_id,
          launched_by: user?.id,
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Update proposal status
      const { error: updateError } = await supabase
        .from('boycott_proposals')
        .update({ status: 'approved' })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boycott-proposals-voting'] });
      queryClient.invalidateQueries({ queryKey: ['boycott-campaigns'] });
      Alert.alert('Success', 'Campaign launched! Check Active Boycotts tab to coordinate.');
    },
  });

  const getUserVote = (proposalId: string) => {
    return userVotes.find(v => v.proposal_id === proposalId)?.vote_type;
  };

  const handleVote = (proposalId: string, voteType: string) => {
    voteMutation.mutate({ proposalId, voteType });
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
          <Text style={styles.headerTitle}>Vote & Launch</Text>
          <Text style={styles.headerSubtitle}>Consensus before confrontation.</Text>
        </View>

        {/* Proposals List */}
        <View style={styles.proposalsSection}>
          {proposals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No proposals in voting</Text>
              <Text style={styles.emptyStateSubtext}>Submit a proposal from the Proposals tab</Text>
            </View>
          ) : (
            proposals.map((proposal) => {
              const userVote = getUserVote(proposal.id);
              const activationReady = proposal.activation_percentage >= 60;

              return (
                <View key={proposal.id} style={styles.proposalCard}>
                  <Text style={styles.proposalTitle}>{proposal.title}</Text>

                  <View style={styles.targetSection}>
                    <Text style={styles.targetLabel}>Target:</Text>
                    <Text style={styles.targetText}>{proposal.target_company}</Text>
                  </View>

                  <Text style={styles.demandText}>{proposal.demand_summary}</Text>

                  {/* Vote Progress */}
                  <View style={styles.voteProgress}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Activation Progress</Text>
                      <Text style={[
                        styles.progressPercentage,
                        activationReady && styles.progressPercentageReady
                      ]}>
                        {proposal.activation_percentage.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(proposal.activation_percentage, 100)}%` },
                          activationReady && styles.progressFillReady
                        ]}
                      />
                    </View>
                    <View style={styles.progressThreshold}>
                      <View style={styles.thresholdMarker} />
                      <Text style={styles.thresholdText}>60% threshold</Text>
                    </View>
                  </View>

                  {/* Vote Breakdown */}
                  <View style={styles.voteBreakdown}>
                    <View style={styles.voteItem}>
                      <Text style={styles.voteCount}>{proposal.votes_activate}</Text>
                      <Text style={styles.voteLabel}>Activate</Text>
                    </View>
                    <View style={styles.voteItem}>
                      <Text style={styles.voteCount}>{proposal.votes_delay}</Text>
                      <Text style={styles.voteLabel}>Delay</Text>
                    </View>
                    <View style={styles.voteItem}>
                      <Text style={styles.voteCount}>{proposal.votes_reject}</Text>
                      <Text style={styles.voteLabel}>Reject</Text>
                    </View>
                    <View style={styles.voteItem}>
                      <Text style={styles.voteCount}>{proposal.vote_count}</Text>
                      <Text style={styles.voteLabel}>Total</Text>
                    </View>
                  </View>

                  {/* Voting Buttons */}
                  {!activationReady && (
                    <View style={styles.votingButtons}>
                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          styles.voteActivateButton,
                          userVote === 'activate' && styles.voteButtonSelected
                        ]}
                        onPress={() => handleVote(proposal.id, 'activate')}
                      >
                        <Text style={[
                          styles.voteButtonText,
                          userVote === 'activate' && styles.voteButtonTextSelected
                        ]}>
                          ✅ Activate
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          styles.voteDelayButton,
                          userVote === 'delay' && styles.voteButtonSelected
                        ]}
                        onPress={() => handleVote(proposal.id, 'delay')}
                      >
                        <Text style={[
                          styles.voteButtonText,
                          userVote === 'delay' && styles.voteButtonTextSelected
                        ]}>
                          ⏸️ Delay
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          styles.voteRejectButton,
                          userVote === 'reject' && styles.voteButtonSelected
                        ]}
                        onPress={() => handleVote(proposal.id, 'reject')}
                      >
                        <Text style={[
                          styles.voteButtonText,
                          userVote === 'reject' && styles.voteButtonTextSelected
                        ]}>
                          ❌ Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Launch Button */}
                  {activationReady && (
                    <TouchableOpacity
                      style={styles.launchButton}
                      onPress={() => launchCampaign.mutate(proposal)}
                      disabled={launchCampaign.isPending}
                    >
                      <Text style={styles.launchButtonText}>
                        {launchCampaign.isPending ? 'Launching...' : '🚀 Launch Campaign'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {userVote && !activationReady && (
                    <Text style={styles.yourVoteText}>
                      Your vote: {userVote === 'activate' ? '✅ Activate' : userVote === 'delay' ? '⏸️ Delay' : '❌ Reject'}
                    </Text>
                  )}
                </View>
              );
            })
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
    fontStyle: 'italic',
  },
  proposalsSection: {
    padding: 16,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  },
  demandText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  voteProgress: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  progressPercentageReady: {
    color: '#10b981',
  },
  progressBar: {
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
  },
  progressFillReady: {
    backgroundColor: '#10b981',
  },
  progressThreshold: {
    position: 'absolute',
    left: '60%',
    top: 28,
    alignItems: 'center',
  },
  thresholdMarker: {
    width: 2,
    height: 24,
    backgroundColor: '#ef4444',
  },
  thresholdText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 2,
  },
  voteBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 16,
  },
  voteItem: {
    alignItems: 'center',
  },
  voteCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  voteLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  votingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  voteActivateButton: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  voteDelayButton: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  voteRejectButton: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  voteButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  voteButtonTextSelected: {
    color: '#fff',
  },
  launchButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  launchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  yourVoteText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
