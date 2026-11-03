// What the session screens show, worked out from a session_overview row. No data fetching here, so it can be tested.
import type { BadgeTone } from '@/components/ui';
import { formatDayLong, formatDayShort } from '@/lib/dates';

export type SessionStatus = 'scheduled' | 'rescheduled' | 'started' | 'finished' | 'cancelled';

export type Session = {
  session_id: number;
  schedule_id: number;
  session_date: string;
  class_id: number;
  class_name: string;
  class_description: string | null;
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
  stored_status: SessionStatus;
  status: SessionStatus;
  starts_at: string;
  ends_at: string;
  check_in_opens_at: string;
  now_local: string;
};

export type MyAttendance = {
  session_id: number;
  status: 'present' | 'late' | 'absent';
  checked_in_at: string | null;
  check_in_method: 'beacon' | 'nfc' | 'qr' | 'manual' | null;
  /** The reason saved with a manual change. */
  comments?: string | null;
};

export const hhmm = (value: string | null | undefined) => String(value ?? '').slice(0, 5);

export const timeRange = (session: Pick<Session, 'start_time' | 'end_time'>) =>
  `${hhmm(session.start_time)} to ${hhmm(session.end_time)}`;

export const lecturerName = (session: Pick<Session, 'lecturer_first_name' | 'lecturer_last_name'>) =>
  `${session.lecturer_first_name ?? ''} ${session.lecturer_last_name ?? ''}`.trim();

export { formatDayLong, formatDayShort };

/**
 * The session pill: labels from the session state diagram (a session moved to a new time or room reads "Rescheduled"
 * until it starts; once it is live or over, the live state wins). Live is solid blue with a dot, Upcoming a blue tint.
 */
export function sessionPill(status: SessionStatus): { label: string; tone: BadgeTone; dot: boolean } {
  switch (status) {
    case 'started':
      return { label: 'Live', tone: 'live', dot: true };
    case 'finished':
      return { label: 'Finished', tone: 'neutral', dot: false };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'cancelled', dot: false };
    case 'rescheduled':
      return { label: 'Rescheduled', tone: 'rescheduled', dot: false };
    default:
      return { label: 'Upcoming', tone: 'upcoming', dot: false };
  }
}

/** The attendance pill for a word such as Present, Late, Absent or Not checked in yet. */
export function attendancePill(label: string): { tone: BadgeTone; dot: true } {
  return { tone: label === 'Present' ? 'success' : label === 'Late' ? 'warning' : label === 'Absent' ? 'danger' : 'neutral', dot: true };
}

const methodNames = { beacon: 'Beacon', nfc: 'NFC', qr: 'QR', manual: 'Manual' } as const;
export const methodLabel = (method: MyAttendance['check_in_method']) => (method ? methodNames[method] : '-');

export type CheckInState = {
  kind: 'checked_in' | 'not_open' | 'open' | 'closed' | 'not_available';
  /** The text on the (disabled for now) Check in button. */
  label: string;
  /** The sentence under it. */
  help: string;
};

// The button states from the check-in state diagram. Times are the server's local wall-clock text
// (YYYY-MM-DDTHH:MM:SS), which compares correctly as plain text. The window opens 10 minutes before the start;
// checking in after the start counts as late.
export function checkInState(session: Session, attendance?: MyAttendance | null): CheckInState {
  if (attendance && attendance.status !== 'absent') {
    return { kind: 'checked_in', label: 'Checked in', help: `You are marked ${attendance.status}.` };
  }
  if (session.status === 'cancelled') {
    return { kind: 'not_available', label: 'Not available', help: 'This session is cancelled.' };
  }
  if (session.now_local < session.check_in_opens_at) {
    const opens = session.check_in_opens_at.slice(11, 16);
    return { kind: 'not_open', label: `Opens at ${opens}`, help: 'Check in opens 10 minutes before the session starts.' };
  }
  if (session.now_local >= session.ends_at || session.status === 'finished') {
    return { kind: 'closed', label: 'Closed', help: 'Check in closed when the session ended.' };
  }
  return {
    kind: 'open',
    label: 'Check in',
    help: `Check in is open until ${hhmm(session.end_time)}. Checking in after ${hhmm(session.start_time)} counts as late.`,
  };
}

/** "Present", "Late", "Absent" for a finished session (no row means no check-in, so absent), else the open state. */
export function attendanceLabel(session: Session, attendance?: MyAttendance | null): string {
  if (session.status === 'cancelled') return 'Cancelled';
  if (attendance && attendance.status !== 'absent') return attendance.status === 'late' ? 'Late' : 'Present';
  if (session.status === 'finished') return 'Absent';
  return 'Not checked in yet';
}

/** "08:54" in Melbourne time from a stored instant, or '' when there is none. */
export function melbourneTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** "23/10/2026 08:30" in Melbourne time from a stored instant, or '' when there is none. */
export function melbourneDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const date = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
    return `${date} ${melbourneTime(iso)}`;
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function checkedInAt(attendance?: Partial<MyAttendance> | null): string {
  return melbourneTime(attendance?.checked_in_at) || '-';
}

/** "09:00 to 11:00 · Room 1.01" */
export const whenAndWhere = (session: Session) =>
  `${timeRange(session)}${session.location_name ? ` · ${session.location_name}` : ''}`;

/** Day and time of a class: "Mon · 09:00 to 11:00" */
export function slotLabel(weekDay: number, start: string, end: string) {
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return `${days[weekDay] ?? ''} · ${hhmm(start)} to ${hhmm(end)}`;
}
