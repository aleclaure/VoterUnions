import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { PowerPledge } from '../types';
import { stripHtml } from '../lib/inputSanitization';

export const usePowerPledges = (unionId?: string) => {
  return useQuery({
    queryKey: unionId ? ['power-pledges', unionId] : ['power-pledges'],
    queryFn: async () => {
      let query = supabase
        .from('power_pledges')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (unionId) {
        query = query.eq('union_id', unionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as PowerPledge[];
    },
  });
};

export const useUserPowerPledge = (userId: string, targetType: string, targetId: string) => {
  return useQuery({
    queryKey: ['power-pledge', userId, targetType, targetId],
    queryFn: async () => {
      let query = supabase
        .from('power_pledges')
        .select('*')
        .is('deleted_at', null)
        .eq('user_id', userId)
        .eq('target_type', targetType);

      if (targetType === 'politician') {
        query = query.eq('politician_id', targetId);
      } else if (targetType === 'bill') {
        query = query.eq('bill_id', targetId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as PowerPledge | null;
    },
    enabled: !!userId && !!targetType && !!targetId,
  });
};

export const useCreatePowerPledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pledge: Omit<PowerPledge, 'id' | 'created_at'>) => {
      // Sanitize optional reason field to prevent XSS attacks
      const sanitizedPledge = {
        ...pledge,
        reason: pledge.reason ? stripHtml(pledge.reason) : undefined,
      };
      
      const { data, error } = await supabase
        .from('power_pledges')
        .insert(sanitizedPledge)
        .select()
        .single();

      if (error) throw error;
      return data as PowerPledge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['power-pledges'] });
      queryClient.invalidateQueries({ queryKey: ['power-pledge', data.user_id] });
    },
  });
};

export const useDeletePowerPledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_pledges')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-pledges'] });
      queryClient.invalidateQueries({ queryKey: ['power-pledge'] });
    },
  });
};
