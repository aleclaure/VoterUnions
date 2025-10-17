import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, Modal, ScrollView, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { downloadUserData } from '../services/dataExport';

export const DataExportButton: React.FC = () => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [exportedData, setExportedData] = useState<string | null>(null);

  const handleExport = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to export your data.');
      return;
    }

    Alert.alert(
      'Export Your Data',
      'This will download all your data as a JSON file. This may take a few moments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setIsExporting(true);
            try {
              const result = await downloadUserData(user.id);
              
              if (result.shared) {
                Alert.alert(
                  'Success',
                  'Your data has been exported successfully. The file has been saved and you can share it with other apps.',
                  [{ text: 'OK' }]
                );
              } else {
                // Fallback: Show full data in modal for copying (sharing unavailable)
                const dataJson = result.data 
                  ? JSON.stringify(result.data, null, 2)
                  : '';
                setExportedData(dataJson);
                setShowDataModal(true);
              }
            } catch (error: any) {
              console.error('Data export error:', error);
              Alert.alert(
                'Export Failed',
                error.message || 'Failed to export your data. Please try again. If the problem persists, contact support.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsExporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>📥 Export My Data (GDPR)</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showDataModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDataModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your Data Export</Text>
            <Text style={styles.modalDescription}>
              File sharing is not available on this platform. You can copy the JSON data below and
              save it manually.
            </Text>

            <ScrollView style={styles.jsonContainer}>
              <Text style={styles.jsonText} selectable>
                {exportedData}
              </Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => {
                  setShowDataModal(false);
                  setExportedData(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '90%',
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
    lineHeight: 20,
  },
  jsonContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
    marginBottom: 16,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#333',
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#6b7280',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
