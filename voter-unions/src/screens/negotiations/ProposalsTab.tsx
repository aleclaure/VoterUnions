import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useEmailVerificationGuard } from '../../hooks/useEmailVerificationGuard';
import { Demand, DemandComment } from '../../types';

export const ProposalsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { guardAction } = useEmailVerificationGuard();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'endorsement' | 'revision' | 'merge_suggestion'>('comment');

  const { data: drafts, isLoading } = useQuery({
    queryKey: ['demands-drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .eq('status', 'draft')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Demand[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['demand-comments', selectedDemand?.id],
    queryFn: async () => {
      if (!selectedDemand) return [];
      const { data, error } = await supabase
        .from('demand_comments')
        .select('*')
        .eq('demand_id', selectedDemand.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DemandComment[];
    },
    enabled: !!selectedDemand,
  });

  const createDemandMutation = useMutation({
    mutationFn: async (demand: { title: string; description: string; category: string }) => {
      // Email verification guard
      const allowed = await guardAction('CREATE_POST');
      if (!allowed) throw new Error('Email verification required');
      
      const { data, error } = await supabase
        .from('demands')
        .insert([
          {
            title: demand.title,
            description: demand.description,
            category: demand.category,
            status: 'draft',
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demands-drafts'] });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewCategory('');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: { demand_id: string; text: string; type: string }) => {
      const { data, error } = await supabase
        .from('demand_comments')
        .insert([
          {
            demand_id: comment.demand_id,
            user_id: user?.id,
            comment_text: comment.text,
            comment_type: comment.type,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['demand-comments', selectedDemand?.id] });
      await queryClient.refetchQueries({ queryKey: ['demand-comments', selectedDemand?.id] });
      setCommentText('');
    },
  });

  const submitToVotingMutation = useMutation({
    mutationFn: async (demandId: string) => {
      const { error } = await supabase
        .from('demands')
        .update({ status: 'voting' })
        .eq('id', demandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demands-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['demands-voting'] });
      setShowCommentsModal(false);
      Alert.alert('Success', 'Demand submitted to Voting Hall!');
    },
  });

  const handleCreateDemand = () => {
    if (!newTitle.trim() || !newDescription.trim() || !newCategory.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    createDemandMutation.mutate({
      title: newTitle,
      description: newDescription,
      category: newCategory,
    });
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedDemand) {
      Alert.alert('Error', 'Please enter comment text');
      return;
    }

    addCommentMutation.mutate({
      demand_id: selectedDemand.id,
      text: commentText,
      type: commentType,
    });
  };

  const renderDemand = ({ item }: { item: Demand }) => {
    return (
      <TouchableOpacity
        style={styles.demandCard}
        onPress={() => {
          setSelectedDemand(item);
          setShowCommentsModal(true);
        }}
      >
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.demandTitle}>{item.title}</Text>
        <Text style={styles.demandDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.tapText}>Tap to comment or submit to voting</Text>
      </TouchableOpacity>
    );
  };

  const renderComment = ({ item }: { item: DemandComment }) => {
    const getCommentIcon = () => {
      switch (item.comment_type) {
        case 'endorsement': return '👍';
        case 'revision': return '✏️';
        case 'merge_suggestion': return '🔗';
        default: return '💬';
      }
    };

    return (
      <View style={styles.commentCard}>
        <Text style={styles.commentIcon}>{getCommentIcon()}</Text>
        <View style={styles.commentContent}>
          <Text style={styles.commentType}>{item.comment_type.replace('_', ' ')}</Text>
          <Text style={styles.commentText}>{item.comment_text}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Drafting Floor</Text>
        <Text style={styles.headerSubtitle}>Submit demands in clear language</Text>
      </View>

      <FlatList
        data={drafts}
        renderItem={renderDemand}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No proposals yet. Create the first demand!</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Demand Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Demand</Text>

            <TextInput
              style={styles.input}
              placeholder="Category (e.g., Healthcare, Housing)"
              value={newCategory}
              onChangeText={setNewCategory}
            />

            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={6}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateDemand}
                disabled={createDemandMutation.isPending}
              >
                {createDemandMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedDemand?.title}</Text>
                <Text style={styles.modalSubtitle}>{selectedDemand?.description}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCommentsModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.commentTypeSelector}>
              {(['comment', 'endorsement', 'revision', 'merge_suggestion'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    commentType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setCommentType(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      commentType === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type === 'merge_suggestion' ? 'merge' : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.commentInput]}
              placeholder="Add your comment, endorsement, or suggestion..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.addCommentButton}
              onPress={handleAddComment}
              disabled={addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.addCommentButtonText}>Add Comment</Text>
              )}
            </TouchableOpacity>

            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              }
            />

            {selectedDemand?.created_by === user?.id && (
              <TouchableOpacity
                style={styles.submitVotingButton}
                onPress={() => submitToVotingMutation.mutate(selectedDemand.id)}
                disabled={submitToVotingMutation.isPending}
              >
                {submitToVotingMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitVotingButtonText}>Submit to Voting Hall →</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  demandCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  demandTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  demandDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  tapText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalContentLarge: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  commentTypeSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  typeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  commentInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addCommentButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addCommentButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  commentsList: {
    maxHeight: 200,
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    color: '#0f172a',
  },
  submitVotingButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  submitVotingButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#2563eb',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
