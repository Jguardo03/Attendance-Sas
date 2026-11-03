// Numbers and labels for the lecturer and admin screens. Pure, so they can be tested without a database.
import { hhmm, sessionPill, type Session } from './format';

export type SessionCounts = { enrolled: number; present: number; late: number };

export const attended = (counts: SessionCounts) => counts.present + counts.late;

/** Whole-number percentage of enrolled students who attended; 0 when nobody is enrolled. */
export function attendancePercent(counts: SessionCounts): number {
  return counts.enrolled > 0 ? Math.round((100 * attended(counts)) / counts.enrolled) : 0;
}

/** "18/24 · 75%" for a live or finished session, "0/22" before it starts. */
export function attendanceFraction(session: Session, counts?: SessionCounts): string {
  if (!counts) return '';
  if (session.status === 'cancelled') return 'Not counted';
  const fraction = `${attended(counts)}/${counts.enrolled}`;
  return session.status === 'started' || session.status === 'finished' ? `${fraction} · ${attendancePercent(counts)}%` : fraction;
}

export type AttendeeStatus = 'Present' | 'Late' | 'Absent' | 'Not checked in' | 'Not open yet';

type AttendanceRowLike = { status: string | null } | null | undefined;

// A student's line in a session's attendee list. No row means no check-in: absent once the session is over,
// "Not checked in" while it is open or live, and "Not open yet" before check in opens.
export function attendeeStatus(session: Session, row: AttendanceRowLike): AttendeeStatus {
  if (row?.status === 'present') return 'Present';
  if (row?.status === 'late') return 'Late';
  if (row?.status === 'absent') return 'Absent';
  if (session.status === 'finished' || session.status === 'cancelled') return 'Absent';
  return session.now_local >= session.check_in_opens_at ? 'Not checked in' : 'Not open yet';
}

export type SessionFilterValues = { class_name?: string; lecturer?: string; location_name?: string; status?: string };

export const lecturerLabel = (session: Pick<Session, 'lecturer_first_name' | 'lecturer_last_name'>) =>
  `${session.lecturer_first_name ?? ''} ${session.lecturer_last_name ?? ''}`.trim();

/** The status words shown in the filter: the same labels the badges use. */
export const statusLabel = (session: Pick<Session, 'status'>) => sessionPill(session.status).label;

export function filterSessions(sessions: Session[], filters: SessionFilterValues, search = ''): Session[] {
  const needle = search.trim().toLowerCase();
  return sessions.filter(
    (session) =>
      (!needle || session.class_name.toLowerCase().includes(needle)) &&
      (!filters.class_name || session.class_name === filters.class_name) &&
      (!filters.lecturer || lecturerLabel(session) === filters.lecturer) &&
      (!filters.location_name || session.location_name === filters.location_name) &&
      (!filters.status || statusLabel(session) === filters.status),
  );
}

/** The distinct values present in the loaded sessions, sorted, for a filter's choices. */
export function distinctValues(sessions: Session[], pick: (session: Session) => string | null | undefined): string[] {
  return [...new Set(sessions.map((session) => pick(session) ?? '').filter(Boolean))].sort();
}

export function activeFilterCount(filters: SessionFilterValues): number {
  return Object.values(filters).filter(Boolean).length;
}

/** What replaces the attendance figure on a moved or cancelled session in a list. */
export function movedNote(session: Session): string | null {
  if (session.status === 'cancelled') return 'Not counted';
  if (session.stored_status === 'rescheduled' && session.status === 'rescheduled') {
    return `Moved to ${hhmm(session.start_time)}${session.location_name ? `, ${session.location_name}` : ''}`;
  }
  return null;
}

export type StudentSort = 'name' | 'lowest' | 'highest';

export type StudentRow = { student_id: string; first_name: string; last_name: string; attendance_pct: number | null };

export function sortStudents<T extends StudentRow>(students: T[], sort: StudentSort): T[] {
  const byName = (a: T, b: T) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
  const pct = (row: T) => (row.attendance_pct === null ? -1 : Number(row.attendance_pct));
  return [...students].sort((a, b) => (sort === 'name' ? byName(a, b) : sort === 'lowest' ? pct(a) - pct(b) || byName(a, b) : pct(b) - pct(a) || byName(a, b)));
}

export function searchStudents<T extends StudentRow>(students: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return students;
  return students.filter((student) => `${student.first_name} ${student.last_name} ${student.student_id}`.toLowerCase().includes(needle));
}
