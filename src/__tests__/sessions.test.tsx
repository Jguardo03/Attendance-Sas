import { render, screen } from '@testing-library/react-native';

import { SessionCard } from '@/features/sessions/components/session-card';
import {
  attendanceLabel,
  checkInState,
  checkedInAt,
  methodLabel,
  slotLabel,
  statusBadge,
  type MyAttendance,
  type Session,
} from '@/features/sessions/format';
import { addDays, formatDayLong, formatDayShort, startOfWeek } from '@/lib/dates';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

// A Monday session 09:00 to 11:00; check in opens at 08:50.
const session = (overrides: Partial<Session> = {}): Session => ({
  session_id: 1,
  schedule_id: 1,
  session_date: '2026-11-02',
  class_id: 1,
  class_name: 'Introduction to Programming',
  class_description: null,
  period_name: '2026 Term 4',
  period_status: 'active',
  frequency_name: 'weekly',
  lecturer_id: 'L1000001',
  lecturer_first_name: 'Lena',
  lecturer_last_name: 'Lee',
  lecturer_email: 'l1000001@mailinator.com',
  location_id: 1,
  location_name: 'Room 1.01',
  week_day: 1,
  start_time: '09:00:00',
  end_time: '11:00:00',
  stored_status: 'scheduled',
  status: 'scheduled',
  starts_at: '2026-11-02T09:00:00',
  ends_at: '2026-11-02T11:00:00',
  check_in_opens_at: '2026-11-02T08:50:00',
  now_local: '2026-11-02T08:00:00',
  ...overrides,
});

const row = (status: MyAttendance['status'], method: MyAttendance['check_in_method'] = 'qr'): MyAttendance => ({
  session_id: 1,
  status,
  checked_in_at: status === 'absent' ? null : '2026-11-01T22:05:00+00:00',
  check_in_method: status === 'absent' ? null : method,
});

describe('check in button states', () => {
  it('shows when check in opens, 10 minutes before the start', () => {
    expect(checkInState(session())).toMatchObject({ kind: 'not_open', label: 'Opens at 08:50' });
  });

  it('is open from 08:50 and explains the late rule', () => {
    const state = checkInState(session({ now_local: '2026-11-02T08:50:00' }));
    expect(state.kind).toBe('open');
    expect(state.label).toBe('Check in');
    expect(state.help).toBe('Check in is open until 11:00. Checking in after 09:00 counts as late.');
    expect(checkInState(session({ now_local: '2026-11-02T10:59:59', status: 'started' })).kind).toBe('open');
  });

  it('is closed once the session has ended', () => {
    expect(checkInState(session({ now_local: '2026-11-02T11:00:00', status: 'finished' }))).toMatchObject({ kind: 'closed', label: 'Closed' });
  });

  it('is not available for a cancelled session, whatever the time', () => {
    expect(checkInState(session({ status: 'cancelled', now_local: '2026-11-02T09:30:00' }))).toMatchObject({ kind: 'not_available', label: 'Not available' });
  });

  it('shows checked in once the student has a present or late row, but not for an absent row', () => {
    expect(checkInState(session({ now_local: '2026-11-02T09:30:00' }), row('late')).kind).toBe('checked_in');
    expect(checkInState(session({ now_local: '2026-11-02T09:30:00' }), row('absent')).kind).toBe('open');
  });
});

describe('labels', () => {
  it('names the session status as in the state diagram', () => {
    expect(statusBadge('scheduled')).toEqual({ label: 'Upcoming', tone: 'neutral' });
    expect(statusBadge('rescheduled').label).toBe('Rescheduled');
    expect(statusBadge('started')).toEqual({ label: 'Live', tone: 'success' });
    expect(statusBadge('finished').label).toBe('Finished');
    expect(statusBadge('cancelled')).toEqual({ label: 'Cancelled', tone: 'danger' });
  });

  it('reports attendance for a finished session: no row means absent', () => {
    const finished = session({ status: 'finished' });
    expect(attendanceLabel(finished, row('present'))).toBe('Present');
    expect(attendanceLabel(finished, row('late'))).toBe('Late');
    expect(attendanceLabel(finished, null)).toBe('Absent');
    expect(attendanceLabel(session(), null)).toBe('Not checked in yet');
    expect(attendanceLabel(session({ status: 'cancelled' }), null)).toBe('Cancelled');
  });

  it('formats check in details', () => {
    expect(methodLabel('nfc')).toBe('NFC');
    expect(methodLabel(null)).toBe('-');
    expect(checkedInAt(null)).toBe('-');
    // 22:05 UTC is 09:05 in Melbourne (daylight saving) on 2 Nov 2026
    expect(checkedInAt(row('present'))).toBe('09:05');
    expect(slotLabel(1, '09:00:00', '11:00:00')).toBe('Mon · 09:00 to 11:00');
  });
});

describe('week maths', () => {
  it('finds the Monday of any day and moves across months and years', () => {
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('formats days like the wireframes', () => {
    expect(formatDayShort('2026-10-27')).toBe('Tue 27 Oct');
    expect(formatDayLong('2026-10-23')).toBe('Fri 23 Oct 2026');
  });
});

describe('SessionCard', () => {
  it('shows class, badge, time, room and lecturer, and when check in opens', async () => {
    await render(<SessionCard session={session()} showMyAttendance />);
    expect(screen.getByText('Introduction to Programming')).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
    expect(screen.getByText('09:00 to 11:00 · Room 1.01')).toBeTruthy();
    expect(screen.getByText('Lena Lee')).toBeTruthy();
    expect(screen.getByText('Check in opens at 08:50')).toBeTruthy();
  });

  it('shows the student attendance on a finished session and the rescheduled badge', async () => {
    await render(<SessionCard session={session({ status: 'finished' })} attendance={row('late')} showMyAttendance />);
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.getByText('My attendance: Late')).toBeTruthy();
  });
});
