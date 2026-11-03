// The rules and words of the Change attendance flow. Pure, so they can be tested without a database. The server
// (public.change_attendance) is the source of truth; these only decide what to show and catch mistakes early.
import { hhmm, melbourneTime, type Session } from '@/features/sessions/format';

export type EditableStatus = 'present' | 'late' | 'absent';

export const statusChoices: { value: EditableStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

/** "Present", "Late", "Absent", or "Not checked in" when there is no record yet. */
export function statusWord(status: string | null | undefined): string {
  return status === 'present' ? 'Present' : status === 'late' ? 'Late' : status === 'absent' ? 'Absent' : 'Not checked in';
}

export const REASON_MAX = 500;

/** Attendance can be changed once a session has started, by an admin or by the lecturer of that session. */
export function canChangeAttendance(session: Pick<Session, 'status' | 'lecturer_id'>, can: (key: string) => boolean, userId: string | null | undefined): boolean {
  if (session.status !== 'started' && session.status !== 'finished') return false;
  return can('attendance.edit_all') || (can('attendance.edit') && Boolean(userId) && session.lecturer_id === userId);
}

/** The time offered first: the time already recorded, else the session start. */
export function defaultTime(session: Pick<Session, 'start_time'>, checkedInIso: string | null | undefined): string {
  return melbourneTime(checkedInIso) || hhmm(session.start_time);
}

export type ChangeInput = { status: EditableStatus; time: string; reason: string };
export type ChangeErrors = { time?: string; reason?: string };

export function validateChange(session: Pick<Session, 'session_date' | 'check_in_opens_at' | 'ends_at'>, input: ChangeInput): ChangeErrors {
  const errors: ChangeErrors = {};
  const reason = input.reason.trim();
  if (!reason) errors.reason = 'Enter a reason for this change.';
  else if (reason.length > REASON_MAX) errors.reason = `The reason can be up to ${REASON_MAX} characters.`;

  if (input.status !== 'absent') {
    if (!/^\d{2}:\d{2}$/.test(input.time)) {
      errors.time = 'Choose the check in time.';
    } else {
      const at = `${session.session_date}T${input.time}:00`;
      if (at < session.check_in_opens_at || at >= session.ends_at) {
        errors.time = `Choose a time between ${session.check_in_opens_at.slice(11, 16)} and ${session.ends_at.slice(11, 16)}.`;
      }
    }
  }
  return errors;
}

/** The sentence under the form: what the change does. */
export function changeSentence(oldStatus: string | null | undefined, newStatus: EditableStatus): string {
  const saved = "Saved with your name; the student's class percentage updates.";
  return oldStatus
    ? `Changes ${statusWord(oldStatus)} to ${statusWord(newStatus)}. ${saved}`
    : `Checks the student in as ${statusWord(newStatus)}. ${saved}`;
}

/** "07:00 · Manual", or "-" for absent. */
export const checkedInSummary = (status: EditableStatus, time: string) => (status === 'absent' ? '-' : `${time} · Manual`);

export function describeChangeError(code: string): string {
  switch (code) {
    case 'not_allowed':
      return 'You can only change attendance for sessions you teach.';
    case 'session_not_found':
      return 'This session could not be found.';
    case 'cancelled':
      return 'This session is cancelled, so its attendance cannot be changed.';
    case 'not_editable':
      return 'Attendance can be changed once the session has started.';
    case 'not_enrolled':
      return 'This student is not enrolled in the class.';
    case 'reason_required':
      return 'Enter a reason for this change.';
    case 'reason_too_long':
      return `The reason can be up to ${REASON_MAX} characters.`;
    case 'invalid_time':
      return 'Choose a time between when check in opened and the end of the session.';
    case 'no_change':
      return 'Nothing to change. Choose a different status or time.';
    default:
      return 'The change could not be saved. Check the connection and try again.';
  }
}
