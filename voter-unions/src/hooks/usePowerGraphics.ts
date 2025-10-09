import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { PowerGraphic, GraphicCategory } from '../types';

export const usePowerGraphics = (category?: GraphicCategory) => {
  return useQuery({
    queryKey: category ? ['power-graphics', category] : ['power-graphics'],
    queryFn: async () => {
      let query = supabase
        .from('power_graphics')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as PowerGraphic[];
    },
  });
};

export const usePowerGraphic = (id: string) => {
  return useQuery({
    queryKey: ['power-graphic', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_graphics')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as PowerGraphic;
    },
    enabled: !!id,
  });
};

export const useCreateGraphic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (graphic: Omit<PowerGraphic, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('power_graphics')
        .insert(graphic)
        .select()
        .single();

      if (error) throw error;
      return data as PowerGraphic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-graphics'] });
    },
  });
};

export const useDeleteGraphic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_graphics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-graphics'] });
    },
  });
};
