import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BoycottCampaign, CampaignPledge, CampaignUpdate } from '../../types';

export default function ActiveBoycottsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [updateType, setUpdateType] = useState<string>('progress_update');

  // Fetch active campaigns
  const { data: campaigns = [], isLoading } = useQuery<BoycottCampaign[]>({
    queryKey: ['boycott-campaigns-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boycott_campaigns')
        .select('*')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('launched_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user pledges
  const { data: userPledges = [] } = useQuery<CampaignPledge[]>({
    queryKey: ['campaign-pledges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('campaign_pledges')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch updates for selected campaign
  const { data: campaignUpdates = [] } = useQuery<CampaignUpdate[]>({
    queryKey: ['campaign-updates', selectedCampaign],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      const { data, error } = await supabase
        .from('campaign_updates')
        .select('*')
        .eq('campaign_id', selectedCampaign)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCampaign,
  });

  // Pledge mutation
  const pledgeMutation = useMutation({
    mutationFn: async ({ campaignId, pledgeType }: { campaignId: string; pledgeType: string }) => {
      const { data, error } = await supabase
        .from('campaign_pledges')
        .insert({
          campaign_id: campaignId,
          user_id: user?.id,
          pledge_type: pledgeType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-pledges'] });
      queryClient.invalidateQueries({ queryKey: ['boycott-campaigns-active'] });
      Alert.alert('Success', 'Pledge recorded! Together we create change.');
    },
  });

  // Remove pledge mutation
  const removePledgeMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const pledge = userPledges.find(p => p.campaign_id === campaignId);
      if (!pledge) throw new Error('Pledge not found');

      const { error } = await supabase
        .from('campaign_pledges')
        .delete()
        .eq('id', pledge.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-pledges'] });
      queryClient.invalidateQueries({ queryKey: ['boycott-campaigns-active'] });
    },
  });

  // Add update mutation
  const addUpdateMutation = useMutation({
    mutationFn: async ({ campaignId, updateType, content }: { campaignId: string; updateType: string; content: string }) => {
      const { data, error } = await supabase
        .from('campaign_updates')
        .insert({
          campaign_id: campaignId,
          update_type: updateType,
          content,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-updates'] });
      setUpdateText('');
      Alert.alert('Success', 'Update posted to campaign timeline');
    },
  });

  const hasPledged = (campaignId: string) => {
    return userPledges.some(p => p.campaign_id === campaignId);
  };

  const handlePledge = (campaignId: string) => {
    if (hasPledged(campaignId)) {
      removePledgeMutation.mutate(campaignId);
    } else {
      pledgeMutation.mutate({ campaignId, pledgeType: 'participate' });
    }
  };

  const handleAddUpdate = () => {
    if (!selectedCampaign || !updateText.trim()) {
      Alert.alert('Error', 'Please enter update content');
      return;
    }
    addUpdateMutation.mutate({
      campaignId: selectedCampaign,
      updateType,
      content: updateText,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Campaigns List */}
        <View style={styles.campaignsSection}>
          {campaigns.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No active campaigns</Text>
              <Text style={styles.emptyStateSubtext}>Launch a campaign from Vote & Launch tab</Text>
            </View>
          ) : (
            campaigns.map((campaign) => {
              const isPledged = hasPledged(campaign.id);
              const isExpanded = selectedCampaign === campaign.id;

              return (
                <View key={campaign.id} style={styles.campaignCard}>
                  <TouchableOpacity
                    onPress={() => setSelectedCampaign(isExpanded ? null : campaign.id)}
                  >
                    <Text style={styles.campaignTitle}>{campaign.title}</Text>

                    <View style={styles.targetSection}>
                      <Text style={styles.targetLabel}>Target:</Text>
                      <Text style={styles.targetText}>{campaign.target_company}</Text>
                    </View>

                    {/* Progress Meter */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Demand Met</Text>
                        <Text style={styles.progressPercentage}>{campaign.progress_percentage}%</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(campaign.progress_percentage, 100)}%` }
                          ]}
                        />
                      </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{campaign.pledge_count}</Text>
                        <Text style={styles.statLabel}>Pledges</Text>
                      </View>
                      {campaign.economic_impact_estimate && (
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>
                            ${(campaign.economic_impact_estimate / 1000000).toFixed(1)}M
                          </Text>
                          <Text style={styles.statLabel}>Impact</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Demands */}
                  <View style={styles.demandsSection}>
                    <Text style={styles.demandsLabel}>Our Demands:</Text>
                    <Text style={styles.demandsText}>{campaign.demands}</Text>
                  </View>

                  {/* Consumer Actions */}
                  {campaign.consumer_actions && (
                    <View style={styles.actionsSection}>
                      <Text style={styles.actionsLabel}>🎯 Suggested Actions:</Text>
                      <Text style={styles.actionsText}>{campaign.consumer_actions}</Text>
                    </View>
                  )}

                  {/* Pledge Button */}
                  <TouchableOpacity
                    style={[
                      styles.pledgeButton,
                      isPledged && styles.pledgeButtonActive
                    ]}
                    onPress={() => handlePledge(campaign.id)}
                  >
                    <Text style={[
                      styles.pledgeButtonText,
                      isPledged && styles.pledgeButtonTextActive
                    ]}>
                      {isPledged ? '✓ Pledged' : '+ Pledge Participation'}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Timeline */}
                  {isExpanded && (
                    <View style={styles.timelineSection}>
                      <Text style={styles.timelineTitle}>Campaign Timeline</Text>

                      {/* Add Update Form */}
                      <View style={styles.updateForm}>
                        <Text style={styles.updateFormLabel}>Post Update</Text>
                        <View style={styles.updateTypeButtons}>
                          {['progress_update', 'company_response', 'media_coverage', 'demand_met'].map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.updateTypeButton,
                                updateType === type && styles.updateTypeButtonSelected
                              ]}
                              onPress={() => setUpdateType(type)}
                            >
                              <Text style={[
                                styles.updateTypeButtonText,
                                updateType === type && styles.updateTypeButtonTextSelected
                              ]}>
                                {type.replace('_', ' ')}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.updateInput}
                          value={updateText}
                          onChangeText={setUpdateText}
                          placeholder="Share news, company response, or progress..."
                          placeholderTextColor="#9ca3af"
                          multiline
                          numberOfLines={3}
                        />
                        <TouchableOpacity
                          style={styles.postUpdateButton}
                          onPress={handleAddUpdate}
                        >
                          <Text style={styles.postUpdateButtonText}>Post Update</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Timeline Updates */}
                      {campaignUpdates.length > 0 ? (
                        campaignUpdates.map((update) => (
                          <View key={update.id} style={styles.timelineItem}>
                            <View style={styles.timelineIcon}>
                              <Text style={styles.timelineIconText}>
                                {update.update_type === 'company_response' && '🏢'}
                                {update.update_type === 'media_coverage' && '📰'}
                                {update.update_type === 'demand_met' && '✅'}
                                {update.update_type === 'progress_update' && '📊'}
                              </Text>
                            </View>
                            <View style={styles.timelineContent}>
                              <Text style={styles.timelineType}>
                                {update.update_type?.replace('_', ' ')}
                              </Text>
                              <Text style={styles.timelineText}>{update.content}</Text>
                              <Text style={styles.timelineDate}>
                                {new Date(update.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noUpdatesText}>No updates yet</Text>
                      )}
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
  campaignsSection: {
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
  campaignCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ef4444',
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
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  demandsSection: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  demandsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  demandsText: {
    fontSize: 14,
    color: '#7f1d1d',
  },
  actionsSection: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  actionsText: {
    fontSize: 14,
    color: '#1e3a8a',
  },
  pledgeButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pledgeButtonActive: {
    backgroundColor: '#10b981',
  },
  pledgeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pledgeButtonTextActive: {
    color: '#fff',
  },
  timelineSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  updateForm: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  updateFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  updateTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  updateTypeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  updateTypeButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  updateTypeButtonText: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  updateTypeButtonTextSelected: {
    color: '#fff',
  },
  updateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  postUpdateButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  postUpdateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineIconText: {
    fontSize: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noUpdatesText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
