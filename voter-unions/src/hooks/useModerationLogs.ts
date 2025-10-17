import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface ModerationLog {
  id: string;
  admin_username: string;
  action_type: string;
  description: string;
  metadata: {
    report_id?: string;
    content_type?: string;
    content_id?: string;
    reason?: string;
    old_status?: string;
    new_status?: string;
    admin_notes?: string;
    reporter_id?: string;
    post_id?: string;
    comment_id?: string;
    author_id?: string;
    union_id?: string;
    content_preview?: string;
  };
  created_at: string;
}

/**
 * Hook to fetch moderation audit logs for a specific union
 * Provides transparency by showing all admin actions to union members
 */
export const useUnionModerationLogs = (unionId: string | null | undefined) => {
  return useQuery({
    queryKey: ['union-moderation-logs', unionId],
    queryFn: async () => {
      if (!unionId) throw new Error('Union ID required');

      const { data, error } = await supabase.rpc('get_union_moderation_logs', {
        p_union_id: unionId,
        p_limit: 100,
      });

      if (error) throw error;
      return data as ModerationLog[];
    },
    enabled: !!unionId,
  });
};

/**
 * Hook to fetch recent moderation actions (for admins/overview)
 */
export const useRecentModerationActions = (limit: number = 20) => {
  return useQuery({
    queryKey: ['recent-moderation-actions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action_type', [
          'report_dismissed',
          'report_reviewed',
          'report_actioned',
          'content_deleted',
          'content_restored',
        ])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Array<{
        id: string;
        user_id: string | null;
        username: string;
        action_type: string;
        entity_type: string;
        entity_id: string | null;
        description: string;
        metadata: any;
        created_at: string;
      }>;
    },
  });
};
