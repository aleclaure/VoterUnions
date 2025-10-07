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
import { Channel, Union } from '../types';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, channelIds: string[], isPublic: boolean) => Promise<void>;
  channels: Channel[];
  unionName: string;
  myUnions?: Union[];
  onMultiUnionSubmit?: (content: string, unionChannelMap: { unionId: string; channelIds: string[] }[], isPublic: boolean) => Promise<void>;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  channels,
  unionName,
  myUnions,
  onMultiUnionSubmit,
}) => {
  const [content, setContent] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedUnionIds, setSelectedUnionIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnionDropdown, setShowUnionDropdown] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  const handleUnionToggle = (unionId: string) => {
    setSelectedUnionIds((prev) =>
      prev.includes(unionId)
        ? prev.filter((id) => id !== unionId)
        : [...prev, unionId]
    );
  };

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
      if (myUnions && selectedUnionIds.length > 0 && onMultiUnionSubmit) {
        const unionChannelMap = selectedUnionIds.map(unionId => ({
          unionId,
          channelIds: selectedChannels.filter(cid => 
            channels.find(ch => ch.id === cid && ch.union_id === unionId)
          ),
        }));
        await onMultiUnionSubmit(content.trim(), unionChannelMap, isPublic);
      } else {
        await onSubmit(content.trim(), selectedChannels, isPublic);
      }
      setContent('');
      setSelectedChannels([]);
      setSelectedUnionIds([]);
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
    setSelectedUnionIds([]);
    setIsPublic(true);
    setShowUnionDropdown(false);
    setShowChannelDropdown(false);
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

            {myUnions && myUnions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Post to Unions</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger}
                  onPress={() => setShowUnionDropdown(!showUnionDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedUnionIds.length > 0 
                      ? `${selectedUnionIds.length} union(s) selected` 
                      : 'Select unions'}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showUnionDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showUnionDropdown && (
                  <View style={styles.dropdownList}>
                    {myUnions.map((union) => (
                      <TouchableOpacity
                        key={union.id}
                        style={styles.dropdownItem}
                        onPress={() => handleUnionToggle(union.id)}
                      >
                        <View style={styles.checkbox}>
                          {selectedUnionIds.includes(union.id) && (
                            <View style={styles.checkboxFilled} />
                          )}
                        </View>
                        <Text style={styles.dropdownItemText}>{union.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {channels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Post to Channels (optional)</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger}
                  onPress={() => setShowChannelDropdown(!showChannelDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedChannels.length > 0 
                      ? `${selectedChannels.length} channel(s) selected` 
                      : 'Select channels'}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showChannelDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showChannelDropdown && (
                  <View style={styles.dropdownList}>
                    {channels.map((channel) => (
                      <TouchableOpacity
                        key={channel.id}
                        style={styles.dropdownItem}
                        onPress={() => handleChannelToggle(channel.id)}
                      >
                        <View style={styles.checkbox}>
                          {selectedChannels.includes(channel.id) && (
                            <View style={styles.checkboxFilled} />
                          )}
                        </View>
                        <Text style={styles.dropdownItemText}>{channel.hashtag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '70%',
    width: '90%',
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: '#1e293b',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 150,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1e293b',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxFilled: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#2563eb',
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
