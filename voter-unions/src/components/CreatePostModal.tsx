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
} from 'react-native';
import { Channel } from '../types';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, channelIds: string[], isPublic: boolean) => Promise<void>;
  channels: Channel[];
  unionName: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  channels,
  unionName,
}) => {
  const [content, setContent] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), selectedChannels, isPublic);
      setContent('');
      setSelectedChannels([]);
      setIsPublic(true);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setSelectedChannels([]);
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
            <Text style={styles.title}>Create Post in {unionName}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#94a3b8"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.visibilitySection}>
              <Text style={styles.sectionTitle}>Visibility</Text>
              <View style={styles.visibilityButtons}>
                <TouchableOpacity
                  style={[
                    styles.visibilityButton,
                    isPublic && styles.visibilityButtonActive,
                  ]}
                  onPress={() => setIsPublic(true)}
                >
                  <Text
                    style={[
                      styles.visibilityButtonText,
                      isPublic && styles.visibilityButtonTextActive,
                    ]}
                  >
                    Public
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.visibilityButton,
                    !isPublic && styles.visibilityButtonActive,
                  ]}
                  onPress={() => setIsPublic(false)}
                >
                  <Text
                    style={[
                      styles.visibilityButtonText,
                      !isPublic && styles.visibilityButtonTextActive,
                    ]}
                  >
                    Members Only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {channels.length > 0 && (
              <View style={styles.channelsSection}>
                <Text style={styles.sectionTitle}>Post to Channels (optional)</Text>
                <View style={styles.channelsList}>
                  {channels.map((channel) => (
                    <TouchableOpacity
                      key={channel.id}
                      style={[
                        styles.channelChip,
                        selectedChannels.includes(channel.id) && styles.channelChipSelected,
                      ]}
                      onPress={() => handleChannelToggle(channel.id)}
                    >
                      <Text
                        style={[
                          styles.channelChipText,
                          selectedChannels.includes(channel.id) && styles.channelChipTextSelected,
                        ]}
                      >
                        {channel.hashtag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, (!content.trim() || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Post</Text>
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
    maxHeight: '90%',
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
  },
  closeButton: {
    fontSize: 24,
    color: '#64748b',
  },
  scrollContent: {
    padding: 16,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 120,
    marginBottom: 16,
  },
  visibilitySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  visibilityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  visibilityButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  visibilityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  visibilityButtonTextActive: {
    color: '#fff',
  },
  channelsSection: {
    marginBottom: 16,
  },
  channelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  channelChipSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  channelChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  channelChipTextSelected: {
    color: '#2563eb',
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
