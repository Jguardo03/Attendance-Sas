import { supabase } from '@/lib/supabase';

import { describeChangeError, type EditableStatus } from './logic';

export type ChangeAttendanceInput = {
  sessionId: number;
  studentId: string;
  status: EditableStatus;
  /** "HH:MM" Melbourne time; null keeps the recorded time (or uses the session start) and is ignored for absent. */
  time: string | null;
  reason: string;
};

export type ChangeAttendanceResult =
  | { ok: true; status: EditableStatus; checkedInAt: string | null }
  | { ok: false; code: string; message: string };

/** Saves one change. The database decides; a refusal comes back as `ok: false` with words to show, never as a throw. */
export async function changeAttendance(input: ChangeAttendanceInput): Promise<ChangeAttendanceResult> {
  if (!supabase) return { ok: false, code: 'network', message: describeChangeError('network') };
  try {
    const { data, error } = await supabase.rpc('change_attendance', {
      p_student_id: input.studentId,
      p_session_id: input.sessionId,
      p_status: input.status,
      p_time: input.status === 'absent' ? null : input.time,
      p_reason: input.reason,
    });
    if (error) return { ok: false, code: 'network', message: describeChangeError('network') };
    const answer = data as { ok: boolean; code?: string; status?: EditableStatus; checked_in_at?: string | null };
    if (!answer.ok) {
      const code = answer.code ?? 'unknown';
      return { ok: false, code, message: describeChangeError(code) };
    }
    return { ok: true, status: answer.status as EditableStatus, checkedInAt: answer.checked_in_at ?? null };
  } catch {
    return { ok: false, code: 'network', message: describeChangeError('network') };
  }
}
