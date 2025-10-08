import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/authStore';

export const CreateDebateScreen = ({ route, navigation }: any) => {
  const { unionId } = route.params;
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueArea, setIssueArea] = useState('');

  const createDebateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to create a debate.');
      if (!title.trim() || !description.trim() || !issueArea.trim()) {
        throw new Error('Please fill out all fields.');
      }

      const { data, error } = await supabase
        .from('debates')
        .insert({
          union_id: unionId,
          created_by: user.id,
          title: title.trim(),
          description: description.trim(),
          issue_area: issueArea.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debates', unionId] });
      Alert.alert('Success', 'Your debate has been created!');
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.form}>
        <Text style={styles.title}>Start a New Debate</Text>
        <TextInput
          style={styles.input}
          placeholder="Debate Title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What's the issue?"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Issue Area (e.g., Healthcare, Environment)"
          value={issueArea}
          onChangeText={setIssueArea}
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => createDebateMutation.mutate()}
          disabled={createDebateMutation.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createDebateMutation.isPending ? 'Creating...' : 'Create Debate'}
          </Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e293b',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});