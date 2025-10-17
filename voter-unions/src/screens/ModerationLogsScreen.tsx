import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnionModerationLogs, ModerationLog } from '../hooks/useModerationLogs';

interface ModerationLogsScreenProps {
  route: {
    params: {
      unionId: string;
      unionName?: string;
    };
  };
  navigation: any;
}

export const ModerationLogsScreen: React.FC<ModerationLogsScreenProps> = ({
  route,
  navigation,
}) => {
  const { unionId, unionName } = route.params;
  const { data: logs, isLoading, error } = useUnionModerationLogs(unionId);
  const [selectedLog, setSelectedLog] = useState<ModerationLog | null>(null);

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'report_dismissed':
        return '#10b981'; // green
      case 'report_reviewed':
        return '#3b82f6'; // blue
      case 'report_actioned':
        return '#f59e0b'; // yellow
      case 'content_deleted':
        return '#ef4444'; // red
      case 'content_restored':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'report_dismissed':
        return 'Report Dismissed';
      case 'report_reviewed':
        return 'Report Reviewed';
      case 'report_actioned':
        return 'Action Taken';
      case 'content_deleted':
        return 'Content Deleted';
      case 'content_restored':
        return 'Content Restored';
      default:
        return actionType;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Moderation Log</Text>
          <View style={{ width: 60 }} />
        </View>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Moderation Log</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load moderation logs</Text>
          <Text style={styles.errorSubtext}>{(error as Error).message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moderation Log</Text>
        <View style={{ width: 60 }} />
      </View>

      {unionName && (
        <View style={styles.unionInfo}>
          <Text style={styles.unionName}>{unionName}</Text>
          <Text style={styles.unionSubtext}>Transparency & Accountability</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {!logs || logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No moderation actions yet</Text>
            <Text style={styles.emptySubtext}>
              All admin actions on reports and content will appear here for transparency
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              All Moderation Actions ({logs.length})
            </Text>
            {logs.map((log) => (
              <TouchableOpacity
                key={log.id}
                style={styles.logCard}
                onPress={() => setSelectedLog(log)}
              >
                <View style={styles.logHeader}>
                  <View
                    style={[
                      styles.actionBadge,
                      { backgroundColor: getActionColor(log.action_type) },
                    ]}
                  >
                    <Text style={styles.actionBadgeText}>
                      {getActionLabel(log.action_type)}
                    </Text>
                  </View>
                  <Text style={styles.logDate}>{formatDate(log.created_at)}</Text>
                </View>

                <Text style={styles.logDescription}>{log.description}</Text>

                <View style={styles.logFooter}>
                  <Text style={styles.adminName}>by @{log.admin_username}</Text>
                  <Text style={styles.detailsLink}>View Details →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={!!selectedLog}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Moderation Action Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Action Type</Text>
                  <View
                    style={[
                      styles.actionBadge,
                      { backgroundColor: getActionColor(selectedLog.action_type) },
                    ]}
                  >
                    <Text style={styles.actionBadgeText}>
                      {getActionLabel(selectedLog.action_type)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Admin</Text>
                  <Text style={styles.detailValue}>@{selectedLog.admin_username}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailDescription}>{selectedLog.description}</Text>
                </View>

                {selectedLog.metadata.content_type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Content Type</Text>
                    <Text style={styles.detailValue}>
                      {selectedLog.metadata.content_type}
                    </Text>
                  </View>
                )}

                {selectedLog.metadata.reason && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Report Reason</Text>
                    <Text style={styles.detailDescription}>
                      {selectedLog.metadata.reason}
                    </Text>
                  </View>
                )}

                {selectedLog.metadata.admin_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Admin Notes</Text>
                    <Text style={styles.detailDescription}>
                      {selectedLog.metadata.admin_notes}
                    </Text>
                  </View>
                )}

                {selectedLog.metadata.content_preview && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Content Preview</Text>
                    <Text style={styles.detailDescription}>
                      {selectedLog.metadata.content_preview}
                    </Text>
                  </View>
                )}

                {selectedLog.metadata.old_status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status Change</Text>
                    <Text style={styles.detailValue}>
                      {selectedLog.metadata.old_status} → {selectedLog.metadata.new_status}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedLog(null)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  unionInfo: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  unionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  unionSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    padding: 16,
    paddingBottom: 12,
  },
  logCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logDate: {
    fontSize: 12,
    color: '#64748b',
  },
  logDescription: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 12,
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailsLink: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  modalCloseButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
