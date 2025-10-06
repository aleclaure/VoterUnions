import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { Union } from '../types';

interface UnionMemberData {
  unions: Union;
}

export const CreateDebateScreen = ({ navigation }: {navigation: any}) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueArea, setIssueArea] = useState('');
  const [selectedUnionId, setSelectedUnionId] = useState<string>('');

  const { data: unionData } = useQuery<UnionMemberData[]>({
    queryKey: ['user-unions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('union_members')
        .select('unions(*)')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data as unknown as UnionMemberData[];
    },
    enabled: !!user,
  });

  const unions = unionData?.map((item) => item.unions);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('debates')
        .insert({
          union_id: selectedUnionId,
          title,
          description,
          issue_area: issueArea,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debates'] });
      Alert.alert('Success', 'Debate created successfully!');
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a debate title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!issueArea.trim()) {
      Alert.alert('Error', 'Please enter an issue area');
      return;
    }
    if (!selectedUnionId) {
      Alert.alert('Error', 'Please select a union');
      return;
    }
    createMutation.mutate();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Debate</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Union</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unionSelector}>
            {unions?.map((union) => (
              <TouchableOpacity
                key={union.id}
                style={[
                  styles.unionOption,
                  selectedUnionId === union.id && styles.unionOptionSelected,
                ]}
                onPress={() => setSelectedUnionId(union.id)}
              >
                <Text
                  style={[
                    styles.unionOptionText,
                    selectedUnionId === union.id && styles.unionOptionTextSelected,
                  ]}
                >
                  {union.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Issue Area</Text>
          <TextInput
            style={styles.input}
            value={issueArea}
            onChangeText={setIssueArea}
            placeholder="e.g., Climate, Housing, Labor Rights"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Debate Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What should we debate?"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Provide context and framing for this debate..."
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createMutation.isPending ? 'Creating...' : 'Create Debate'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  unionSelector: {
    flexDirection: 'row',
  },
  unionOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  unionOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  unionOptionText: {
    color: '#64748b',
    fontSize: 14,
  },
  unionOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
});
