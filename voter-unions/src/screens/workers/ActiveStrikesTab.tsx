import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ActiveStrike, StrikePledge, StrikeUpdate } from '../../types';

export default function ActiveStrikesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStrike, setSelectedStrike] = useState<string | null>(null);
  const [updateContent, setUpdateContent] = useState('');
  const [updateType, setUpdateType] = useState<'news' | 'solidarity' | 'negotiation' | 'victory'>('news');

  const { data: strikes = [], isLoading } = useQuery<ActiveStrike[]>({
    queryKey: ['active-strikes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_strikes')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: myPledges = [] } = useQuery<StrikePledge[]>({
    queryKey: ['my-strike-pledges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('strike_pledges')
        .select('*')
        .eq('worker_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: updates = [] } = useQuery<StrikeUpdate[]>({
    queryKey: ['strike-updates', selectedStrike],
    queryFn: async () => {
      if (!selectedStrike) return [];
      const { data, error } = await supabase
        .from('strike_updates')
        .select('*')
        .eq('strike_id', selectedStrike)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedStrike,
  });

  const makePledge = useMutation({
    mutationFn: async ({ strikeId, pledgeType }: { strikeId: string; pledgeType: 'participate' | 'support' | 'donate' | 'spread_word' }) => {
      const { data, error } = await supabase
        .from('strike_pledges')
        .upsert({
          strike_id: strikeId,
          worker_id: user?.id,
          pledge_type: pledgeType,
          anonymous: false,
        }, {
          onConflict: 'strike_id,worker_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-strikes'] });
      queryClient.invalidateQueries({ queryKey: ['my-strike-pledges'] });
      Alert.alert('Success', 'Your pledge has been recorded!');
    },
  });

  const postUpdate = useMutation({
    mutationFn: async () => {
      if (!selectedStrike || !updateContent.trim()) {
        throw new Error('Please enter update content');
      }

      const { data, error } = await supabase
        .from('strike_updates')
        .insert([{
          strike_id: selectedStrike,
          posted_by: user?.id,
          update_type: updateType,
          content: updateContent,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strike-updates'] });
      setUpdateContent('');
      Alert.alert('Success', 'Update posted to strike feed!');
    },
  });

  const hasPledged = (strikeId: string) => {
    return myPledges.some(p => p.strike_id === strikeId);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading strikes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Active Strikes</Text>
          <Text style={styles.headerSubtitle}>When we stop working, they start listening.</Text>
        </View>

        <View style={styles.strikesList}>
          {strikes.map((strike) => {
            const pledged = hasPledged(strike.id);
            const isSelected = selectedStrike === strike.id;

            return (
              <View key={strike.id} style={styles.strikeCard}>
                <TouchableOpacity onPress={() => setSelectedStrike(isSelected ? null : strike.id)}>
                  <Text style={styles.strikeTitle}>{strike.company_name} Strike</Text>
                  <Text style={styles.strikeMeta}>
                    📍 {strike.strike_location} · Status: {strike.negotiation_status.replace('_', ' ')}
                  </Text>
                  <Text style={styles.strikeDemands} numberOfLines={2}>{strike.current_demands}</Text>
                  
                  <View style={styles.strikeStats}>
                    <Text style={styles.statText}>👥 {strike.pledge_count} pledges</Text>
                    <Text style={styles.statText}>📢 {strike.update_count} updates</Text>
                  </View>

                  {!pledged && (
                    <View style={styles.pledgeButtons}>
                      <TouchableOpacity
                        style={[styles.pledgeButton, styles.participateButton]}
                        onPress={() => makePledge.mutate({ strikeId: strike.id, pledgeType: 'participate' })}
                      >
                        <Text style={styles.pledgeButtonText}>✊ Participate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pledgeButton, styles.supportButton]}
                        onPress={() => makePledge.mutate({ strikeId: strike.id, pledgeType: 'support' })}
                      >
                        <Text style={styles.pledgeButtonText}>🤝 Support</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {pledged && (
                    <Text style={styles.pledgedText}>✓ You've pledged support</Text>
                  )}
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.updatesSection}>
                    <Text style={styles.updatesTitle}>Strike Updates</Text>
                    
                    <View style={styles.postUpdateForm}>
                      <TextInput
                        style={styles.updateInput}
                        value={updateContent}
                        onChangeText={setUpdateContent}
                        placeholder="Post an update, photo, or solidarity message..."
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.updateTypeRow}>
                        {(['news', 'solidarity', 'negotiation', 'victory'] as const).map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[styles.typeButton, updateType === type && styles.typeButtonActive]}
                            onPress={() => setUpdateType(type)}
                          >
                            <Text style={[styles.typeButtonText, updateType === type && styles.typeButtonTextActive]}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity style={styles.postButton} onPress={() => postUpdate.mutate()}>
                        <Text style={styles.postButtonText}>Post Update</Text>
                      </TouchableOpacity>
                    </View>

                    {updates.map((update) => (
                      <View key={update.id} style={styles.updateCard}>
                        <Text style={styles.updateType}>{update.update_type}</Text>
                        <Text style={styles.updateContent}>{update.content}</Text>
                        <Text style={styles.updateTime}>
                          {new Date(update.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
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
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6b7280' },
  strikesList: { padding: 16 },
  strikeCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  strikeTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  strikeMeta: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  strikeDemands: { fontSize: 14, color: '#374151', marginBottom: 12 },
  strikeStats: { flexDirection: 'row', gap: 16, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  statText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  pledgeButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pledgeButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  participateButton: { backgroundColor: '#dc2626' },
  supportButton: { backgroundColor: '#2563eb' },
  pledgeButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pledgedText: { fontSize: 14, color: '#10b981', fontWeight: '600', marginTop: 12 },
  updatesSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  updatesTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  postUpdateForm: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 16 },
  updateInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff' },
  updateTypeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#e5e7eb' },
  typeButtonActive: { backgroundColor: '#2563eb' },
  typeButtonText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  typeButtonTextActive: { color: '#fff' },
  postButton: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  postButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  updateCard: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8 },
  updateType: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  updateContent: { fontSize: 14, color: '#374151', marginBottom: 4 },
  updateTime: { fontSize: 12, color: '#9ca3af' },
});
