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
import { ReformWin, ReformScope, ReformStatus } from '../../types';

export const WinsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterScope, setFilterScope] = useState<ReformScope | 'all'>('all');
  
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newScope, setNewScope] = useState<ReformScope>('local');
  const [newStatus, setNewStatus] = useState<ReformStatus>('proposed');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const { data: reforms, isLoading } = useQuery({
    queryKey: ['reform-wins', filterScope],
    queryFn: async () => {
      let query = supabase
        .from('reform_wins')
        .select('*')
        .is('deleted_at', null)
        .order('momentum_score', { ascending: false });

      if (filterScope !== 'all') {
        query = query.eq('scope', filterScope);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReformWin[];
    },
  });

  const createReformMutation = useMutation({
    mutationFn: async (reform: {
      policy_name: string;
      description: string;
      location: string;
      scope: ReformScope;
      status: ReformStatus;
      source_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('reform_wins')
        .insert([
          {
            ...reform,
            created_by: user?.id,
            momentum_score: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reform-wins'] });
      setShowCreateModal(false);
      setNewPolicyName('');
      setNewDescription('');
      setNewLocation('');
      setNewScope('local');
      setNewStatus('proposed');
      setNewSourceUrl('');
    },
  });

  const handleCreateReform = () => {
    if (!newPolicyName.trim() || !newDescription.trim() || !newLocation.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    createReformMutation.mutate({
      policy_name: newPolicyName,
      description: newDescription,
      location: newLocation,
      scope: newScope,
      status: newStatus,
      source_url: newSourceUrl || undefined,
    });
  };

  const getStatusColor = (status: ReformStatus) => {
    switch (status) {
      case 'proposed':
        return '#94a3b8';
      case 'in_progress':
        return '#f59e0b';
      case 'passed':
        return '#22c55e';
      case 'implemented':
        return '#2563eb';
      default:
        return '#94a3b8';
    }
  };

  const getStatusLabel = (status: ReformStatus) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const renderReform = ({ item }: { item: ReformWin }) => {
    return (
      <View style={styles.reformCard}>
        <View style={styles.reformHeader}>
          <View style={styles.scopeBadge}>
            <Text style={styles.scopeText}>{item.scope.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.reformName}>{item.policy_name}</Text>
        <Text style={styles.reformLocation}>📍 {item.location}</Text>
        <Text style={styles.reformDescription}>{item.description}</Text>
        <View style={styles.momentumBar}>
          <View style={[styles.momentumFill, { width: `${item.momentum_score}%` }]} />
        </View>
        <Text style={styles.momentumText}>{item.momentum_score}% momentum</Text>
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
        <Text style={styles.headerTitle}>Reform Wins</Text>
        <Text style={styles.headerSubtitle}>Track our victories</Text>
      </View>

      <View style={styles.filters}>
        {(['all', 'local', 'state', 'national'] as const).map((scope) => (
          <TouchableOpacity
            key={scope}
            style={[styles.filterButton, filterScope === scope && styles.filterButtonActive]}
            onPress={() => setFilterScope(scope)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterScope === scope && styles.filterButtonTextActive,
              ]}
            >
              {scope === 'all' ? 'All' : scope.charAt(0).toUpperCase() + scope.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reforms}
        renderItem={renderReform}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No reform wins yet. Add one to celebrate progress!</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Reform Win</Text>

            <TextInput
              style={styles.input}
              placeholder="Policy Name"
              value={newPolicyName}
              onChangeText={setNewPolicyName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={styles.input}
              placeholder="Location (e.g., San Francisco, California)"
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>Scope:</Text>
              <View style={styles.pickerButtons}>
                {(['local', 'state', 'national'] as const).map((scope) => (
                  <TouchableOpacity
                    key={scope}
                    style={[styles.pickerButton, newScope === scope && styles.pickerButtonActive]}
                    onPress={() => setNewScope(scope)}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        newScope === scope && styles.pickerButtonTextActive,
                      ]}
                    >
                      {scope.charAt(0).toUpperCase() + scope.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>Status:</Text>
              <View style={styles.pickerButtons}>
                {(['proposed', 'in_progress', 'passed', 'implemented'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.pickerButton, newStatus === status && styles.pickerButtonActive]}
                    onPress={() => setNewStatus(status)}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        newStatus === status && styles.pickerButtonTextActive,
                      ]}
                    >
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Source URL (optional)"
              value={newSourceUrl}
              onChangeText={setNewSourceUrl}
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
                onPress={handleCreateReform}
                disabled={createReformMutation.isPending}
              >
                {createReformMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Add Win</Text>
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
  filters: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  list: {
    padding: 16,
  },
  reformCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  scopeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  reformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  reformLocation: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  reformDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  momentumBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  momentumFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  momentumText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
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
    maxHeight: '80%',
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
    height: 80,
    textAlignVertical: 'top',
  },
  pickerRow: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  pickerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  pickerButtonActive: {
    backgroundColor: '#2563eb',
  },
  pickerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  pickerButtonTextActive: {
    color: '#ffffff',
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
