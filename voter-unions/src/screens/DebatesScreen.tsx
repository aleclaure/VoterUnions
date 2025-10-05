import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Debate } from '../types';

export const DebatesScreen = ({ navigation }: any) => {
  const { data: debates, isLoading } = useQuery({
    queryKey: ['debates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debates')
        .select('*, unions(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Debate[];
    },
  });

  const renderDebate = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.debateCard}
      onPress={() => navigation.navigate('DebateDetail', { debateId: item.id })}
    >
      <View style={styles.issueTag}>
        <Text style={styles.issueText}>{item.issue_area}</Text>
      </View>
      <Text style={styles.debateTitle}>{item.title}</Text>
      <Text style={styles.debateDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.debateMeta}>
        <Text style={styles.metaText}>{item.unions?.name}</Text>
        <Text style={styles.metaText}>{item.argument_count} arguments</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debates</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateDebate')}
        >
          <Text style={styles.createButtonText}>+ New Debate</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading debates...</Text>
      ) : (
        <FlatList
          data={debates}
          renderItem={renderDebate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No debates yet. Start one to begin deliberation!</Text>
          }
        />
      )}
    </View>
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
  createButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  debateCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  debateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  debateDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  debateMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
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
