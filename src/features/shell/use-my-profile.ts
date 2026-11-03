import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

export type MyProfile = { id: string; first_name: string; last_name: string; email: string };

/** The signed-in person's own record, for the Profile screen and the user chip. One query, shared. */
export function useMyProfile() {
  const { claims } = useAuth();
  const appUserId = claims?.appUserId;
  return useQuery({
    queryKey: ['profile', appUserId],
    enabled: Boolean(supabase && appUserId),
    queryFn: async () => {
      const { data, error } = await supabase!.from('users').select('id, first_name, last_name, email').eq('id', appUserId!).single();
      if (error) throw error;
      return data as MyProfile;
    },
  });
}
