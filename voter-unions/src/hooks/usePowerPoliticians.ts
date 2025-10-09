import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { PowerPolitician, PowerDonor } from '../types';

export const usePowerPoliticians = () => {
  return useQuery({
    queryKey: ['power-politicians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_politicians')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PowerPolitician[];
    },
  });
};

export const usePowerPolitician = (id: string) => {
  return useQuery({
    queryKey: ['power-politician', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_politicians')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as PowerPolitician;
    },
    enabled: !!id,
  });
};

export const usePoliticianDonors = (politicianId: string) => {
  return useQuery({
    queryKey: ['power-donors', politicianId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_donors')
        .select('*')
        .eq('politician_id', politicianId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PowerDonor[];
    },
    enabled: !!politicianId,
  });
};

export const useCreatePolitician = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (politician: Omit<PowerPolitician, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('power_politicians')
        .insert(politician)
        .select()
        .single();

      if (error) throw error;
      return data as PowerPolitician;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-politicians'] });
    },
  });
};

export const useUpdatePolitician = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerPolitician> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_politicians')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PowerPolitician;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['power-politicians'] });
      queryClient.invalidateQueries({ queryKey: ['power-politician', data.id] });
    },
  });
};

export const useDeletePolitician = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_politicians')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-politicians'] });
    },
  });
};

export const useCreateDonor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donor: Omit<PowerDonor, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('power_donors')
        .insert(donor)
        .select()
        .single();

      if (error) throw error;
      return data as PowerDonor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['power-donors', data.politician_id] });
    },
  });
};

export const useDeleteDonor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_donors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-donors'] });
    },
  });
};
