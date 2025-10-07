import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    author_email?: string;
    created_at: string;
  };
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.author}>{comment.author_email || 'Anonymous'}</Text>
        <Text style={styles.timestamp}>{formatDate(comment.created_at)}</Text>
      </View>
      <Text style={styles.content}>{comment.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  content: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});
