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
const LIVE_POLL = 10_000;

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
        .select('session_id, status, checked_in_at, check_in_method, comments')
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
export function useAttendees(sessionId: number, enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'attendees', sessionId],
    enabled,
    queryFn: async () => {
      const { data, error } = await client().rpc('session_attendees', { p_session_id: sessionId });
      if (error) throw error;
      return (data ?? []) as { first_name: string; last_name: string }[];
    },
  });
}

// ---- Lecturer and admin ----------------------------------------------------------------------------------------

export type ClassSummary = {
  enrolled: number;
  finished_sessions: number;
  class_average_pct: number | null;
  students_below_75: number;
};

/** One summary per class, keyed by schedule id (a lecturer has a handful of classes, so one call each). */
export function useClassSummaries(scheduleIds: number[]) {
  const ids = [...scheduleIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: ['sessions', 'class-summaries', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await client().rpc('class_attendance_summary', { p_schedule_id: id });
          if (error) throw error;
          return [id, ((data ?? [])[0] ?? { enrolled: 0, finished_sessions: 0, class_average_pct: null, students_below_75: 0 }) as ClassSummary] as const;
        }),
      );
      return new Map(rows);
    },
  });
}

/** Sessions held out of sessions planned, per class. Cancelled sessions are not planned sessions. */
export function useSessionTotals(scheduleIds: number[]) {
  const ids = [...scheduleIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: ['sessions', 'session-totals', ids],
    enabled: ids.length > 0,
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await client().from('session_overview').select('schedule_id, status').in('schedule_id', ids);
      if (error) throw error;
      const totals = new Map<number, { held: number; total: number }>();
      for (const row of (data ?? []) as { schedule_id: number; status: string }[]) {
        const current = totals.get(row.schedule_id) ?? { held: 0, total: 0 };
        if (row.status !== 'cancelled') current.total += 1;
        if (row.status === 'finished') current.held += 1;
        totals.set(row.schedule_id, current);
      }
      return totals;
    },
  });
}

export type SessionCountsRow = { session_id: number; enrolled: number; present: number; late: number };

/** Enrolled / present / late for every session in a date range, keyed by session id. */
export function useAttendanceCounts(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'attendance-counts', from, to],
    enabled: enabled && Boolean(from) && Boolean(to),
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await client().rpc('session_attendance_counts', { p_from: from, p_to: to });
      if (error) throw error;
      return new Map(((data ?? []) as unknown as SessionCountsRow[]).map((row) => [row.session_id, row]));
    },
  });
}

export type ClassStudent = {
  student_id: string;
  first_name: string;
  last_name: string;
  finished_sessions: number;
  present: number;
  late: number;
  absent: number;
  attendance_pct: number | null;
};

export function useClassStudents(scheduleId: number) {
  return useQuery({
    queryKey: ['sessions', 'class-students', scheduleId],
    queryFn: async () => {
      const { data, error } = await client().rpc('class_student_attendance', { p_schedule_id: scheduleId });
      if (error) throw error;
      return (data ?? []) as unknown as ClassStudent[];
    },
  });
}

export type AttendanceListRow = {
  student_id: string;
  first_name: string;
  last_name: string;
  status: 'present' | 'late' | 'absent' | null;
  checked_in_at: string | null;
  check_in_method: 'beacon' | 'nfc' | 'qr' | 'manual' | null;
};

/** Every enrolled student with their attendance row for one session. `live` (check in is open) polls every 10 seconds. */
export function useAttendanceList(sessionId: number, enabled = true, live = false) {
  return useQuery({
    queryKey: ['sessions', 'attendance-list', sessionId],
    enabled,
    refetchInterval: live ? LIVE_POLL : MINUTE,
    queryFn: async () => {
      const { data, error } = await client().rpc('session_attendance_list', { p_session_id: sessionId });
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceListRow[];
    },
  });
}

/** Sessions per day for the admin calendar strip. */
export function useDayCounts(from: string, to: string) {
  return useQuery({
    queryKey: ['sessions', 'day-counts', from, to],
    enabled: Boolean(from) && Boolean(to),
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await client().rpc('session_day_counts', { p_from: from, p_to: to });
      if (error) throw error;
      return new Map(((data ?? []) as unknown as { session_date: string; sessions: number; cancelled: number }[]).map((row) => [row.session_date, row]));
    },
  });
}

