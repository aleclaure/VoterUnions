import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';

interface CreateChannelModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, hashtag: string, description: string, isPublic: boolean) => Promise<void>;
  unionName: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  visible,
  onClose,
  onSubmit,
  unionName,
}) => {
  const [name, setName] = useState('');
  const [hashtag, setHashtag] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHashtagChange = (text: string) => {
    let formatted = text.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (formatted && !formatted.startsWith('#')) {
      formatted = '#' + formatted;
    }
    setHashtag(formatted);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !hashtag.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), hashtag.trim(), description.trim(), isPublic);
      setName('');
      setHashtag('');
      setDescription('');
      setIsPublic(true);
      onClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setHashtag('');
    setDescription('');
    setIsPublic(true);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Channel in {unionName}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Channel Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Housing Policy"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hashtag</Text>
              <TextInput
                style={styles.textInput}
                placeholder="#housing"
                placeholderTextColor="#94a3b8"
                value={hashtag}
                onChangeText={handleHashtagChange}
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                Use lowercase letters, numbers, and hyphens only
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What is this channel about?"
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.switchGroup}>
              <View>
                <Text style={styles.label}>Public Channel</Text>
                <Text style={styles.helperText}>
                  {isPublic
                    ? 'Anyone can see posts in this channel'
                    : 'Only union members can see posts'}
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={isPublic ? '#2563eb' : '#f1f5f9'}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!name.trim() || !hashtag.trim() || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!name.trim() || !hashtag.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Channel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  closeButton: {
    fontSize: 24,
    color: '#64748b',
    paddingLeft: 12,
  },
  scrollContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 80,
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
