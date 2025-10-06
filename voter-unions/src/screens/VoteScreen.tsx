import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const VoteScreen = ({ navigation }: any) => {
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const renderCandidate = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CandidateDetail', { candidateId: item.id })}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.position}>{item.position}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.pledgeButtons}>
        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportText}>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.opposeButton}>
          <Text style={styles.opposeText}>Oppose</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Vote & Pledge</Text>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading candidates...</Text>
      ) : (
        <FlatList
          data={candidates}
          renderItem={renderCandidate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No candidates or policies yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  position: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  pledgeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  supportButton: {
    flex: 1,
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  supportText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  opposeButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  opposeText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#64748b',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748b',
  },
});
