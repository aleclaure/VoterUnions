import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Report, ReportContentType, ReportStatus } from '../types';
import { stripHtml } from '../lib/inputSanitization';

export const useMyReports = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['reports', 'my', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    enabled: !!userId,
  });
};

export const useUnionReports = (unionId: string | undefined, status?: ReportStatus) => {
  return useQuery({
    queryKey: ['reports', 'union', unionId, status],
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .eq('union_id', unionId)
        .is('deleted_at', null);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    enabled: !!unionId,
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentType,
      contentId,
      reason,
      userId,
    }: {
      contentType: ReportContentType;
      contentId: string;
      reason: string;
      userId: string;
    }) => {
      const sanitizedReason = stripHtml(reason);

      const { data, error } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          content_type: contentType,
          content_id: contentId,
          reason: sanitizedReason,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already reported this content');
        }
        throw error;
      }

      return data as Report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      adminNotes,
    }: {
      reportId: string;
      status: ReportStatus;
      adminNotes?: string;
    }) => {
      const sanitizedNotes = adminNotes ? stripHtml(adminNotes) : undefined;

      const { data, error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: sanitizedNotes,
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data as Report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
