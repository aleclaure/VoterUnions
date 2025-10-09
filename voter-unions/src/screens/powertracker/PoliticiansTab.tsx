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
import { usePowerPoliticians, useCreatePolitician } from '../../hooks/usePowerPoliticians';
import { useAuth } from '../../hooks/useAuth';
import { PowerPolitician } from '../../types';

export const PoliticiansTab = () => {
  const { user } = useAuth();
  const { data: politicians, isLoading } = usePowerPoliticians();
  const createPolitician = useCreatePolitician();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPolitician, setSelectedPolitician] = useState<PowerPolitician | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    office: '',
    party: '',
    state: '',
    bio: '',
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.office) {
      Alert.alert('Error', 'Name and Office are required');
      return;
    }

    try {
      await createPolitician.mutateAsync({
        ...formData,
        created_by: user?.id || '',
      });
      setShowAddModal(false);
      setFormData({ name: '', office: '', party: '', state: '', bio: '' });
      Alert.alert('Success', 'Politician added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create politician');
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
          <Text style={styles.title}>Politicians</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {politicians && politicians.length > 0 ? (
          politicians.map((politician) => (
            <TouchableOpacity
              key={politician.id}
              style={styles.card}
              onPress={() => setSelectedPolitician(politician)}
            >
              <Text style={styles.politicianName}>{politician.name}</Text>
              <Text style={styles.politicianOffice}>{politician.office}</Text>
              {politician.party && (
                <Text style={styles.politicianParty}>{politician.party}</Text>
              )}
              {politician.state && (
                <Text style={styles.politicianState}>{politician.state}</Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No politicians added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Add button to create your first politician profile
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Politician Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Politician</Text>

            <TextInput
              style={styles.input}
              placeholder="Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Office/Position *"
              value={formData.office}
              onChangeText={(text) => setFormData({ ...formData, office: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Party (optional)"
              value={formData.party}
              onChangeText={(text) => setFormData({ ...formData, party: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="State (optional)"
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Bio (optional)"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              multiline
              numberOfLines={4}
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
                disabled={createPolitician.isPending}
              >
                <Text style={styles.createButtonText}>
                  {createPolitician.isPending ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Politician Detail Modal */}
      <Modal
        visible={!!selectedPolitician}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedPolitician(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPolitician && (
              <>
                <Text style={styles.detailName}>{selectedPolitician.name}</Text>
                <Text style={styles.detailOffice}>{selectedPolitician.office}</Text>
                {selectedPolitician.party && (
                  <Text style={styles.detailInfo}>
                    Party: {selectedPolitician.party}
                  </Text>
                )}
                {selectedPolitician.state && (
                  <Text style={styles.detailInfo}>
                    State: {selectedPolitician.state}
                  </Text>
                )}
                {selectedPolitician.bio && (
                  <Text style={styles.detailBio}>{selectedPolitician.bio}</Text>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, styles.closeButton]}
                  onPress={() => setSelectedPolitician(null)}
                >
                  <Text style={styles.createButtonText}>Close</Text>
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
  politicianName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  politicianOffice: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  politicianParty: {
    fontSize: 12,
    color: '#94a3b8',
  },
  politicianState: {
    fontSize: 12,
    color: '#94a3b8',
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
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  detailOffice: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  detailInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  detailBio: {
    fontSize: 14,
    color: '#1e293b',
    marginTop: 12,
    lineHeight: 20,
  },
});
