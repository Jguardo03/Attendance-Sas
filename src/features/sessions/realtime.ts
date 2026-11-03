import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

// Listens for changes to attendance rows and refreshes every session query when one arrives. The database only
// delivers rows the signed-in person may read, so a lecturer hears about their sessions and a student about their own
// rows. `filter` narrows the stream, e.g. "session_id=eq.7" or "student_id=eq.S1000001"; null switches it off.
// Polling stays on as the fallback, so a dropped connection costs seconds, not correctness.
export function useAttendanceRealtime(filter: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!supabase || !filter) return;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    const channel = supabase
      .channel(`attendance:${filter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter }, refresh)
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [filter, queryClient]);
}
