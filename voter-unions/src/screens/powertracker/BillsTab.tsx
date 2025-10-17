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
import { usePowerBills, useCreateBill } from '../../hooks/usePowerBills';
import { useAuth } from '../../hooks/useAuth';
import { PowerBill, BillStatus } from '../../types';
import { stripHtml, sanitizeUrl } from '../../lib/inputSanitization';

export const BillsTab = () => {
  const { user } = useAuth();
  const { data: bills, isLoading } = usePowerBills();
  const createBill = useCreateBill();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PowerBill | null>(null);
  const [formData, setFormData] = useState({
    bill_number: '',
    title: '',
    summary: '',
    status: 'introduced' as BillStatus,
    analysis: '',
    source_link: '',
  });

  const handleCreate = async () => {
    if (!formData.bill_number || !formData.title || !formData.summary) {
      Alert.alert('Error', 'Bill number, title, and summary are required');
      return;
    }

    try {
      // Sanitize inputs to prevent XSS attacks
      const sanitizedData = {
        bill_number: stripHtml(formData.bill_number),
        title: stripHtml(formData.title),
        summary: stripHtml(formData.summary),
        status: formData.status, // Enum value, already validated
        analysis: stripHtml(formData.analysis),
        source_link: sanitizeUrl(formData.source_link) || undefined,
        created_by: user?.id || '',
      };
      
      await createBill.mutateAsync(sanitizedData);
      setShowAddModal(false);
      setFormData({
        bill_number: '',
        title: '',
        summary: '',
        status: 'introduced',
        analysis: '',
        source_link: '',
      });
      Alert.alert('Success', 'Bill added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create bill');
    }
  };

  const getStatusColor = (status: BillStatus) => {
    switch (status) {
      case 'enacted':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'passed_house':
      case 'passed_senate':
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
          <Text style={styles.title}>Bills</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {bills && bills.length > 0 ? (
          bills.map((bill) => (
            <TouchableOpacity
              key={bill.id}
              style={styles.card}
              onPress={() => setSelectedBill(bill)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.billNumber}>{bill.bill_number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(bill.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{bill.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.billTitle}>{bill.title}</Text>
              <Text style={styles.billSummary} numberOfLines={2}>
                {bill.summary}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bills added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Add button to analyze your first bill
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Bill</Text>

              <TextInput
                style={styles.input}
                placeholder="Bill Number (e.g., H.R. 1234) *"
                value={formData.bill_number}
                onChangeText={(text) =>
                  setFormData({ ...formData, bill_number: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Title *"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Summary *"
                value={formData.summary}
                onChangeText={(text) => setFormData({ ...formData, summary: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusButtons}>
                {['introduced', 'passed_house', 'passed_senate', 'enacted', 'failed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      formData.status === status && styles.statusButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, status: status as BillStatus })}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        formData.status === status && styles.statusButtonTextActive,
                      ]}
                    >
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Who Profits? (Analysis)"
                value={formData.analysis}
                onChangeText={(text) => setFormData({ ...formData, analysis: text })}
                multiline
                numberOfLines={4}
              />

              <TextInput
                style={styles.input}
                placeholder="Source Link (optional)"
                value={formData.source_link}
                onChangeText={(text) =>
                  setFormData({ ...formData, source_link: text })
                }
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
                  disabled={createBill.isPending}
                >
                  <Text style={styles.createButtonText}>
                    {createBill.isPending ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Bill Detail Modal */}
      <Modal
        visible={!!selectedBill}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBill(null)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              {selectedBill && (
                <>
                  <Text style={styles.detailNumber}>{selectedBill.bill_number}</Text>
                  <Text style={styles.detailTitle}>{selectedBill.title}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(selectedBill.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {selectedBill.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <Text style={styles.detailText}>{selectedBill.summary}</Text>
                  {selectedBill.analysis && (
                    <>
                      <Text style={styles.sectionTitle}>Who Profits?</Text>
                      <Text style={styles.detailText}>{selectedBill.analysis}</Text>
                    </>
                  )}
                  {selectedBill.source_link && (
                    <>
                      <Text style={styles.sectionTitle}>Source</Text>
                      <Text style={styles.linkText}>{selectedBill.source_link}</Text>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, styles.closeButton]}
                    onPress={() => setSelectedBill(null)}
                  >
                    <Text style={styles.createButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
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
  billNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  billSummary: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
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
    height: 100,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  statusButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#ffffff',
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
  closeButton: {
    backgroundColor: '#2563eb',
    marginTop: 20,
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
  detailNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});
