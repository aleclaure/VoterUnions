import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface UnionMembership {
  id: string;
  union_id: string;
  role: string;
  unions: {
    id: string;
    name: string;
  } | null;
}

export const useUnionMemberships = (userId: string) => {
  return useQuery({
    queryKey: ['union-memberships', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('union_members')
        .select(`
          id,
          union_id,
          role,
          unions (
            id,
            name
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as unknown as UnionMembership[];
    },
    enabled: !!userId,
  });
};
