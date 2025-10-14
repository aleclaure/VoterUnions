import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BoycottCampaign, CampaignOutcome } from '../../types';

export default function ImpactWinsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [outcomeForm, setOutcomeForm] = useState({
    outcome_type: 'victory',
    outcome_description: '',
    total_participants: '',
    economic_impact: '',
    company_statements: '',
    monitoring_plan: '',
  });

  // Fetch completed campaigns
  const { data: campaigns = [], isLoading } = useQuery<BoycottCampaign[]>({
    queryKey: ['boycott-campaigns-completed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boycott_campaigns')
        .select('*')
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch outcomes
  const { data: outcomes = [] } = useQuery<CampaignOutcome[]>({
    queryKey: ['campaign-outcomes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_outcomes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Mark campaign complete mutation
  const completeCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('boycott_campaigns')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boycott-campaigns-active'] });
      queryClient.invalidateQueries({ queryKey: ['boycott-campaigns-completed'] });
      Alert.alert('Success', 'Campaign marked as completed!');
    },
  });

  // Record outcome mutation
  const recordOutcomeMutation = useMutation({
    mutationFn: async (data: typeof outcomeForm & { campaign_id: string }) => {
      const { error } = await supabase
        .from('campaign_outcomes')
        .insert({
          campaign_id: data.campaign_id,
          outcome_type: data.outcome_type,
          outcome_description: data.outcome_description,
          total_participants: data.total_participants ? parseInt(data.total_participants) : null,
          economic_impact: data.economic_impact ? parseFloat(data.economic_impact) : null,
          company_statements: data.company_statements || null,
          monitoring_plan: data.monitoring_plan || null,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-outcomes'] });
      setOutcomeForm({
        outcome_type: 'victory',
        outcome_description: '',
        total_participants: '',
        economic_impact: '',
        company_statements: '',
        monitoring_plan: '',
      });
      setSelectedCampaign(null);
      Alert.alert('Success', 'Outcome recorded! Victory documented.');
    },
  });

  const handleRecordOutcome = () => {
    if (!selectedCampaign || !outcomeForm.outcome_description.trim()) {
      Alert.alert('Error', 'Please provide outcome description');
      return;
    }
    recordOutcomeMutation.mutate({
      ...outcomeForm,
      campaign_id: selectedCampaign,
    });
  };

  const getCampaignOutcome = (campaignId: string) => {
    return outcomes.find(o => o.campaign_id === campaignId);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading victories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Summary Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Our Collective Power</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{campaigns.length}</Text>
              <Text style={styles.statLabel}>Completed Campaigns</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {outcomes.filter(o => o.outcome_type === 'victory').length}
              </Text>
              <Text style={styles.statLabel}>Victories</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {outcomes.reduce((sum, o) => sum + (o.total_participants || 0), 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Participants</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ${(outcomes.reduce((sum, o) => sum + (o.economic_impact || 0), 0) / 1000000).toFixed(1)}M
              </Text>
              <Text style={styles.statLabel}>Economic Impact</Text>
            </View>
          </View>
        </View>

        {/* Campaigns List */}
        <View style={styles.campaignsSection}>
          <Text style={styles.sectionTitle}>Campaign Archive</Text>

          {campaigns.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No completed campaigns yet</Text>
              <Text style={styles.emptyStateSubtext}>Your victories will be celebrated here</Text>
            </View>
          ) : (
            campaigns.map((campaign) => {
              const outcome = getCampaignOutcome(campaign.id);
              const isExpanded = selectedCampaign === campaign.id;

              return (
                <View key={campaign.id} style={styles.campaignCard}>
                  <TouchableOpacity
                    onPress={() => setSelectedCampaign(isExpanded ? null : campaign.id)}
                  >
                    {/* Outcome Badge */}
                    {outcome && (
                      <View style={[
                        styles.outcomeBadge,
                        outcome.outcome_type === 'victory' && styles.outcomeBadgeVictory,
                        outcome.outcome_type === 'partial_victory' && styles.outcomeBadgePartial,
                      ]}>
                        <Text style={styles.outcomeBadgeText}>
                          {outcome.outcome_type === 'victory' && '🎉 Victory'}
                          {outcome.outcome_type === 'partial_victory' && '🏆 Partial Victory'}
                          {outcome.outcome_type === 'cancelled' && '⏸️ Cancelled'}
                          {outcome.outcome_type === 'ongoing_monitoring' && '👁️ Monitoring'}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.campaignTitle}>{campaign.title}</Text>

                    <View style={styles.targetSection}>
                      <Text style={styles.targetLabel}>Target:</Text>
                      <Text style={styles.targetText}>{campaign.target_company}</Text>
                    </View>

                    {/* Campaign Stats */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{campaign.pledge_count}</Text>
                        <Text style={styles.statItemLabel}>Pledges</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{campaign.progress_percentage}%</Text>
                        <Text style={styles.statItemLabel}>Progress</Text>
                      </View>
                      {campaign.economic_impact_estimate && (
                        <View style={styles.statItem}>
                          <Text style={styles.statItemValue}>
                            ${(campaign.economic_impact_estimate / 1000000).toFixed(1)}M
                          </Text>
                          <Text style={styles.statItemLabel}>Impact</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.completedDate}>
                      Completed: {campaign.completed_at ? new Date(campaign.completed_at).toLocaleDateString() : 'N/A'}
                    </Text>
                  </TouchableOpacity>

                  {/* Outcome Details */}
                  {isExpanded && outcome && (
                    <View style={styles.outcomeDetails}>
                      <Text style={styles.outcomeTitle}>Campaign Outcome</Text>
                      <Text style={styles.outcomeDescription}>{outcome.outcome_description}</Text>

                      {outcome.total_participants && (
                        <View style={styles.outcomeMetric}>
                          <Text style={styles.outcomeMetricLabel}>Participants:</Text>
                          <Text style={styles.outcomeMetricValue}>
                            {outcome.total_participants.toLocaleString()}
                          </Text>
                        </View>
                      )}

                      {outcome.economic_impact && (
                        <View style={styles.outcomeMetric}>
                          <Text style={styles.outcomeMetricLabel}>Economic Impact:</Text>
                          <Text style={styles.outcomeMetricValue}>
                            ${(outcome.economic_impact / 1000000).toFixed(2)}M
                          </Text>
                        </View>
                      )}

                      {outcome.company_statements && (
                        <View style={styles.companyStatements}>
                          <Text style={styles.companyStatementsLabel}>🏢 Company Response:</Text>
                          <Text style={styles.companyStatementsText}>{outcome.company_statements}</Text>
                        </View>
                      )}

                      {outcome.monitoring_plan && (
                        <View style={styles.monitoringPlan}>
                          <Text style={styles.monitoringPlanLabel}>👁️ Ongoing Monitoring:</Text>
                          <Text style={styles.monitoringPlanText}>{outcome.monitoring_plan}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Record Outcome Form */}
                  {isExpanded && !outcome && (
                    <View style={styles.outcomeForm}>
                      <Text style={styles.formTitle}>Record Campaign Outcome</Text>

                      <Text style={styles.label}>Outcome Type</Text>
                      <View style={styles.outcomeTypeButtons}>
                        {['victory', 'partial_victory', 'cancelled', 'ongoing_monitoring'].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.outcomeTypeButton,
                              outcomeForm.outcome_type === type && styles.outcomeTypeButtonSelected
                            ]}
                            onPress={() => setOutcomeForm({ ...outcomeForm, outcome_type: type })}
                          >
                            <Text style={[
                              styles.outcomeTypeButtonText,
                              outcomeForm.outcome_type === type && styles.outcomeTypeButtonTextSelected
                            ]}>
                              {type.replace('_', ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.label}>Outcome Description *</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={outcomeForm.outcome_description}
                        onChangeText={(text) => setOutcomeForm({ ...outcomeForm, outcome_description: text })}
                        placeholder="Describe what was achieved..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={4}
                      />

                      <Text style={styles.label}>Total Participants</Text>
                      <TextInput
                        style={styles.input}
                        value={outcomeForm.total_participants}
                        onChangeText={(text) => setOutcomeForm({ ...outcomeForm, total_participants: text })}
                        placeholder="e.g., 50000"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                      />

                      <Text style={styles.label}>Economic Impact ($)</Text>
                      <TextInput
                        style={styles.input}
                        value={outcomeForm.economic_impact}
                        onChangeText={(text) => setOutcomeForm({ ...outcomeForm, economic_impact: text })}
                        placeholder="e.g., 5000000"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                      />

                      <Text style={styles.label}>Company Statements</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={outcomeForm.company_statements}
                        onChangeText={(text) => setOutcomeForm({ ...outcomeForm, company_statements: text })}
                        placeholder="Public statements from the company..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                      />

                      <Text style={styles.label}>Monitoring Plan</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={outcomeForm.monitoring_plan}
                        onChangeText={(text) => setOutcomeForm({ ...outcomeForm, monitoring_plan: text })}
                        placeholder="How will we ensure accountability?"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                      />

                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleRecordOutcome}
                      >
                        <Text style={styles.submitButtonText}>Record Outcome</Text>
                      </TouchableOpacity>
                    </View>
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
  statsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  campaignsSection: {
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
  campaignCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outcomeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  outcomeBadgeVictory: {
    backgroundColor: '#d1fae5',
  },
  outcomeBadgePartial: {
    backgroundColor: '#fef3c7',
  },
  outcomeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  campaignTitle: {
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
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statItemLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  completedDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  outcomeDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  outcomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  outcomeDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  outcomeMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  outcomeMetricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  outcomeMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  companyStatements: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  companyStatementsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  companyStatementsText: {
    fontSize: 12,
    color: '#78350f',
  },
  monitoringPlan: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  monitoringPlanLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  monitoringPlanText: {
    fontSize: 12,
    color: '#1e3a8a',
  },
  outcomeForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  outcomeTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  outcomeTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  outcomeTypeButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  outcomeTypeButtonText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  outcomeTypeButtonTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
