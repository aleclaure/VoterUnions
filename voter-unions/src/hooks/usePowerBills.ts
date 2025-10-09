import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { PowerBill, PowerBeneficiary } from '../types';

export const usePowerBills = () => {
  return useQuery({
    queryKey: ['power-bills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_bills')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PowerBill[];
    },
  });
};

export const usePowerBill = (id: string) => {
  return useQuery({
    queryKey: ['power-bill', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_bills')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as PowerBill;
    },
    enabled: !!id,
  });
};

export const useBillBeneficiaries = (billId: string) => {
  return useQuery({
    queryKey: ['power-beneficiaries', billId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_beneficiaries')
        .select('*')
        .eq('bill_id', billId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PowerBeneficiary[];
    },
    enabled: !!billId,
  });
};

export const useCreateBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: Omit<PowerBill, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('power_bills')
        .insert(bill)
        .select()
        .single();

      if (error) throw error;
      return data as PowerBill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-bills'] });
    },
  });
};

export const useUpdateBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerBill> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_bills')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PowerBill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['power-bills'] });
      queryClient.invalidateQueries({ queryKey: ['power-bill', data.id] });
    },
  });
};

export const useDeleteBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_bills')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-bills'] });
    },
  });
};

export const useCreateBeneficiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beneficiary: Omit<PowerBeneficiary, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('power_beneficiaries')
        .insert(beneficiary)
        .select()
        .single();

      if (error) throw error;
      return data as PowerBeneficiary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['power-beneficiaries', data.bill_id] });
    },
  });
};

export const useDeleteBeneficiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_beneficiaries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-beneficiaries'] });
    },
  });
};
