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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PlatformSection, PlatformAmendment, AmendmentVote } from '../../types';

export const PlatformTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAmendmentsModal, setShowAmendmentsModal] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<PlatformSection | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newIssueArea, setNewIssueArea] = useState('');
  const [amendmentText, setAmendmentText] = useState('');
  const [amendmentRationale, setAmendmentRationale] = useState('');

  const { data: sections, isLoading } = useQuery({
    queryKey: ['platform-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_sections')
        .select('*')
        .is('deleted_at', null)
        .order('section_order', { ascending: true });

      if (error) throw error;
      return data as PlatformSection[];
    },
  });

  const { data: amendments } = useQuery({
    queryKey: ['platform-amendments', selectedSection?.id],
    queryFn: async () => {
      if (!selectedSection) return [];
      const { data, error } = await supabase
        .from('platform_amendments')
        .select('*')
        .eq('section_id', selectedSection.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlatformAmendment[];
    },
    enabled: !!selectedSection,
  });

  const { data: userVotes } = useQuery({
    queryKey: ['amendment-votes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('amendment_votes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as AmendmentVote[];
    },
    enabled: !!user,
  });

  const createSectionMutation = useMutation({
    mutationFn: async (section: { title: string; content: string; issue_area: string }) => {
      const maxOrder = sections?.length || 0;
      const { data, error } = await supabase
        .from('platform_sections')
        .insert([
          {
            title: section.title,
            content: section.content,
            issue_area: section.issue_area,
            section_order: maxOrder + 1,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-sections'] });
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setNewIssueArea('');
    },
  });

  const proposeAmendmentMutation = useMutation({
    mutationFn: async (amendment: { section_id: string; text: string; rationale: string }) => {
      const { data, error } = await supabase
        .from('platform_amendments')
        .insert([
          {
            section_id: amendment.section_id,
            user_id: user?.id,
            proposed_text: amendment.text,
            rationale: amendment.rationale,
            status: 'proposed',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-amendments'] });
      setShowProposeModal(false);
      setAmendmentText('');
      setAmendmentRationale('');
    },
  });

  const voteAmendmentMutation = useMutation({
    mutationFn: async ({
      amendmentId,
      voteType,
    }: {
      amendmentId: string;
      voteType: 'for' | 'against';
    }) => {
      const existingVote = userVotes?.find((v) => v.amendment_id === amendmentId);

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from('amendment_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('amendment_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('amendment_votes').insert([
          {
            amendment_id: amendmentId,
            user_id: user?.id,
            vote_type: voteType,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      // Invalidate both votes and amendments with proper query keys
      await queryClient.invalidateQueries({ queryKey: ['amendment-votes', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['platform-amendments', selectedSection?.id] });
      // Re-fetch amendments immediately to show updated counts
      await queryClient.refetchQueries({ queryKey: ['platform-amendments', selectedSection?.id] });
    },
  });

  const handleCreateSection = () => {
    if (!newTitle.trim() || !newContent.trim() || !newIssueArea.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    createSectionMutation.mutate({
      title: newTitle,
      content: newContent,
      issue_area: newIssueArea,
    });
  };

  const handleProposeAmendment = () => {
    if (!amendmentText.trim() || !selectedSection) {
      Alert.alert('Error', 'Please enter amendment text');
      return;
    }

    proposeAmendmentMutation.mutate({
      section_id: selectedSection.id,
      text: amendmentText,
      rationale: amendmentRationale,
    });
  };

  const getUserVote = (amendmentId: string) => {
    return userVotes?.find((v) => v.amendment_id === amendmentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
        return '#94a3b8';
      case 'accepted':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const renderSection = ({ item }: { item: PlatformSection }) => {
    return (
      <TouchableOpacity
        style={styles.sectionCard}
        onPress={() => {
          setSelectedSection(item);
          setShowAmendmentsModal(true);
        }}
      >
        <Text style={styles.issueArea}>{item.issue_area}</Text>
        <Text style={styles.sectionTitle}>{item.title}</Text>
        <Text style={styles.sectionContent} numberOfLines={3}>
          {item.content}
        </Text>
        <Text style={styles.amendText}>Tap to view/propose amendments</Text>
      </TouchableOpacity>
    );
  };

  const renderAmendment = ({ item }: { item: PlatformAmendment }) => {
    const userVote = getUserVote(item.id);

    return (
      <View style={styles.amendmentCard}>
        <View style={styles.amendmentHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
          <View style={styles.voteCount}>
            <Text style={styles.voteCountText}>
              {item.votes_for} for / {item.votes_against} against
            </Text>
          </View>
        </View>
        <Text style={styles.amendmentText}>{item.proposed_text}</Text>
        {item.rationale && (
          <Text style={styles.amendmentRationale}>Rationale: {item.rationale}</Text>
        )}
        {item.status === 'proposed' && (
          <View style={styles.voteButtons}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                userVote?.vote_type === 'for' && styles.voteForActive,
              ]}
              onPress={() =>
                voteAmendmentMutation.mutate({ amendmentId: item.id, voteType: 'for' })
              }
            >
              <Text
                style={[
                  styles.voteButtonText,
                  userVote?.vote_type === 'for' && styles.voteButtonTextActive,
                ]}
              >
                👍 For
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.voteButton,
                userVote?.vote_type === 'against' && styles.voteAgainstActive,
              ]}
              onPress={() =>
                voteAmendmentMutation.mutate({ amendmentId: item.id, voteType: 'against' })
              }
            >
              <Text
                style={[
                  styles.voteButtonText,
                  userVote?.vote_type === 'against' && styles.voteButtonTextActive,
                ]}
              >
                👎 Against
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
        <Text style={styles.headerTitle}>The People's Platform</Text>
        <Text style={styles.headerSubtitle}>Build our shared vision</Text>
      </View>

      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No platform sections yet. Add the first one!</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Section Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Platform Section</Text>

            <TextInput
              style={styles.input}
              placeholder="Issue Area (e.g., Healthcare, Housing)"
              value={newIssueArea}
              onChangeText={setNewIssueArea}
            />

            <TextInput
              style={styles.input}
              placeholder="Section Title"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Section Content"
              value={newContent}
              onChangeText={setNewContent}
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
                onPress={handleCreateSection}
                disabled={createSectionMutation.isPending}
              >
                {createSectionMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Add Section</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Amendments Modal */}
      <Modal visible={showAmendmentsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSection?.title}</Text>
                <Text style={styles.modalSubtitle}>{selectedSection?.content}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAmendmentsModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.amendmentsHeader}>
              <Text style={styles.amendmentsTitle}>Proposed Amendments</Text>
              <TouchableOpacity
                style={styles.proposeButton}
                onPress={() => {
                  setShowAmendmentsModal(false);
                  setShowProposeModal(true);
                }}
              >
                <Text style={styles.proposeButtonText}>+ Propose</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={amendments}
              renderItem={renderAmendment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.amendmentsList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No amendments yet. Be the first to propose one!</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Propose Amendment Modal */}
      <Modal visible={showProposeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Propose Amendment</Text>
            <Text style={styles.modalSubtitle}>To: {selectedSection?.title}</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Proposed text"
              value={amendmentText}
              onChangeText={setAmendmentText}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Rationale (optional)"
              value={amendmentRationale}
              onChangeText={setAmendmentRationale}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowProposeModal(false);
                  setAmendmentText('');
                  setAmendmentRationale('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleProposeAmendment}
                disabled={proposeAmendmentMutation.isPending}
              >
                {proposeAmendmentMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Propose</Text>
                )}
              </TouchableOpacity>
            </View>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  issueArea: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  amendText: {
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 14,
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
  amendmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amendmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  proposeButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  proposeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  amendmentsList: {
    paddingBottom: 16,
  },
  amendmentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amendmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  voteCount: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  voteCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  amendmentText: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 6,
  },
  amendmentRationale: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  voteForActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  voteAgainstActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  voteButtonTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
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
