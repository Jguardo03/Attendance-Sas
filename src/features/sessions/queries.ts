import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { MyAttendance, Session } from './format';

// Everything here reads views and functions that row level security already filters per person,
// so a student gets only their own classes without the app filtering anything by role.

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

const sessionColumns = '*';
const MINUTE = 60_000;

export type ScheduleOverview = {
  schedule_id: number;
  class_id: number;
  class_name: string;
  class_description: string | null;
  academic_period_id: number;
  period_name: string;
  period_status: 'planning' | 'active' | 'finished';
  frequency_name: string;
  lecturer_id: string;
  lecturer_first_name: string | null;
  lecturer_last_name: string | null;
  lecturer_email: string | null;
  location_id: number | null;
  location_name: string | null;
  week_day: number;
  start_time: string;
  end_time: string;
};

export type AttendanceNumbers = {
  schedule_id: number;
  finished_sessions: number;
  present: number;
  late: number;
  absent: number;
  attendance_pct: number | null;
};

/** The server's current local time ("YYYY-MM-DDTHH:MM:SS", Melbourne). One clock for every screen. */
export function useAppNow() {
  return useQuery({
    queryKey: ['sessions', 'now'],
    queryFn: async () => {
      const { data, error } = await client().rpc('app_now');
      if (error) throw error;
      return data as string;
    },
    refetchInterval: MINUTE,
  });
}

type Builder = ReturnType<typeof base>;

export function useSessions(
  key: unknown[],
  build: (query: Builder) => PromiseLike<{ data: unknown; error: unknown }>,
  enabled = true,
  live = false,
) {
  return useQuery({
    // The 'list' prefix keeps these arrays apart from single-row queries such as useSchedule and useSession.
    queryKey: ['sessions', 'list', ...key],
    enabled,
    // Screens that show "Live" or "Check in opens at" refresh each minute so the state stays right.
    refetchInterval: live ? MINUTE : false,
    queryFn: async () => {
      const { data, error } = await build(base());
      if (error) throw error;
      return (data ?? []) as unknown as Session[];
    },
  });
}

function base() {
  return client().from('session_overview').select(sessionColumns);
}

export function useSession(sessionId: number) {
  return useQuery({
    queryKey: ['sessions', 'one', sessionId],
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await base().eq('session_id', sessionId).maybeSingle();
      if (error) throw error;
      return (data as unknown as Session) ?? null;
    },
  });
}

/** The signed-in student's own attendance rows for some sessions, keyed by session id. */
export function useMyAttendance(userId: string | null | undefined, sessionIds: number[]) {
  const ids = [...new Set(sessionIds)].sort((a, b) => a - b);
  return useQuery({
    queryKey: ['sessions', 'my-attendance', userId, ids],
    enabled: Boolean(userId) && ids.length > 0,
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await client()
        .from('attendance')
        .select('session_id, status, checked_in_at, check_in_method')
        .eq('student_id', userId as string)
        .in('session_id', ids);
      if (error) throw error;
      return new Map(((data ?? []) as MyAttendance[]).map((row) => [row.session_id, row]));
    },
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ['sessions', 'schedules'],
    queryFn: async () => {
      const { data, error } = await client().from('schedule_overview').select('*').order('class_name');
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleOverview[];
    },
  });
}

export function useSchedule(scheduleId: number) {
  return useQuery({
    queryKey: ['sessions', 'schedule', scheduleId],
    queryFn: async () => {
      const { data, error } = await client().from('schedule_overview').select('*').eq('schedule_id', scheduleId).maybeSingle();
      if (error) throw error;
      return (data as unknown as ScheduleOverview) ?? null;
    },
  });
}

/** The student's numbers for every class they are enrolled in, keyed by schedule id. */
export function useStudentOverview(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['sessions', 'student-overview', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await client().rpc('student_attendance_overview', { p_student_id: userId as string });
      if (error) throw error;
      return new Map(((data ?? []) as unknown as AttendanceNumbers[]).map((row) => [row.schedule_id, row]));
    },
  });
}

/** Names only: students cannot read other students' records. */
export function useAttendees(sessionId: number) {
  return useQuery({
    queryKey: ['sessions', 'attendees', sessionId],
    queryFn: async () => {
      const { data, error } = await client().rpc('session_attendees', { p_session_id: sessionId });
      if (error) throw error;
      return (data ?? []) as { first_name: string; last_name: string }[];
    },
  });
}
