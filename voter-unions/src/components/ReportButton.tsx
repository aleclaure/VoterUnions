import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Modal, TextInput } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useCreateReport } from '../hooks/useReports';
import { ReportContentType } from '../types';

interface ReportButtonProps {
  contentType: ReportContentType;
  contentId: string;
  style?: any;
}

export const ReportButton: React.FC<ReportButtonProps> = ({ contentType, contentId, style }) => {
  const { user } = useAuth();
  const createReport = useCreateReport();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to report content.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for reporting this content.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport.mutateAsync({
        contentType,
        contentId,
        reason: reason.trim(),
        userId: user.id,
      });

      setShowModal(false);
      setReason('');
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this content. Union moderators will review it shortly.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Report Failed',
        error.message || 'Failed to submit report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={[styles.button, style]}
      >
        <Text style={styles.buttonText}>⚠️ Report</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Content</Text>
            <Text style={styles.modalDescription}>
              Please explain why this content violates community guidelines:
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Reason for reporting..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setReason('');
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleReport}
                disabled={isSubmitting || !reason.trim()}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#dc2626',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
