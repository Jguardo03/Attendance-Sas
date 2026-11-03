import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// Every number comes from the report functions in the database; nothing is added up here.

export type ReportFilters = { periodId: number | null; classId: number | null; lecturerId: string | null };

export type StudentReportRow = {
  student_id: string;
  first_name: string;
  last_name: string;
  schedule_id: number;
  class_name: string;
  period_name: string;
  lecturer_id: string;
  lecturer_name: string;
  finished_sessions: number;
  present: number;
  late: number;
  absent: number;
  attendance_pct: number | null;
};

export type ClassReportRow = {
  schedule_id: number;
  class_name: string;
  period_name: string;
  lecturer_id: string;
  lecturer_name: string;
  enrolled: number;
  finished_sessions: number;
  class_average_pct: number | null;
  students_below_75: number;
};

export type LecturerReportRow = {
  lecturer_id: string;
  lecturer_name: string;
  classes: number;
  sessions_held: number;
  average_attendance_pct: number | null;
};

const args = (filters: ReportFilters) => ({
  p_period_id: filters.periodId ?? undefined,
  p_class_id: filters.classId ?? undefined,
  p_lecturer_id: filters.lecturerId ?? undefined,
});

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export function useStudentReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'students', filters],
    enabled,
    queryFn: async () => {
      const { data, error } = await client().rpc('report_student_classes', args(filters));
      if (error) throw error;
      return (data ?? []) as unknown as StudentReportRow[];
    },
  });
}

export function useClassReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'classes', filters],
    enabled,
    queryFn: async () => {
      const { data, error } = await client().rpc('report_classes', args(filters));
      if (error) throw error;
      return (data ?? []) as unknown as ClassReportRow[];
    },
  });
}

export function useLecturerReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'lecturers', filters],
    enabled,
    queryFn: async () => {
      const { data, error } = await client().rpc('report_lecturers', args(filters));
      if (error) throw error;
      return (data ?? []) as unknown as LecturerReportRow[];
    },
  });
}
