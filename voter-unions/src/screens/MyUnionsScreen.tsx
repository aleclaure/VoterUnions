import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePosts, usePostReaction, usePostReactionsRealtime } from '../hooks/usePosts';
import { useChannels } from '../hooks/useChannels';
import { PostCard } from '../components/PostCard';
import { CreatePostModal } from '../components/CreatePostModal';
import { CreateChannelModal } from '../components/CreateChannelModal';
import { Union } from '../types';

export const MyUnionsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [selectedUnionId, setSelectedUnionId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const { data: myUnions, isLoading: unionsLoading } = useQuery({
    queryKey: ['my-unions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('union_members')
        .select('unions(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map((item: any) => item.unions).filter(Boolean) as Union[];
    },
    enabled: !!user,
  });

  const { data: channels } = useChannels(selectedUnionId || '');
  const { data: posts, isLoading: postsLoading } = usePosts(selectedUnionId || undefined);
  const postReactionMutation = usePostReaction();
  
  usePostReactionsRealtime();

  React.useEffect(() => {
    if (myUnions && myUnions.length > 0 && !selectedUnionId) {
      setSelectedUnionId(myUnions[0].id);
    }
  }, [myUnions, selectedUnionId]);

  const selectedUnion = myUnions?.find(u => u.id === selectedUnionId);

  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    if (!selectedChannelId) return posts;
    
    return posts.filter(post => 
      post.channels?.some(ch => ch.id === selectedChannelId)
    );
  }, [posts, selectedChannelId]);

  const handleCreatePost = async (content: string, channelIds: string[], isPublic: boolean) => {
    if (!user || !selectedUnionId) return;
    
    await supabase.from('posts').insert({
      union_id: selectedUnionId,
      author_id: user.id,
      content,
      is_public: isPublic,
    }).select().single().then(({ data: post, error }) => {
      if (error) throw error;
      if (channelIds.length > 0) {
        return supabase.from('post_channels').insert(
          channelIds.map(cid => ({ post_id: post.id, channel_id: cid }))
        );
      }
    });
  };

  const handleCreateChannel = async (name: string, hashtag: string, description: string, isPublic: boolean) => {
    if (!user || !selectedUnionId) return;
    
    await supabase.from('channels').insert({
      union_id: selectedUnionId,
      name,
      hashtag,
      description,
      is_public: isPublic,
      created_by: user.id,
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Text style={styles.emptyText}>Please log in to view your unions</Text>
      </SafeAreaView>
    );
  }

  if (unionsLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!myUnions || myUnions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Text style={styles.emptyText}>You haven't joined any unions yet</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('CreateUnion')}
        >
          <Text style={styles.browseButtonText}>Create a Union</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.unionBanner}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unionScroll}>
          {myUnions.map(union => (
            <TouchableOpacity
              key={union.id}
              style={[
                styles.unionChip,
                selectedUnionId === union.id && styles.unionChipActive
              ]}
              onPress={() => {
                setSelectedUnionId(union.id);
                setSelectedChannelId(null);
              }}
            >
              <Text style={[
                styles.unionChipText,
                selectedUnionId === union.id && styles.unionChipTextActive
              ]}>
                {union.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.createUnionButton}
          onPress={() => navigation.navigate('CreateUnion')}
        >
          <Text style={styles.createUnionButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {selectedUnionId && (
        <View style={styles.channelBanner}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelScroll}>
            <TouchableOpacity
              style={[
                styles.channelChip,
                !selectedChannelId && styles.channelChipActive
              ]}
              onPress={() => setSelectedChannelId(null)}
            >
              <Text style={[
                styles.channelChipText,
                !selectedChannelId && styles.channelChipTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {channels?.map(channel => (
              <TouchableOpacity
                key={channel.id}
                style={[
                  styles.channelChip,
                  selectedChannelId === channel.id && styles.channelChipActive
                ]}
                onPress={() => setSelectedChannelId(channel.id)}
              >
                <Text style={[
                  styles.channelChipText,
                  selectedChannelId === channel.id && styles.channelChipTextActive
                ]}>
                  {channel.hashtag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.createChannelButton}
            onPress={() => setShowCreateChannel(true)}
          >
            <Text style={styles.createChannelButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedUnionId && (
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => setShowCreatePost(true)}
        >
          <Text style={styles.createPostButtonText}>Create Post</Text>
        </TouchableOpacity>
      )}

      {postsLoading ? (
        <Text style={styles.loadingText}>Loading posts...</Text>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              onUpvote={() => postReactionMutation.mutate({
                postId: item.id,
                userId: user.id,
                reactionType: 'upvote',
              })}
              onDownvote={() => postReactionMutation.mutate({
                postId: item.id,
                userId: user.id,
                reactionType: 'downvote',
              })}
              onComment={() => navigation.navigate('PostDetail', { postId: item.id })}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {selectedUnionId ? 'No posts yet. Create one!' : 'Select a union to view posts'}
            </Text>
          }
        />
      )}

      {selectedUnion && (
        <>
          <CreatePostModal
            visible={showCreatePost}
            onClose={() => setShowCreatePost(false)}
            onSubmit={handleCreatePost}
            channels={channels || []}
            unionName={selectedUnion.name}
          />
          <CreateChannelModal
            visible={showCreateChannel}
            onClose={() => setShowCreateChannel(false)}
            onSubmit={handleCreateChannel}
            unionName={selectedUnion.name}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  unionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingLeft: 12,
  },
  unionScroll: {
    flex: 1,
  },
  unionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  unionChipActive: {
    backgroundColor: '#2563eb',
  },
  unionChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  unionChipTextActive: {
    color: '#fff',
  },
  createUnionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  createUnionButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  channelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
    paddingLeft: 12,
  },
  channelScroll: {
    flex: 1,
  },
  channelChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  channelChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  channelChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  channelChipTextActive: {
    color: '#2563eb',
  },
  createChannelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  createChannelButtonText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '600',
  },
  createPostButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  browseButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 40,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
