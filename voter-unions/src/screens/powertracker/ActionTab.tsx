import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  usePowerPledges,
  useCreatePowerPledge,
  useDeletePowerPledge,
} from '../../hooks/usePowerPledges';
import { usePowerPoliticians } from '../../hooks/usePowerPoliticians';
import { usePowerBills } from '../../hooks/usePowerBills';
import { useAuth } from '../../hooks/useAuth';
import { useUnionMemberships } from '../../hooks/useUnions';
import { PowerPledge, PledgeAction } from '../../types';

export const ActionTab = () => {
  const { user } = useAuth();
  const { data: pledges, isLoading } = usePowerPledges();
  const { data: politicians } = usePowerPoliticians();
  const { data: bills } = usePowerBills();
  const { data: memberships } = useUnionMemberships(user?.id || '');
  const createPledge = useCreatePowerPledge();
  const deletePledge = useDeletePowerPledge();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    union_id: '',
    target_type: 'politician' as 'politician' | 'bill' | 'reform',
    target_id: '',
    action: 'vote_against' as PledgeAction,
    reason: '',
  });

  const handleCreate = async () => {
    if (!formData.union_id || !formData.target_id) {
      Alert.alert('Error', 'Please select a union and target');
      return;
    }

    try {
      const pledgeData: any = {
        union_id: formData.union_id,
        user_id: user?.id || '',
        target_type: formData.target_type,
        action: formData.action,
        reason: formData.reason || undefined,
      };

      if (formData.target_type === 'politician') {
        pledgeData.politician_id = formData.target_id;
      } else if (formData.target_type === 'bill') {
        pledgeData.bill_id = formData.target_id;
      }

      await createPledge.mutateAsync(pledgeData);
      setShowAddModal(false);
      setFormData({
        union_id: '',
        target_type: 'politician',
        target_id: '',
        action: 'vote_against',
        reason: '',
      });
      Alert.alert('Success', 'Pledge created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create pledge');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePledge.mutateAsync(id);
      Alert.alert('Success', 'Pledge removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove pledge');
    }
  };

  const getPoliticianName = (politicianId?: string) => {
    if (!politicianId) return 'Unknown';
    const politician = politicians?.find((p) => p.id === politicianId);
    return politician?.name || 'Unknown';
  };

  const getBillTitle = (billId?: string) => {
    if (!billId) return 'Unknown';
    const bill = bills?.find((b) => b.id === billId);
    return bill?.title || 'Unknown';
  };

  const getActionColor = (action: PledgeAction) => {
    switch (action) {
      case 'vote_against':
        return '#ef4444';
      case 'support_reform':
        return '#10b981';
      case 'oppose_reform':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Take Action</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Pledge</Text>
          </TouchableOpacity>
        </View>

        {pledges && pledges.length > 0 ? (
          pledges.map((pledge) => (
            <View key={pledge.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.actionBadge,
                    { backgroundColor: getActionColor(pledge.action) },
                  ]}
                >
                  <Text style={styles.actionText}>
                    {pledge.action.replace('_', ' ')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(pledge.id)}>
                  <Text style={styles.deleteText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.targetType}>{pledge.target_type}</Text>
              <Text style={styles.targetName}>
                {pledge.target_type === 'politician'
                  ? getPoliticianName(pledge.politician_id)
                  : pledge.target_type === 'bill'
                  ? getBillTitle(pledge.bill_id)
                  : 'Reform'}
              </Text>
              {pledge.reason && (
                <Text style={styles.reason}>{pledge.reason}</Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pledges yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Pledge button to take action
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Pledge Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Pledge</Text>

              <Text style={styles.label}>Select Union</Text>
              <View style={styles.optionButtons}>
                {memberships && memberships.length > 0 ? (
                  memberships.map((membership) => (
                    <TouchableOpacity
                      key={membership.union_id}
                      style={[
                        styles.optionButton,
                        formData.union_id === membership.union_id &&
                          styles.optionButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, union_id: membership.union_id })
                      }
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          formData.union_id === membership.union_id &&
                            styles.optionButtonTextActive,
                        ]}
                      >
                        Union
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noUnionsText}>
                    Join a union to create pledges
                  </Text>
                )}
              </View>

              <Text style={styles.label}>Target Type</Text>
              <View style={styles.optionButtons}>
                {['politician', 'bill'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      formData.target_type === type && styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        target_type: type as 'politician' | 'bill',
                        target_id: '',
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.target_type === type &&
                          styles.optionButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.target_type === 'politician' && politicians && (
                <>
                  <Text style={styles.label}>Select Politician</Text>
                  <View style={styles.optionButtons}>
                    {politicians.map((politician) => (
                      <TouchableOpacity
                        key={politician.id}
                        style={[
                          styles.optionButton,
                          formData.target_id === politician.id &&
                            styles.optionButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, target_id: politician.id })
                        }
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            formData.target_id === politician.id &&
                              styles.optionButtonTextActive,
                          ]}
                        >
                          {politician.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {formData.target_type === 'bill' && bills && (
                <>
                  <Text style={styles.label}>Select Bill</Text>
                  <View style={styles.optionButtons}>
                    {bills.map((bill) => (
                      <TouchableOpacity
                        key={bill.id}
                        style={[
                          styles.optionButton,
                          formData.target_id === bill.id && styles.optionButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, target_id: bill.id })
                        }
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            formData.target_id === bill.id &&
                              styles.optionButtonTextActive,
                          ]}
                        >
                          {bill.bill_number} - {bill.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Action</Text>
              <View style={styles.optionButtons}>
                {['vote_against', 'support_reform', 'oppose_reform'].map((action) => (
                  <TouchableOpacity
                    key={action}
                    style={[
                      styles.optionButton,
                      formData.action === action && styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, action: action as PledgeAction })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.action === action && styles.optionButtonTextActive,
                      ]}
                    >
                      {action.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Reason (optional)"
                value={formData.reason}
                onChangeText={(text) => setFormData({ ...formData, reason: text })}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleCreate}
                  disabled={createPledge.isPending}
                >
                  <Text style={styles.createButtonText}>
                    {createPledge.isPending ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  deleteText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  targetType: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    marginTop: 8,
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  optionButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  optionButtonTextActive: {
    color: '#ffffff',
  },
  noUnionsText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
