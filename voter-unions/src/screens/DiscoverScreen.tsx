import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Union } from '../types';

const ISSUE_CATEGORIES = [
  { id: 'all', label: 'All', tag: null },
  { id: 'climate', label: 'Climate Change', tag: 'Climate Change' },
  { id: 'immigration', label: 'Immigration Rights', tag: 'Immigration Rights' },
  { id: 'healthcare', label: 'Healthcare', tag: 'Healthcare' },
  { id: 'workers', label: "Workers' Rights", tag: "Workers' Rights" },
  { id: 'womens', label: "Women's Healthcare", tag: "Women's Healthcare" },
  { id: 'lgbtq', label: 'LGBTQ+ Rights', tag: 'LGBTQ+ Rights' },
];

export const DiscoverScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: unions, isLoading } = useQuery({
    queryKey: ['unions', 'discover'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unions')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false });

      if (error) throw error;
      return data as Union[];
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (unionId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('union_members')
        .insert({
          union_id: unionId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-unions'] });
      queryClient.invalidateQueries({ queryKey: ['unions'] });
    },
  });

  const filteredUnions = React.useMemo(() => {
    if (!unions) return [];
    if (selectedCategory === 'all') return unions;

    const category = ISSUE_CATEGORIES.find(c => c.id === selectedCategory);
    if (!category?.tag) return unions;

    return unions.filter(union => 
      union.issue_tags?.includes(category.tag!)
    );
  }, [unions, selectedCategory]);

  const renderUnion = ({ item }: { item: Union }) => (
    <View style={styles.unionCard}>
      <Text style={styles.unionName}>{item.name}</Text>
      <Text style={styles.unionDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      {item.issue_tags && item.issue_tags.length > 0 && (
        <View style={styles.tags}>
          {item.issue_tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.memberCount}>{item.member_count} members</Text>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => joinMutation.mutate(item.id)}
          disabled={joinMutation.isPending}
        >
          <Text style={styles.joinButtonText}>
            {joinMutation.isPending ? 'Joining...' : 'Join Union'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ISSUE_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading unions...</Text>
      ) : (
        <FlatList
          data={filteredUnions}
          renderItem={renderUnion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No unions found in this category
            </Text>
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
  categoryBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  unionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
    lineHeight: 20,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 14,
    color: '#94a3b8',
  },
  joinButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
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
