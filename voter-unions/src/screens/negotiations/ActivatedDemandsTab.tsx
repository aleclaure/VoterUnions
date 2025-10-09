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
import { Demand, DemandNegotiation, NegotiationUpdate } from '../../types';

export const ActivatedDemandsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNegotiation, setSelectedNegotiation] = useState<DemandNegotiation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [targetName, setTargetName] = useState('');
  const [targetDescription, setTargetDescription] = useState('');
  const [updateText, setUpdateText] = useState('');

  const { data: activatedDemands, isLoading: demandsLoading } = useQuery({
    queryKey: ['demands-activated'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .eq('status', 'activated')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Demand[];
    },
  });

  const { data: negotiations, isLoading: negotiationsLoading } = useQuery({
    queryKey: ['demand-negotiations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_negotiations')
        .select('*, demands(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (DemandNegotiation & { demands: Demand })[];
    },
  });

  const { data: updates } = useQuery({
    queryKey: ['negotiation-updates', selectedNegotiation?.id],
    queryFn: async () => {
      if (!selectedNegotiation) return [];
      const { data, error } = await supabase
        .from('negotiation_updates')
        .select('*')
        .eq('negotiation_id', selectedNegotiation.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NegotiationUpdate[];
    },
    enabled: !!selectedNegotiation,
  });

  const createNegotiationMutation = useMutation({
    mutationFn: async (negotiation: { demand_id: string; target_name: string; target_description: string }) => {
      const { data, error } = await supabase
        .from('demand_negotiations')
        .insert([
          {
            demand_id: negotiation.demand_id,
            target_name: negotiation.target_name,
            target_description: negotiation.target_description,
            outcome_status: 'in_progress',
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-negotiations'] });
      setShowCreateModal(false);
      setTargetName('');
      setTargetDescription('');
      Alert.alert('Success', 'Negotiation created!');
    },
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (update: { negotiation_id: string; update_text: string }) => {
      const { data, error } = await supabase
        .from('negotiation_updates')
        .insert([
          {
            negotiation_id: update.negotiation_id,
            update_text: update.update_text,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['negotiation-updates', selectedNegotiation?.id] });
      await queryClient.refetchQueries({ queryKey: ['negotiation-updates', selectedNegotiation?.id] });
      setUpdateText('');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return '#2563eb';
      case 'bill_introduced': return '#8b5cf6';
      case 'voted_down': return '#ef4444';
      case 'under_review': return '#f59e0b';
      case 'passed': return '#22c55e';
      case 'rejected': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return '🔄';
      case 'bill_introduced': return '✅';
      case 'voted_down': return '🚫';
      case 'under_review': return '⏳';
      case 'passed': return '🎉';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  const renderNegotiation = ({ item }: { item: DemandNegotiation & { demands: Demand } }) => {
    return (
      <TouchableOpacity
        style={styles.negotiationCard}
        onPress={() => {
          setSelectedNegotiation(item);
          setShowUpdatesModal(true);
        }}
      >
        <View style={styles.demandInfo}>
          <Text style={styles.demandTitle}>{item.demands.title}</Text>
          <Text style={styles.targetText}>vs. {item.target_name}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.outcome_status) },
          ]}
        >
          <Text style={styles.statusText}>
            {getStatusIcon(item.outcome_status)} {item.outcome_status.replace('_', ' ')}
          </Text>
        </View>

        <Text style={styles.pledgeCount}>{item.pledge_count || 0} pledges</Text>
      </TouchableOpacity>
    );
  };

  const renderUpdate = ({ item }: { item: NegotiationUpdate }) => {
    return (
      <View style={styles.updateCard}>
        <Text style={styles.updateText}>{item.update_text}</Text>
        <Text style={styles.updateDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (demandsLoading || negotiationsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>From Principle to Power</Text>
        <Text style={styles.headerSubtitle}>Track real-time outcomes</Text>
      </View>

      <FlatList
        data={negotiations}
        renderItem={renderNegotiation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No active negotiations yet. Activate demands to start!
          </Text>
        }
      />

      {activatedDemands && activatedDemands.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create Negotiation Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start New Negotiation</Text>

            <Text style={styles.label}>Select Activated Demand:</Text>
            <FlatList
              data={activatedDemands}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.demandChip,
                    selectedDemand?.id === item.id && styles.demandChipActive,
                  ]}
                  onPress={() => setSelectedDemand(item)}
                >
                  <Text
                    style={[
                      styles.demandChipText,
                      selectedDemand?.id === item.id && styles.demandChipTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              style={styles.demandList}
            />

            <TextInput
              style={styles.input}
              placeholder="Target (e.g., Senator X, Company Y)"
              value={targetName}
              onChangeText={setTargetName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={targetDescription}
              onChangeText={setTargetDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setSelectedDemand(null);
                  setTargetName('');
                  setTargetDescription('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={() => {
                  if (!selectedDemand || !targetName.trim()) {
                    Alert.alert('Error', 'Please select a demand and enter a target');
                    return;
                  }
                  createNegotiationMutation.mutate({
                    demand_id: selectedDemand.id,
                    target_name: targetName,
                    target_description: targetDescription,
                  });
                }}
                disabled={createNegotiationMutation.isPending}
              >
                {createNegotiationMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Updates Modal */}
      <Modal visible={showUpdatesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedNegotiation?.target_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedNegotiation?.target_description}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowUpdatesModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.updateInput]}
              placeholder="Add status update..."
              value={updateText}
              onChangeText={setUpdateText}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              style={styles.addUpdateButton}
              onPress={() => {
                if (!updateText.trim() || !selectedNegotiation) {
                  Alert.alert('Error', 'Please enter update text');
                  return;
                }
                addUpdateMutation.mutate({
                  negotiation_id: selectedNegotiation.id,
                  update_text: updateText,
                });
              }}
              disabled={addUpdateMutation.isPending}
            >
              {addUpdateMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.addUpdateButtonText}>Add Update</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.updatesTitle}>Timeline</Text>
            <FlatList
              data={updates}
              renderItem={renderUpdate}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.updatesList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No updates yet</Text>
              }
            />
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  negotiationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demandInfo: {
    marginBottom: 12,
  },
  demandTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  pledgeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
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
  modalContentLarge: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  demandList: {
    marginBottom: 16,
  },
  demandChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  demandChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  demandChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  demandChipTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  updateInput: {
    height: 60,
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
  addUpdateButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addUpdateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  updatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  updatesList: {
    maxHeight: 250,
  },
  updateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  updateText: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 4,
  },
  updateDate: {
    fontSize: 11,
    color: '#64748b',
  },
});
