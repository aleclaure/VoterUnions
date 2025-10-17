import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { CorporateInfluence, CorporateInfluenceType } from '../../types';
import { stripHtml } from '../../lib/inputSanitization';

export default function CorporateInfluenceTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    corporation_name: '',
    influence_type: 'lobbying' as CorporateInfluenceType,
    title: '',
    description: '',
    amount_spent: '',
    year: '',
  });

  const { data: influences = [], isLoading } = useQuery({
    queryKey: ['corporate-influence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corporate_influence')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CorporateInfluence[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Sanitize inputs to prevent XSS attacks
      const sanitizedData = {
        corporation_name: stripHtml(data.corporation_name),
        influence_type: data.influence_type,
        title: stripHtml(data.title),
        description: stripHtml(data.description),
        amount_spent: data.amount_spent ? parseFloat(data.amount_spent) : null,
        year: data.year ? parseInt(data.year) : null,
      };
      
      const { error } = await supabase.from('corporate_influence').insert({
        ...sanitizedData,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-influence'] });
      setShowForm(false);
      setFormData({ corporation_name: '', influence_type: 'lobbying', title: '', description: '', amount_spent: '', year: '' });
    },
  });

  if (isLoading) return <View style={styles.container}><Text style={styles.loadingText}>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Corporate Influence</Text>
          <Text style={styles.headerSubtitle}>How corporations influence politics through lobbying and donations</Text>
        </View>

        {!showForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
            <Text style={styles.addButtonText}>+ New Report</Text>
          </TouchableOpacity>
        )}

        {showForm && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Corporation Name"
              value={formData.corporation_name}
              onChangeText={(text) => setFormData({ ...formData, corporation_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount Spent ($)"
              value={formData.amount_spent}
              onChangeText={(text) => setFormData({ ...formData, amount_spent: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Year"
              value={formData.year}
              onChangeText={(text) => setFormData({ ...formData, year: text })}
              keyboardType="numeric"
            />
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => createMutation.mutate(formData)}
                disabled={!formData.corporation_name || !formData.title || !formData.description}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {influences.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reports yet</Text>
            <Text style={styles.emptySubtext}>Be the first to expose corporate influence</Text>
          </View>
        ) : (
          influences.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.corporation}>{item.corporation_name}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
              {item.amount_spent && (
                <Text style={styles.amount}>${item.amount_spent.toLocaleString()} spent{item.year ? ` in ${item.year}` : ''}</Text>
              )}
              <Text style={styles.cardMeta}>{item.influence_type.replace('_', ' ')}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  addButton: { margin: 16, backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  formButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, padding: 12, borderRadius: 6, backgroundColor: '#2563eb', alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyState: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  card: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  corporation: { fontSize: 14, fontWeight: '600', color: '#2563eb', marginTop: 4 },
  cardDescription: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  amount: { fontSize: 16, fontWeight: '600', color: '#dc2626', marginTop: 8 },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 8, textTransform: 'capitalize' },
  loadingText: { textAlign: 'center', padding: 24, color: '#6b7280' },
});
