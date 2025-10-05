import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Union } from '../types';

export const UnionsScreen = ({ navigation }: any) => {
  const { data: unions, isLoading } = useQuery({
    queryKey: ['unions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Union[];
    },
  });

  const renderUnion = ({ item }: { item: Union }) => (
    <TouchableOpacity
      style={styles.unionCard}
      onPress={() => navigation.navigate('UnionDetail', { unionId: item.id })}
    >
      <Text style={styles.unionName}>{item.name}</Text>
      <Text style={styles.unionDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.unionMeta}>
        <Text style={styles.metaText}>{item.member_count} members</Text>
        <Text style={styles.metaText}>{item.is_public ? 'Public' : 'Private'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voter Unions</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateUnion')}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading unions...</Text>
      ) : (
        <FlatList
          data={unions}
          renderItem={renderUnion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No unions yet. Create one to get started!</Text>
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
  unionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  unionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  unionMeta: {
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
