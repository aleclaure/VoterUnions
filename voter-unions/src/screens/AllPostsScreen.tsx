import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePublicPosts, usePostReaction, usePostReactionsRealtime } from '../hooks/usePosts';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../hooks/useAuth';

export const AllPostsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { data: posts, isLoading } = usePublicPosts();
  const postReactionMutation = usePostReaction();
  const [sortBy, setSortBy] = useState<'recent' | 'upvotes' | 'comments'>('recent');
  
  usePostReactionsRealtime();

  const sortedPosts = React.useMemo(() => {
    if (!posts) return [];
    
    const sorted = [...posts];
    if (sortBy === 'upvotes') {
      sorted.sort((a, b) => b.upvote_count - a.upvote_count);
    } else if (sortBy === 'comments') {
      sorted.sort((a, b) => b.comment_count - a.comment_count);
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [posts, sortBy]);

  const handleUpvote = (postId: string) => {
    if (!user) return;
    postReactionMutation.mutate({
      postId,
      userId: user.id,
      reactionType: 'upvote',
    });
  };

  const handleDownvote = (postId: string) => {
    if (!user) return;
    postReactionMutation.mutate({
      postId,
      userId: user.id,
      reactionType: 'downvote',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'recent' && styles.filterButtonActive]}
          onPress={() => setSortBy('recent')}
        >
          <Text style={[styles.filterText, sortBy === 'recent' && styles.filterTextActive]}>
            Recent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'upvotes' && styles.filterButtonActive]}
          onPress={() => setSortBy('upvotes')}
        >
          <Text style={[styles.filterText, sortBy === 'upvotes' && styles.filterTextActive]}>
            Top Voted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'comments' && styles.filterButtonActive]}
          onPress={() => setSortBy('comments')}
        >
          <Text style={[styles.filterText, sortBy === 'comments' && styles.filterTextActive]}>
            Most Discussed
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading posts...</Text>
      ) : (
        <FlatList
          data={sortedPosts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              onUpvote={() => handleUpvote(item.id)}
              onDownvote={() => handleDownvote(item.id)}
              onComment={() => navigation.navigate('PostDetail', { postId: item.id })}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No public posts yet!</Text>
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
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
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
