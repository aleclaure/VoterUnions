import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Demand, DemandVote } from '../../types';

export const VotingHallTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: votingDemands, isLoading } = useQuery({
    queryKey: ['demands-voting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .eq('status', 'voting')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Demand[];
    },
  });

  const { data: userVotes } = useQuery({
    queryKey: ['demand-votes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('demand_votes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as DemandVote[];
    },
    enabled: !!user,
  });

  const voteMutation = useMutation({
    mutationFn: async ({
      demandId,
      voteType,
    }: {
      demandId: string;
      voteType: 'support' | 'oppose';
    }) => {
      const existingVote = userVotes?.find((v) => v.demand_id === demandId);

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from('demand_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('demand_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('demand_votes').insert([
          {
            demand_id: demandId,
            user_id: user?.id,
            vote_type: voteType,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['demand-votes', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['demands-voting'] });
      await queryClient.refetchQueries({ queryKey: ['demands-voting'] });
    },
  });

  const ratifyMutation = useMutation({
    mutationFn: async (demandId: string) => {
      const { error } = await supabase
        .from('demands')
        .update({ 
          status: 'ratified',
          ratified_at: new Date().toISOString(),
        })
        .eq('id', demandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demands-voting'] });
      queryClient.invalidateQueries({ queryKey: ['demands-ratified'] });
      Alert.alert('Success', 'Demand has been ratified!');
    },
  });

  const getUserVote = (demandId: string) => {
    return userVotes?.find((v) => v.demand_id === demandId);
  };

  const renderDemand = ({ item }: { item: Demand }) => {
    const userVote = getUserVote(item.id);
    const passedThreshold = item.support_percentage >= 65;

    return (
      <View style={styles.demandCard}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        
        <Text style={styles.demandTitle}>{item.title}</Text>
        <Text style={styles.demandDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.support_percentage.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Support</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_votes}</Text>
            <Text style={styles.statLabel}>Total Votes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {item.votes_for} / {item.votes_against}
            </Text>
            <Text style={styles.statLabel}>For / Against</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { 
                  width: `${item.support_percentage}%`,
                  backgroundColor: passedThreshold ? '#22c55e' : '#2563eb',
                },
              ]}
            />
          </View>
          {passedThreshold && (
            <Text style={styles.passedText}>✓ Passed 65% threshold</Text>
          )}
        </View>

        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              userVote?.vote_type === 'support' && styles.voteSupportActive,
            ]}
            onPress={() =>
              voteMutation.mutate({ demandId: item.id, voteType: 'support' })
            }
          >
            <Text
              style={[
                styles.voteButtonText,
                userVote?.vote_type === 'support' && styles.voteButtonTextActive,
              ]}
            >
              👍 Support
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.voteButton,
              userVote?.vote_type === 'oppose' && styles.voteOpposeActive,
            ]}
            onPress={() =>
              voteMutation.mutate({ demandId: item.id, voteType: 'oppose' })
            }
          >
            <Text
              style={[
                styles.voteButtonText,
                userVote?.vote_type === 'oppose' && styles.voteButtonTextActive,
              ]}
            >
              👎 Oppose
            </Text>
          </TouchableOpacity>
        </View>

        {passedThreshold && item.created_by === user?.id && (
          <TouchableOpacity
            style={styles.ratifyButton}
            onPress={() => ratifyMutation.mutate(item.id)}
            disabled={ratifyMutation.isPending}
          >
            {ratifyMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.ratifyButtonText}>Ratify This Demand →</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Decision Engine</Text>
        <Text style={styles.headerSubtitle}>Every vote defines our demands</Text>
      </View>

      <FlatList
        data={votingDemands}
        renderItem={renderDemand}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No demands in voting. Check back soon!</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  demandCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  demandTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  demandDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  passedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 6,
    textAlign: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  voteSupportActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  voteOpposeActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  voteButtonTextActive: {
    color: '#ffffff',
  },
  ratifyButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ratifyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 32,
  },
});
