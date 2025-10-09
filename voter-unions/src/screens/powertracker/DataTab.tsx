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
  Image,
} from 'react-native';
import { usePowerGraphics, useCreateGraphic } from '../../hooks/usePowerGraphics';
import { useAuth } from '../../hooks/useAuth';
import { PowerGraphic, GraphicCategory } from '../../types';

export const DataTab = () => {
  const { user } = useAuth();
  const { data: graphics, isLoading } = usePowerGraphics();
  const createGraphic = useCreateGraphic();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGraphic, setSelectedGraphic] = useState<PowerGraphic | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    category: 'wealth_inequality' as GraphicCategory,
    source_link: '',
  });

  const handleCreate = async () => {
    if (!formData.title || !formData.image_url) {
      Alert.alert('Error', 'Title and Image URL are required');
      return;
    }

    try {
      await createGraphic.mutateAsync({
        ...formData,
        created_by: user?.id || '',
      });
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        category: 'wealth_inequality',
        source_link: '',
      });
      Alert.alert('Success', 'Graphic added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create graphic');
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
          <Text style={styles.title}>Data & Graphics</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {graphics && graphics.length > 0 ? (
          <View style={styles.grid}>
            {graphics.map((graphic) => (
              <TouchableOpacity
                key={graphic.id}
                style={styles.card}
                onPress={() => setSelectedGraphic(graphic)}
              >
                {graphic.image_url && (
                  <Image
                    source={{ uri: graphic.image_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.graphicTitle} numberOfLines={2}>
                    {graphic.title}
                  </Text>
                  <Text style={styles.graphicCategory}>
                    {graphic.category.replace('_', ' ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No graphics added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Add button to upload your first infographic
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Graphic Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Graphic</Text>

              <TextInput
                style={styles.input}
                placeholder="Title *"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Image URL *"
                value={formData.image_url}
                onChangeText={(text) =>
                  setFormData({ ...formData, image_url: text })
                }
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryButtons}>
                {[
                  'wealth_inequality',
                  'tax_avoidance',
                  'corporate_power',
                  'campaign_finance',
                  'other',
                ].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      formData.category === category && styles.categoryButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category: category as GraphicCategory })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        formData.category === category &&
                          styles.categoryButtonTextActive,
                      ]}
                    >
                      {category.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                  disabled={createGraphic.isPending}
                >
                  <Text style={styles.createButtonText}>
                    {createGraphic.isPending ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Graphic Detail Modal */}
      <Modal
        visible={!!selectedGraphic}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedGraphic(null)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              {selectedGraphic && (
                <>
                  {selectedGraphic.image_url && (
                    <Image
                      source={{ uri: selectedGraphic.image_url }}
                      style={styles.detailImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.detailTitle}>{selectedGraphic.title}</Text>
                  <Text style={styles.detailCategory}>
                    {selectedGraphic.category.replace('_', ' ')}
                  </Text>
                  {selectedGraphic.description && (
                    <Text style={styles.detailDescription}>
                      {selectedGraphic.description}
                    </Text>
                  )}
                  {selectedGraphic.source_link && (
                    <>
                      <Text style={styles.sectionTitle}>Source</Text>
                      <Text style={styles.linkText}>{selectedGraphic.source_link}</Text>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, styles.closeButton]}
                    onPress={() => setSelectedGraphic(null)}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#ffffff',
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f5f9',
  },
  cardContent: {
    padding: 12,
  },
  graphicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  graphicCategory: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'capitalize',
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
    height: 80,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  categoryButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  categoryButtonTextActive: {
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
  detailImage: {
    width: '100%',
    height: 250,
    marginBottom: 16,
    borderRadius: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  detailCategory: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});
