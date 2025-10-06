import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { Argument, Stance } from '../types';

export const DebateDetailScreen = ({ route, navigation }: any) => {
  const { debateId } = route.params;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [argumentContent, setArgumentContent] = useState('');
  const [selectedStance, setSelectedStance] = useState<Stance>('neutral');

  const { data: debate } = useQuery({
    queryKey: ['debate', debateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debates')
        .select('*, unions(name)')
        .eq('id', debateId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: debateArguments } = useQuery({
    queryKey: ['arguments', debateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arguments')
        .select('*')
        .eq('debate_id', debateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Argument[];
    },
  });

  const createArgumentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('arguments')
        .insert({
          debate_id: debateId,
          user_id: user?.id,
          stance: selectedStance,
          content: argumentContent,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arguments', debateId] });
      setArgumentContent('');
      setSelectedStance('neutral');
      Alert.alert('Success', 'Argument added!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmitArgument = () => {
    if (!argumentContent.trim()) {
      Alert.alert('Error', 'Please enter your argument');
      return;
    }
    createArgumentMutation.mutate();
  };

  const getStanceColor = (stance: Stance) => {
    switch (stance) {
      case 'pro':
        return '#16a34a';
      case 'con':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  const getStanceBgColor = (stance: Stance) => {
    switch (stance) {
      case 'pro':
        return '#dcfce7';
      case 'con':
        return '#fee2e2';
      default:
        return '#f1f5f9';
    }
  };

  const renderArgument = ({ item }: { item: Argument }) => (
    <View style={styles.argumentCard}>
      <View style={[styles.stanceBadge, { backgroundColor: getStanceBgColor(item.stance) }]}>
        <Text style={[styles.stanceText, { color: getStanceColor(item.stance) }]}>
          {item.stance.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.argumentContent}>{item.content}</Text>
      <Text style={styles.argumentMeta}>{item.reaction_count} reactions</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {debate && (
          <View style={styles.debateInfo}>
            <View style={styles.issueTag}>
              <Text style={styles.issueText}>{debate.issue_area}</Text>
            </View>
            <Text style={styles.title}>{debate.title}</Text>
            <Text style={styles.description}>{debate.description}</Text>
            <Text style={styles.unionName}>{debate.unions?.name}</Text>
          </View>
        )}

        <View style={styles.addArgument}>
          <Text style={styles.sectionTitle}>Add Your Argument</Text>
          
          <View style={styles.stanceSelector}>
            {(['pro', 'con', 'neutral'] as Stance[]).map((stance) => (
              <TouchableOpacity
                key={stance}
                style={[
                  styles.stanceButton,
                  selectedStance === stance && { backgroundColor: getStanceBgColor(stance) },
                ]}
                onPress={() => setSelectedStance(stance)}
              >
                <Text
                  style={[
                    styles.stanceButtonText,
                    selectedStance === stance && { color: getStanceColor(stance), fontWeight: '600' },
                  ]}
                >
                  {stance.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.argumentInput}
            value={argumentContent}
            onChangeText={setArgumentContent}
            placeholder="Present your argument..."
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.submitButton, createArgumentMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmitArgument}
            disabled={createArgumentMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {createArgumentMutation.isPending ? 'Submitting...' : 'Submit Argument'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.argumentsSection}>
          <Text style={styles.sectionTitle}>Arguments ({debateArguments?.length || 0})</Text>
          <FlatList
            data={debateArguments}
            renderItem={renderArgument}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No arguments yet. Be the first!</Text>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  debateInfo: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  issueTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 12,
  },
  unionName: {
    fontSize: 14,
    color: '#94a3b8',
  },
  addArgument: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  stanceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stanceButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  stanceButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  argumentInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  argumentsSection: {
    padding: 20,
    marginTop: 8,
  },
  argumentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  stanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  argumentContent: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 12,
  },
  argumentMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
  },
});