export type TodayCounts = { sessions_today: number; live_now: number; upcoming: number; finished: number; rescheduled_or_cancelled: number };

/** The dashboard's five numbers, worked out in the database (the same query the tests compare with raw counts). */
export function useAdminTodayCounts() {
  return useQuery({
    queryKey: ['sessions', 'admin-today-counts'],
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await client().rpc('admin_today_counts');
      if (error) throw error;
      return ((data ?? [])[0] ?? { sessions_today: 0, live_now: 0, upcoming: 0, finished: 0, rescheduled_or_cancelled: 0 }) as unknown as TodayCounts;
    },
  });
}

// ---- One attendance record and one student ------------------------------------------------------------------------

export type AttendanceRecord = {
  student_id: string;
  session_id: number;
  status: 'present' | 'late' | 'absent';
  checked_in_at: string | null;
  check_in_method: 'beacon' | 'nfc' | 'qr' | 'manual' | null;
  comments: string | null;
  updated_at: string;
};

/** The record of one student in one session; null when there is none yet (not checked in). */
export function useAttendanceRecord(sessionId: number, studentId: string) {
  return useQuery({
    queryKey: ['sessions', 'attendance-record', sessionId, studentId],
    refetchInterval: MINUTE,
    queryFn: async () => {
      const { data, error } = await client()
        .from('attendance')
        .select('student_id, session_id, status, checked_in_at, check_in_method, comments, updated_at')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AttendanceRecord) ?? null;
    },
  });
}

export type AttendanceHistoryRow = {
  changed_at: string;
  old_status: string | null;
  new_status: string;
  old_checked_in_at: string | null;
  new_checked_in_at: string | null;
  new_check_in_method: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
};

/** Every change to a record, newest first. Empty for people who may not see the history. */
export function useAttendanceHistory(studentId: string, sessionId: number) {
  return useQuery({
    queryKey: ['sessions', 'attendance-history', sessionId, studentId],
    queryFn: async () => {
      const { data, error } = await client().rpc('attendance_history', { p_student_id: studentId, p_session_id: sessionId });
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceHistoryRow[];
    },
  });
}

export type StudentInfo = { id: string; first_name: string; last_name: string; email: string };

export function useStudentInfo(studentId: string) {
  return useQuery({
    queryKey: ['sessions', 'student-info', studentId],
    queryFn: async () => {
      const { data, error } = await client().from('users').select('id, first_name, last_name, email').eq('id', studentId).maybeSingle();
      if (error) throw error;
      return (data as unknown as StudentInfo) ?? null;
    },
  });
}

/** The student's classes that the signed-in person can see: a lecturer's own classes, an admin's all of them. */
export function useSharedSchedules(studentId: string) {
  return useQuery({
    queryKey: ['sessions', 'shared-schedules', studentId],
    queryFn: async () => {
      const enrolled = await client().from('enrollment').select('class_schedule_id').eq('user_id', studentId);
      if (enrolled.error) throw enrolled.error;
      const ids = (enrolled.data ?? []).map((row) => row.class_schedule_id);
      if (ids.length === 0) return [] as ScheduleOverview[];
      const { data, error } = await client().from('schedule_overview').select('*').in('schedule_id', ids).order('class_name');
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleOverview[];
    },
  });
}

export type StudentClassNumbers = { finished_sessions: number; present: number; late: number; absent: number; attendance_pct: number | null };

/** One student's numbers in one class: "6 of 13 attended · 46%". */
export function useStudentClassNumbers(studentId: string, scheduleId: number | null) {
  return useQuery({
    queryKey: ['sessions', 'student-class-numbers', studentId, scheduleId],
    enabled: scheduleId !== null,
    queryFn: async () => {
      const { data, error } = await client().rpc('student_class_attendance', { p_student_id: studentId, p_schedule_id: scheduleId as number });
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as unknown as StudentClassNumbers | null;
    },
  });
}
