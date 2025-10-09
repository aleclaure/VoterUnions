import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Policy } from '../../types';

export const OutreachTab = () => {
  const [selectedCount, setSelectedCount] = useState<number>(5);

  const { data: topPolicies, isLoading } = useQuery({
    queryKey: ['top-policies', selectedCount],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .is('deleted_at', null)
        .order('vote_count', { ascending: false })
        .limit(selectedCount);

      if (error) throw error;
      return data as Policy[];
    },
  });

  const generateCampaignText = () => {
    if (!topPolicies || topPolicies.length === 0) {
      return "We're building a People's Agenda to unite working families. Join us!";
    }

    const policyList = topPolicies
      .map((policy, index) => `${index + 1}. ${policy.title}`)
      .join('\n');

    return `🤝 THE PEOPLE'S AGENDA

Different backgrounds, one struggle.

Here's what working families are fighting for:

${policyList}

These aren't divisive talking points—they're practical solutions that unite us all.

Join the movement. Let's organize.`;
  };

  const generateRepMessage = () => {
    if (!topPolicies || topPolicies.length === 0) {
      return 'Dear Representative,\n\nYour constituents are organizing around key policy priorities. We urge you to listen.';
    }

    const policyList = topPolicies
      .map((policy, index) => `${index + 1}. ${policy.title}`)
      .join('\n');

    return `Dear Representative,

Your constituents have identified these as our top policy priorities:

${policyList}

These represent the shared interests of working families in our community. We expect you to champion these priorities and work tirelessly to deliver results.

We are organized, we are watching, and we will hold you accountable.

Sincerely,
Your Constituents`;
  };

  const handleShareCampaign = async () => {
    try {
      await Share.share({
        message: generateCampaignText(),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleShareRepMessage = async () => {
    try {
      await Share.share({
        message: generateRepMessage(),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyText = (text: string) => {
    Alert.alert('Copied!', 'Text copied. Paste it wherever you need.');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Outreach Campaigns</Text>
          <Text style={styles.headerSubtitle}>Share our agenda, organize power</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Policy Count</Text>
          <View style={styles.countButtons}>
            {[3, 5, 10].map((count) => (
              <TouchableOpacity
                key={count}
                style={[styles.countButton, selectedCount === count && styles.countButtonActive]}
                onPress={() => setSelectedCount(count)}
              >
                <Text
                  style={[
                    styles.countButtonText,
                    selectedCount === count && styles.countButtonTextActive,
                  ]}
                >
                  Top {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Social Media Campaign</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewText}>{generateCampaignText()}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareCampaign}>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => handleCopyText(generateCampaignText())}
            >
              <Text style={styles.actionButtonSecondaryText}>Copy Text</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✉️ Message Your Rep</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewText}>{generateRepMessage()}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareRepMessage}>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => handleCopyText(generateRepMessage())}
            >
              <Text style={styles.actionButtonSecondaryText}>Copy Text</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.philosophyCard}>
          <Text style={styles.philosophyTitle}>🤝 Different backgrounds, one struggle</Text>
          <Text style={styles.philosophyText}>
            The People's Agenda replaces divisive talking points with practical solutions that
            unite working families across all backgrounds. Use these campaigns to organize your
            community and build collective power.
          </Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  countButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  countButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  countButtonActive: {
    backgroundColor: '#2563eb',
  },
  countButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  countButtonTextActive: {
    color: '#ffffff',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  philosophyCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  philosophyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  philosophyText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
