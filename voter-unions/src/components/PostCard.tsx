import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Post } from '../types';

interface PostCardProps {
  post: Post & {
    author_email?: string;
    union_name?: string;
    channels?: { hashtag: string }[];
  };
  onPress?: () => void;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onComment?: () => void;
  userReaction?: 'upvote' | 'downvote' | null;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPress,
  onUpvote,
  onDownvote,
  onComment,
  userReaction,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.author}>{post.author_email || 'Anonymous'}</Text>
        <Text style={styles.timestamp}>{formatDate(post.created_at)}</Text>
      </View>

      {post.union_name && (
        <Text style={styles.unionName}>in {post.union_name}</Text>
      )}

      {post.channels && post.channels.length > 0 && (
        <View style={styles.channelTags}>
          {post.channels.map((channel, index) => (
            <View key={index} style={styles.channelTag}>
              <Text style={styles.channelTagText}>{channel.hashtag}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            userReaction === 'upvote' && styles.activeUpvote,
          ]}
          onPress={onUpvote}
        >
          <Text
            style={[
              styles.actionText,
              userReaction === 'upvote' && styles.activeUpvoteText,
            ]}
          >
            ▲ {post.upvote_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            userReaction === 'downvote' && styles.activeDownvote,
          ]}
          onPress={onDownvote}
        >
          <Text
            style={[
              styles.actionText,
              userReaction === 'downvote' && styles.activeDownvoteText,
            ]}
          >
            ▼ {post.downvote_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Text style={styles.actionText}>💬 {post.comment_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  unionName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  channelTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  channelTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  channelTagText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500',
  },
  content: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  activeUpvote: {
    backgroundColor: '#dcfce7',
  },
  activeDownvote: {
    backgroundColor: '#fee2e2',
  },
  actionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  activeUpvoteText: {
    color: '#16a34a',
  },
  activeDownvoteText: {
    color: '#dc2626',
  },
});
