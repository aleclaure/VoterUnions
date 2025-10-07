import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../contexts/AuthContext';
import { Argument, Stance } from '../types';
import { useVoteOnArgument, useUserVote } from '../hooks/useArgumentVotes';
import { useDebateStats } from '../hooks/useDebateStats';

export const DebateDetailScreen = ({ route, navigation }: any) => {
  const { debateId } = route.params;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [argumentContent, setArgumentContent] = useState('');
  const [selectedStance, setSelectedStance] = useState<Stance>('neutral');
  const [sourceLink, setSourceLink] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const { data: debateStats } = useDebateStats(debateId);

  const { data: debate } = useQuery({
    queryKey: ['debate', debateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debates')
        .select('*, unions(name)')
        .eq('id', debateId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: debateArguments } = useQuery({
    queryKey: ['arguments', debateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arguments')
        .select('*')
        .eq('debate_id', debateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Argument[];
    },
  });

  const createArgumentMutation = useMutation({
    mutationFn: async () => {
      const sourceLinks = sourceLink.trim() ? [sourceLink.trim()] : [];
      const { data, error } = await supabase
        .from('arguments')
        .insert({
          debate_id: debateId,
          user_id: user?.id,
          stance: selectedStance,
          content: argumentContent,
          source_links: sourceLinks,
          parent_id: replyingTo,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      const wasReply = replyingTo !== null;
      queryClient.invalidateQueries({ queryKey: ['arguments', debateId] });
      queryClient.invalidateQueries({ queryKey: ['debateStats', debateId] });
      setArgumentContent('');
      setSelectedStance('neutral');
      setSourceLink('');
      setReplyingTo(null);
      Alert.alert('Success', wasReply ? 'Reply added!' : 'Argument added!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmitArgument = () => {
    if (!argumentContent.trim()) {
      Alert.alert('Error', 'Please enter your argument');
      return;
    }

    if (sourceLink.trim()) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(sourceLink.trim())) {
        Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
        return;
      }
    }

    createArgumentMutation.mutate();
  };

  const getStanceColor = (stance: Stance) => {
    switch (stance) {
      case 'pro':
        return '#16a34a';
      case 'con':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  const getStanceBgColor = (stance: Stance) => {
    switch (stance) {
      case 'pro':
        return '#dcfce7';
      case 'con':
        return '#fee2e2';
      default:
        return '#f1f5f9';
    }
  };

  // Get top-level arguments (no parent) and replies
  const topLevelArguments = debateArguments?.filter(arg => !arg.parent_id) || [];
  const getReplies = (parentId: string) => {
    return debateArguments?.filter(arg => arg.parent_id === parentId) || [];
  };

  // Recursive component to render argument and all its nested replies
  const RenderArgumentWithReplies = ({ argument }: { argument: Argument }) => {
    const replies = getReplies(argument.id);
    return (
      <View>
        <ArgumentCard argument={argument} debateId={debateId} onReply={setReplyingTo} />
        {replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {replies.map(reply => (
              <RenderArgumentWithReplies key={reply.id} argument={reply} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderArgument = ({ item }: { item: Argument }) => {
    return <RenderArgumentWithReplies argument={item} />;
  };

  const ArgumentCard = ({ argument, debateId, onReply }: { argument: Argument; debateId: string; onReply: (id: string) => void }) => {
    const voteMutation = useVoteOnArgument();
    const { data: userVote } = useUserVote(argument.id);

    const handleVote = (voteType: 'upvote' | 'downvote') => {
      voteMutation.mutate({ argumentId: argument.id, voteType, debateId });
    };

    const voteScore = (argument.upvotes || 0) - (argument.downvotes || 0);

    return (
      <View style={styles.argumentCard}>
        <View style={styles.argumentHeader}>
          <View style={[styles.stanceBadge, { backgroundColor: getStanceBgColor(argument.stance) }]}>
            <Text style={[styles.stanceText, { color: getStanceColor(argument.stance) }]}>
              {argument.stance.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.argumentContent}>{argument.content}</Text>

        {argument.source_links && argument.source_links.length > 0 && (
          <View style={styles.sourcesContainer}>
            {argument.source_links.map((link, index) => (
              <TouchableOpacity key={index} onPress={() => Alert.alert('Source', link)}>
                <Text style={styles.sourceLink}>🔗 {link}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.argumentFooter}>
          <View style={styles.voteButtons}>
            <TouchableOpacity
              style={[styles.voteButton, userVote?.vote_type === 'upvote' && styles.voteButtonActive]}
              onPress={() => handleVote('upvote')}
            >
              <Text style={[styles.voteButtonText, userVote?.vote_type === 'upvote' && styles.voteButtonTextActive]}>
                ▲ {argument.upvotes || 0}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.voteScore, voteScore > 0 && styles.voteScorePositive, voteScore < 0 && styles.voteScoreNegative]}>
              {voteScore > 0 ? '+' : ''}{voteScore}
            </Text>

            <TouchableOpacity
              style={[styles.voteButton, userVote?.vote_type === 'downvote' && styles.voteButtonActive]}
              onPress={() => handleVote('downvote')}
            >
              <Text style={[styles.voteButtonText, userVote?.vote_type === 'downvote' && styles.voteButtonTextActive]}>
                ▼ {argument.downvotes || 0}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => onReply(argument.id)}
          >
            <Text style={styles.replyButtonText}>↩ Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {debate && (
          <View style={styles.debateInfo}>
            <View style={styles.issueTag}>
              <Text style={styles.issueText}>{debate.issue_area}</Text>
            </View>
            <Text style={styles.title}>{debate.title}</Text>
            <Text style={styles.description}>{debate.description}</Text>
            <Text style={styles.unionName}>{debate.unions?.name}</Text>
          </View>
        )}

        {debateStats && debateStats.total > 0 && (() => {
          const totalVotes = debateStats.pro.votes + debateStats.con.votes + debateStats.neutral.votes || 1;
          const proWidth = `${Math.max(0, Math.round((debateStats.pro.votes / totalVotes) * 100))}%`;
          const conWidth = `${Math.max(0, Math.round((debateStats.con.votes / totalVotes) * 100))}%`;
          const neutralWidth = `${Math.max(0, Math.round((debateStats.neutral.votes / totalVotes) * 100))}%`;
          
          return (
            <View style={styles.scoreboardContainer}>
              <Text style={styles.scoreboardTitle}>Debate Scoreboard</Text>
              <View style={styles.scoreboardBars}>
                <View style={styles.scoreboardRow}>
                  <Text style={styles.scoreboardLabel}>🟩 PRO</Text>
                  <View style={styles.scoreboardBarContainer}>
                    <View 
                      style={[
                        styles.scoreboardBar, 
                        styles.scoreboardBarPro,
                        { width: proWidth }
                      ]} 
                    />
                  </View>
                  <Text style={styles.scoreboardPercentage}>
                    {debateStats.pro.count} ({debateStats.pro.votes > 0 ? '+' : ''}{debateStats.pro.votes})
                  </Text>
                </View>
                
                <View style={styles.scoreboardRow}>
                  <Text style={styles.scoreboardLabel}>🟥 CON</Text>
                  <View style={styles.scoreboardBarContainer}>
                    <View 
                      style={[
                        styles.scoreboardBar, 
                        styles.scoreboardBarCon,
                        { width: conWidth }
                      ]} 
                    />
                  </View>
                  <Text style={styles.scoreboardPercentage}>
                    {debateStats.con.count} ({debateStats.con.votes > 0 ? '+' : ''}{debateStats.con.votes})
                  </Text>
                </View>

                <View style={styles.scoreboardRow}>
                  <Text style={styles.scoreboardLabel}>🟦 NEUTRAL</Text>
                  <View style={styles.scoreboardBarContainer}>
                    <View 
                      style={[
                        styles.scoreboardBar, 
                        styles.scoreboardBarNeutral,
                        { width: neutralWidth }
                      ]} 
                    />
                  </View>
                  <Text style={styles.scoreboardPercentage}>
                    {debateStats.neutral.count} ({debateStats.neutral.votes > 0 ? '+' : ''}{debateStats.neutral.votes})
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}

        <View style={styles.addArgument}>
          <Text style={styles.sectionTitle}>{replyingTo ? 'Add Your Reply' : 'Add Your Argument'}</Text>
          
          {replyingTo && (
            <View style={styles.replyingToContainer}>
              <Text style={styles.replyingToText}>
                Replying to argument
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Text style={styles.cancelReplyText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.stanceSelector}>
            {(['pro', 'con', 'neutral'] as Stance[]).map((stance) => (
              <TouchableOpacity
                key={stance}
                style={[
                  styles.stanceButton,
                  selectedStance === stance && { backgroundColor: getStanceBgColor(stance) },
                ]}
                onPress={() => setSelectedStance(stance)}
              >
                <Text
                  style={[
                    styles.stanceButtonText,
                    selectedStance === stance && { color: getStanceColor(stance), fontWeight: '600' },
                  ]}
                >
                  {stance.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.argumentInput}
            value={argumentContent}
            onChangeText={setArgumentContent}
            placeholder="Present your argument..."
            multiline
            numberOfLines={4}
          />

          <TextInput
            style={styles.sourceInput}
            value={sourceLink}
            onChangeText={setSourceLink}
            placeholder="Add source link (optional)"
            autoCapitalize="none"
            keyboardType="url"
          />

          <TouchableOpacity
            style={[styles.submitButton, createArgumentMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmitArgument}
            disabled={createArgumentMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {createArgumentMutation.isPending ? 'Submitting...' : replyingTo ? 'Submit Reply' : 'Submit Argument'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.argumentsSection}>
          <Text style={styles.sectionTitle}>Arguments ({topLevelArguments.length})</Text>
          <FlatList
            data={topLevelArguments}
            renderItem={renderArgument}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No arguments yet. Be the first!</Text>
            }
          />
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  debateInfo: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 12,
  },
  unionName: {
    fontSize: 14,
    color: '#94a3b8',
  },
  addArgument: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  stanceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stanceButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  stanceButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  argumentInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  sourceInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    color: '#64748b',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  argumentsSection: {
    padding: 20,
    marginTop: 8,
  },
  argumentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  argumentHeader: {
    marginBottom: 8,
  },
  stanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  argumentContent: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 8,
  },
  sourcesContainer: {
    marginBottom: 12,
    gap: 6,
  },
  sourceLink: {
    fontSize: 13,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  argumentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  voteButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  voteButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  voteButtonTextActive: {
    color: '#fff',
  },
  voteScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  voteScorePositive: {
    color: '#16a34a',
  },
  voteScoreNegative: {
    color: '#dc2626',
  },
  argumentMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
  },
  scoreboardContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 8,
  },
  scoreboardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  scoreboardBars: {
    gap: 12,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreboardLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  scoreboardBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreboardBar: {
    height: '100%',
    borderRadius: 4,
  },
  scoreboardBarPro: {
    backgroundColor: '#16a34a',
  },
  scoreboardBarCon: {
    backgroundColor: '#dc2626',
  },
  scoreboardBarNeutral: {
    backgroundColor: '#64748b',
  },
  scoreboardPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    width: 80,
    textAlign: 'right',
  },
  repliesContainer: {
    marginLeft: 20,
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
  },
  replyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  replyingToText: {
    fontSize: 14,
    color: '#64748b',
  },
  cancelReplyText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
});
