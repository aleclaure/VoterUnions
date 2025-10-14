import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StrikeOutcome, ActiveStrike } from '../../types';

export default function OutcomesSolidarityTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedStrike, setSelectedStrike] = useState<string>('');
  const [formData, setFormData] = useState({
    result_type: 'victory' as 'victory' | 'partial_victory' | 'ongoing' | 'ended' | 'defeated',
    achievements: '',
    settlement_details: '',
    workers_affected: '',
    pay_increase_percentage: '',
    new_policies: '',
    cross_industry_alliances: '',
    lessons_learned: '',
    strategy_notes: '',
  });

  const { data: outcomes = [], isLoading } = useQuery<StrikeOutcome[]>({
    queryKey: ['strike-outcomes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strike_outcomes')
        .select('*')
        .is('deleted_at', null)
        .order('outcome_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: myStrikes = [] } = useQuery<ActiveStrike[]>({
    queryKey: ['my-strikes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('active_strikes')
        .select('*')
        .eq('created_by', user.id)
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const recordOutcome = useMutation({
    mutationFn: async (outcome: typeof formData & { strike_id: string }) => {
      const policiesArray = outcome.new_policies
        ? outcome.new_policies.split('\n').filter(p => p.trim())
        : [];
      
      const alliancesArray = outcome.cross_industry_alliances
        ? outcome.cross_industry_alliances.split('\n').filter(a => a.trim())
        : [];

      const { data, error } = await supabase
        .from('strike_outcomes')
        .insert([{
          strike_id: outcome.strike_id,
          created_by: user?.id,
          result_type: outcome.result_type,
          achievements: outcome.achievements,
          settlement_details: outcome.settlement_details || null,
          workers_affected: outcome.workers_affected ? parseInt(outcome.workers_affected) : null,
          pay_increase_percentage: outcome.pay_increase_percentage ? parseFloat(outcome.pay_increase_percentage) : null,
          new_policies: policiesArray.length > 0 ? policiesArray : null,
          cross_industry_alliances: alliancesArray.length > 0 ? alliancesArray : null,
          lessons_learned: outcome.lessons_learned || null,
          strategy_notes: outcome.strategy_notes || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strike-outcomes'] });
      setFormData({
        result_type: 'victory',
        achievements: '',
        settlement_details: '',
        workers_affected: '',
        pay_increase_percentage: '',
        new_policies: '',
        cross_industry_alliances: '',
        lessons_learned: '',
        strategy_notes: '',
      });
      setSelectedStrike('');
      setShowForm(false);
      Alert.alert('Success', 'Outcome recorded! Building solidarity across industries.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to record outcome');
    },
  });

  const handleSubmit = () => {
    if (!selectedStrike || !formData.achievements.trim()) {
      Alert.alert('Error', 'Please select a strike and describe achievements');
      return;
    }
    recordOutcome.mutate({ ...formData, strike_id: selectedStrike });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading outcomes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {myStrikes.length > 0 && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowForm(!showForm)}
            >
              <Text style={styles.createButtonText}>
                {showForm ? '✕ Cancel' : '+ Record Outcome'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Record Strike Outcome</Text>

            <Text style={styles.label}>Select Strike *</Text>
            <View style={styles.pickerContainer}>
              {myStrikes.map((strike) => (
                <TouchableOpacity
                  key={strike.id}
                  style={[
                    styles.strikeOption,
                    selectedStrike === strike.id && styles.strikeOptionSelected
                  ]}
                  onPress={() => setSelectedStrike(strike.id)}
                >
                  <Text style={[
                    styles.strikeOptionText,
                    selectedStrike === strike.id && styles.strikeOptionTextSelected
                  ]}>
                    {strike.company_name} - {strike.strike_location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Result Type *</Text>
            <View style={styles.resultTypeRow}>
              {(['victory', 'partial_victory', 'ongoing', 'ended', 'defeated'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, formData.result_type === type && styles.typeButtonActive]}
                  onPress={() => setFormData({ ...formData, result_type: type })}
                >
                  <Text style={[styles.typeButtonText, formData.result_type === type && styles.typeButtonTextActive]}>
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Achievements *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.achievements}
              onChangeText={(text) => setFormData({ ...formData, achievements: text })}
              placeholder="What was won? (raises, policies, recognition...)"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Settlement Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.settlement_details}
              onChangeText={(text) => setFormData({ ...formData, settlement_details: text })}
              placeholder="Specific terms of settlement..."
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Workers Affected</Text>
            <TextInput
              style={styles.input}
              value={formData.workers_affected}
              onChangeText={(text) => setFormData({ ...formData, workers_affected: text })}
              placeholder="Number of workers impacted"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Pay Increase %</Text>
            <TextInput
              style={styles.input}
              value={formData.pay_increase_percentage}
              onChangeText={(text) => setFormData({ ...formData, pay_increase_percentage: text })}
              placeholder="e.g., 15.5"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>New Policies (one per line)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.new_policies}
              onChangeText={(text) => setFormData({ ...formData, new_policies: text })}
              placeholder="List new policies won..."
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Cross-Industry Alliances (one per line)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.cross_industry_alliances}
              onChangeText={(text) => setFormData({ ...formData, cross_industry_alliances: text })}
              placeholder="Allied industries/unions..."
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Lessons Learned</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.lessons_learned}
              onChangeText={(text) => setFormData({ ...formData, lessons_learned: text })}
              placeholder="What did we learn?"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Strategy Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.strategy_notes}
              onChangeText={(text) => setFormData({ ...formData, strategy_notes: text })}
              placeholder="What worked? What didn't?"
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Record Outcome</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.outcomesList}>
          {outcomes.map((outcome) => (
            <View key={outcome.id} style={styles.outcomeCard}>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{outcome.result_type.replace('_', ' ')}</Text>
              </View>
              
              <Text style={styles.outcomeAchievements}>{outcome.achievements}</Text>
              
              {outcome.workers_affected && (
                <Text style={styles.outcomeStat}>
                  👥 {outcome.workers_affected.toLocaleString()} workers affected
                </Text>
              )}
              
              {outcome.pay_increase_percentage && (
                <Text style={styles.outcomeStat}>
                  💰 {outcome.pay_increase_percentage}% pay increase
                </Text>
              )}

              {outcome.new_policies && outcome.new_policies.length > 0 && (
                <View style={styles.policiesSection}>
                  <Text style={styles.policiesTitle}>New Policies:</Text>
                  {outcome.new_policies.map((policy, idx) => (
                    <Text key={idx} style={styles.policyItem}>• {policy}</Text>
                  ))}
                </View>
              )}

              {outcome.cross_industry_alliances && outcome.cross_industry_alliances.length > 0 && (
                <View style={styles.alliancesSection}>
                  <Text style={styles.alliancesTitle}>Allied With:</Text>
                  {outcome.cross_industry_alliances.map((alliance, idx) => (
                    <Text key={idx} style={styles.allianceItem}>🤝 {alliance}</Text>
                  ))}
                </View>
              )}

              {outcome.lessons_learned && (
                <View style={styles.lessonsSection}>
                  <Text style={styles.lessonsTitle}>Lessons:</Text>
                  <Text style={styles.lessonsText}>{outcome.lessons_learned}</Text>
                </View>
              )}

              <Text style={styles.outcomeDate}>
                {new Date(outcome.outcome_date).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6b7280' },
  actionBar: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  createButton: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  textArea: { height: 80 },
  pickerContainer: { marginBottom: 8 },
  strikeOption: { padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  strikeOptionSelected: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  strikeOptionText: { fontSize: 14, color: '#374151' },
  strikeOptionTextSelected: { color: '#2563eb', fontWeight: '600' },
  resultTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#e5e7eb' },
  typeButtonActive: { backgroundColor: '#2563eb' },
  typeButtonText: { fontSize: 12, color: '#6b7280', fontWeight: '500', textTransform: 'capitalize' },
  typeButtonTextActive: { color: '#fff' },
  submitButton: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outcomesList: { padding: 16 },
  outcomeCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  resultBadge: { alignSelf: 'flex-start', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginBottom: 12 },
  resultBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  outcomeAchievements: { fontSize: 16, color: '#111827', fontWeight: '600', marginBottom: 12 },
  outcomeStat: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  policiesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  policiesTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  policyItem: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  alliancesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  alliancesTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  allianceItem: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  lessonsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  lessonsTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  lessonsText: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
  outcomeDate: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
});
