import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Demand, DemandNegotiation } from '../../types';

export const RatifiedTermsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: ratifiedDemands, isLoading } = useQuery({
    queryKey: ['demands-ratified'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .eq('status', 'ratified')
        .is('deleted_at', null)
        .order('ratified_at', { ascending: false });

      if (error) throw error;
      return data as Demand[];
    },
  });

  const { data: negotiations } = useQuery({
    queryKey: ['negotiations-by-demand', selectedDemand?.id],
    queryFn: async () => {
      if (!selectedDemand) return [];
      const { data, error } = await supabase
        .from('demand_negotiations')
        .select('*')
        .eq('demand_id', selectedDemand.id)
        .is('deleted_at', null);

      if (error) throw error;
      return data as DemandNegotiation[];
    },
    enabled: !!selectedDemand,
  });

  const activateMutation = useMutation({
    mutationFn: async (demandId: string) => {
      const { error } = await supabase
        .from('demands')
        .update({ status: 'activated' })
        .eq('id', demandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demands-ratified'] });
      queryClient.invalidateQueries({ queryKey: ['demands-activated'] });
      setShowDetailsModal(false);
      Alert.alert('Success', 'Demand has been activated for negotiations!');
    },
  });

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      Healthcare: '#ef4444',
      Housing: '#f59e0b',
      Labor: '#8b5cf6',
      Environment: '#10b981',
      Education: '#3b82f6',
    };
    return colors[category || ''] || '#64748b';
  };

  const renderDemand = ({ item }: { item: Demand }) => {
    return (
      <TouchableOpacity
        style={styles.demandCard}
        onPress={() => {
          setSelectedDemand(item);
          setShowDetailsModal(true);
        }}
      >
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.category) + '20' },
          ]}
        >
          <Text
            style={[styles.categoryText, { color: getCategoryColor(item.category) }]}
          >
            {item.category}
          </Text>
        </View>

        <Text style={styles.demandTitle}>{item.title}</Text>
        <Text style={styles.demandDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{item.support_percentage.toFixed(0)}%</Text>
            <Text style={styles.metricLabel}>Support</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{item.total_votes}</Text>
            <Text style={styles.metricLabel}>Votes</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {item.ratified_at
                ? new Date(item.ratified_at).toLocaleDateString()
                : 'N/A'}
            </Text>
            <Text style={styles.metricLabel}>Ratified</Text>
          </View>
        </View>

        <Text style={styles.tapText}>Tap to view details</Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>The Living Document</Text>
        <Text style={styles.headerSubtitle}>Our values, in writing</Text>
      </View>

      <FlatList
        data={ratifiedDemands}
        renderItem={renderDemand}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No ratified demands yet. Vote to ratify proposals!
          </Text>
        }
      />

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(selectedDemand?.category) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: getCategoryColor(selectedDemand?.category) },
                    ]}
                  >
                    {selectedDemand?.category}
                  </Text>
                </View>
                <Text style={styles.modalTitle}>{selectedDemand?.title}</Text>
                <Text style={styles.modalDescription}>{selectedDemand?.description}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>
                  {selectedDemand?.support_percentage.toFixed(1)}%
                </Text>
                <Text style={styles.statBoxLabel}>Support</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{selectedDemand?.total_votes}</Text>
                <Text style={styles.statBoxLabel}>Total Votes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{negotiations?.length || 0}</Text>
                <Text style={styles.statBoxLabel}>Negotiations</Text>
              </View>
            </View>

            {negotiations && negotiations.length > 0 && (
              <View style={styles.negotiationsSection}>
                <Text style={styles.sectionTitle}>Active Negotiations</Text>
                {negotiations.map((neg) => (
                  <View key={neg.id} style={styles.negotiationItem}>
                    <Text style={styles.negotiationTarget}>{neg.target_name}</Text>
                    <Text style={styles.negotiationStatus}>{neg.outcome_status}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedDemand && (
              <TouchableOpacity
                style={styles.activateButton}
                onPress={() => activateMutation.mutate(selectedDemand.id)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.activateButtonText}>Activate for Negotiations →</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tapText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  negotiationsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  negotiationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  negotiationTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  negotiationStatus: {
    fontSize: 12,
    color: '#64748b',
  },
  activateButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  activateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
