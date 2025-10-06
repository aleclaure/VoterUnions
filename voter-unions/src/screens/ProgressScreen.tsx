import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Milestone } from '../types';

export const ProgressScreen = () => {
  const { data: milestones, isLoading } = useQuery({
    queryKey: ['milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*, unions(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Milestone[];
    },
  });

  const renderMilestone = ({ item }: { item: any }) => (
    <View style={styles.milestoneCard}>
      <View style={styles.milestoneHeader}>
        <Text style={styles.milestoneTitle}>{item.title}</Text>
        <Text style={styles.percentage}>{item.completion_percentage}%</Text>
      </View>
      <Text style={styles.milestoneDescription}>{item.description}</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${item.completion_percentage}%` },
          ]}
        />
      </View>
      <View style={styles.milestoneMeta}>
        <Text style={styles.metaText}>{item.unions?.name}</Text>
        {item.target_date && (
          <Text style={styles.metaText}>
            Due: {new Date(item.target_date).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading milestones...</Text>
      ) : (
        <FlatList
          data={milestones}
          renderItem={renderMilestone}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No milestones yet. Create campaigns to track progress!</Text>
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
  milestoneCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  percentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  milestoneMeta: {
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
