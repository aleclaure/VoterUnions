import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePostComments, useCreateComment, usePostReaction, usePostReactionsRealtime } from '../hooks/usePosts';
import { PostCard } from '../components/PostCard';
import { CommentCard } from '../components/CommentCard';
import { PostWithDetails } from '../hooks/usePosts';

export const PostDetailScreen = ({ route, navigation }: any) => {
  const { postId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey(email, display_name),
          unions(name),
          post_channels(
            channels(id, hashtag)
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      return {
        ...data,
        author_email: data.profiles?.email,
        author_display_name: data.profiles?.display_name,
        union_name: data.unions?.name,
        channels: (data.post_channels || [])
          .map((pc: any) => pc?.channels)
          .filter((c: any) => c != null) || [],
      } as PostWithDetails;
    },
  });

  const { data: comments, isLoading: commentsLoading } = usePostComments(postId);
  const createCommentMutation = useCreateComment();
  const postReactionMutation = usePostReaction();

  usePostReactionsRealtime();

  useEffect(() => {
    const channel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['comments', postId] });
          queryClient.invalidateQueries({ queryKey: ['post', postId] });
          queryClient.invalidateQueries({ queryKey: ['posts'] });
          queryClient.invalidateQueries({ queryKey: ['posts', 'public'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return;

    createCommentMutation.mutate(
      {
        postId,
        userId: user.id,
        content: commentText.trim(),
      },
      {
        onSuccess: () => {
          setCommentText('');
        },
      }
    );
  };

  const handleUpvote = () => {
    if (!user || !post) return;
    postReactionMutation.mutate({
      postId: post.id,
      userId: user.id,
      reactionType: 'upvote',
    });
  };

  const handleDownvote = () => {
    if (!user || !post) return;
    postReactionMutation.mutate({
      postId: post.id,
      userId: user.id,
      reactionType: 'downvote',
    });
  };

  if (postLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color="#2563eb" style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.errorText}>Post not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <PostCard
            post={post}
            onPress={() => {}}
            onUpvote={handleUpvote}
            onDownvote={handleDownvote}
            onComment={() => {}}
            showFullContent
          />

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments ({post.comment_count || 0})
            </Text>

            {commentsLoading ? (
              <ActivityIndicator size="small" color="#2563eb" style={styles.commentsLoading} />
            ) : comments && comments.length > 0 ? (
              comments.map((comment: any) => (
                <CommentCard key={comment.id} comment={comment} />
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor="#94a3b8"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              !commentText.trim() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || createCommentMutation.isPending}
          >
            {createCommentMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loading: {
    marginTop: 32,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#64748b',
  },
  commentsSection: {
    marginTop: 24,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  commentsLoading: {
    marginTop: 16,
  },
  noComments: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    maxHeight: 100,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
