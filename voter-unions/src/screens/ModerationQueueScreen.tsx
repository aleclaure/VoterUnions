import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useUnionReports, useUpdateReport } from '../hooks/useReports';
import { Report, ReportStatus } from '../types';

interface ModerationQueueScreenProps {
  route: {
    params: {
      unionId: string;
    };
  };
}

export const ModerationQueueScreen: React.FC<ModerationQueueScreenProps> = ({ route }) => {
  const { unionId } = route.params;
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | undefined>('pending');
  const { data: reports, isLoading } = useUnionReports(unionId, selectedStatus);
  const updateReport = useUpdateReport();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpdateStatus = async (reportId: string, status: ReportStatus, notes?: string) => {
    if (!user) return;

    setIsProcessing(true);
    try {
      await updateReport.mutateAsync({
        reportId,
        status,
        adminNotes: notes,
      });

      setSelectedReport(null);
      setAdminNotes('');
      Alert.alert('Success', 'Report status updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update report status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => {
        setSelectedReport(item);
        setAdminNotes(item.admin_notes || '');
      }}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.contentType}>{item.content_type.replace(/_/g, ' ').toUpperCase()}</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.reason} numberOfLines={3}>
        {item.reason}
      </Text>

      <View style={styles.reportFooter}>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.reviewed_at && (
          <Text style={styles.reviewedText}>
            Reviewed {new Date(item.reviewed_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const getStatusStyle = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'reviewed':
        return styles.statusReviewed;
      case 'dismissed':
        return styles.statusDismissed;
      case 'actioned':
        return styles.statusActioned;
      default:
        return {};
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
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <View style={styles.filterButtons}>
          {(['pending', 'reviewed', 'dismissed', 'actioned'] as ReportStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === status && styles.filterButtonTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!reports || reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reports found</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={selectedReport !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Report</Text>

            {selectedReport && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Content Type:</Text>
                  <Text style={styles.modalValue}>
                    {selectedReport.content_type.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Reason:</Text>
                  <Text style={styles.modalValue}>{selectedReport.reason}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Admin Notes:</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Add notes about this report..."
                    placeholderTextColor="#999"
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dismissButton]}
                    onPress={() =>
                      handleUpdateStatus(selectedReport.id, 'dismissed', adminNotes)
                    }
                    disabled={isProcessing}
                  >
                    <Text style={styles.actionButtonText}>Dismiss</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.reviewedButton]}
                    onPress={() =>
                      handleUpdateStatus(selectedReport.id, 'reviewed', adminNotes)
                    }
                    disabled={isProcessing}
                  >
                    <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionedButton]}
                    onPress={() =>
                      handleUpdateStatus(selectedReport.id, 'actioned', adminNotes)
                    }
                    disabled={isProcessing}
                  >
                    <Text style={styles.actionButtonText}>Action Taken</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedReport(null)}
                  disabled={isProcessing}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusReviewed: {
    backgroundColor: '#dbeafe',
  },
  statusDismissed: {
    backgroundColor: '#f3f4f6',
  },
  statusActioned: {
    backgroundColor: '#d1fae5',
  },
  reason: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  reviewedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#6b7280',
  },
  reviewedButton: {
    backgroundColor: '#3b82f6',
  },
  actionedButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
