import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { changeAttendance } from '@/features/attendance-edit/api';
import { AttendanceRecord } from '@/features/attendance-edit/attendance-record';
import {
  canChangeAttendance,
  changeSentence,
  checkedInSummary,
  defaultTime,
  describeChangeError,
  statusWord,
  validateChange,
} from '@/features/attendance-edit/logic';
import { melbourneDateTime, melbourneTime } from '@/features/sessions/format';
import { queryClient } from '@/lib/query-client';

const mockRpc = jest.fn();
let mockCan: (key: string) => boolean = () => true;
let mockQueryData: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'L1000002' }, can: (key: string) => mockCan(key) }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('@/features/sessions/queries', () => ({
  useSession: () => ({ isPending: false, data: mockQueryData.session }),
  useAttendanceRecord: () => ({ isPending: false, data: mockQueryData.record }),
  useStudentInfo: () => ({ isPending: false, data: mockQueryData.student }),
  useAttendanceHistory: () => ({ isPending: false, data: mockQueryData.history }),
}));

const session = {
  session_id: 7,
  schedule_id: 3,
  lecturer_id: 'L1000002',
  class_name: 'Database Systems',
  session_date: '2026-10-23',
  location_name: 'Room 2.05',
  start_time: '07:00:00',
  end_time: '08:30:00',
  status: 'finished',
  starts_at: '2026-10-23T07:00:00',
  ends_at: '2026-10-23T08:30:00',
  check_in_opens_at: '2026-10-23T06:50:00',
  now_local: '2026-10-23T09:00:00',
};
const student = { id: 'S1234570', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' };
const absentRecord = { student_id: 'S1234570', session_id: 7, status: 'absent', checked_in_at: null, check_in_method: null, comments: null, updated_at: '2026-10-23T08:30:00Z' };

beforeEach(() => {
  mockRpc.mockReset();
  mockCan = () => true;
  mockQueryData = {
    session,
    student,
    record: absentRecord,
    history: [{ changed_at: '2026-10-22T21:30:00+00:00', old_status: null, new_status: 'absent', old_checked_in_at: null, new_checked_in_at: null, new_check_in_method: null, reason: null, changed_by: null, changed_by_name: null }],
  };
});

describe('attendance edit rules', () => {
  const edit = (can: (key: string) => boolean, status: string, lecturer = 'L1000002') =>
    canChangeAttendance({ status, lecturer_id: lecturer } as never, can, 'L1000002');

  it('allows the lecturer of a started or finished session, and admins with edit_all', () => {
    const lecturer = (key: string) => key === 'attendance.edit';
    expect(edit(lecturer, 'started')).toBe(true);
    expect(edit(lecturer, 'finished')).toBe(true);
    expect(edit(lecturer, 'finished', 'L1000009')).toBe(false);
    expect(edit((key) => key === 'attendance.edit_all', 'finished', 'L1000009')).toBe(true);
    expect(edit(() => false, 'finished')).toBe(false);
  });

  it('does not allow changes before the session starts or when it is cancelled', () => {
    expect(edit(() => true, 'scheduled')).toBe(false);
    expect(edit(() => true, 'rescheduled')).toBe(false);
    expect(edit(() => true, 'cancelled')).toBe(false);
  });

  it('requires a reason', () => {
    expect(validateChange(session, { status: 'present', time: '07:00', reason: '' }).reason).toBeTruthy();
    expect(validateChange(session, { status: 'present', time: '07:00', reason: '   ' }).reason).toBeTruthy();
    expect(validateChange(session, { status: 'present', time: '07:00', reason: 'Phone died' })).toEqual({});
    expect(validateChange(session, { status: 'present', time: '07:00', reason: 'x'.repeat(501) }).reason).toMatch(/500/);
  });

  it('keeps the time inside the check in window, and ignores it for absent', () => {
    expect(validateChange(session, { status: 'late', time: '09:00', reason: 'r' }).time).toBe('Choose a time between 06:50 and 08:30.');
    expect(validateChange(session, { status: 'late', time: '06:40', reason: 'r' }).time).toBeTruthy();
    expect(validateChange(session, { status: 'late', time: '', reason: 'r' }).time).toBeTruthy();
    expect(validateChange(session, { status: 'absent', time: '', reason: 'r' })).toEqual({});
  });

  it('words the change and the status', () => {
    expect(statusWord('late')).toBe('Late');
    expect(statusWord(null)).toBe('Not checked in');
    expect(changeSentence('absent', 'present')).toMatch(/^Changes Absent to Present\. Saved with your name/);
    expect(changeSentence(undefined, 'present')).toMatch(/^Checks the student in as Present/);
    expect(changeSentence('late', 'late', false)).toBe('Nothing has changed yet. Choose a different status or time.');
    expect(checkedInSummary('present', '07:00')).toBe('07:00 · Manual');
    expect(checkedInSummary('absent', '07:00')).toBe('-');
    expect(describeChangeError('not_allowed')).toMatch(/sessions you teach/);
    expect(describeChangeError('boom')).toMatch(/could not be saved/);
  });

  it('offers the recorded time first, else the session start', () => {
    expect(defaultTime(session, null)).toBe('07:00');
    expect(defaultTime(session, '2026-10-22T20:12:00+00:00')).toBe('07:12');
  });

  it('shows times in Melbourne time', () => {
    expect(melbourneTime('2026-10-22T21:30:00+00:00')).toBe('08:30');
    expect(melbourneDateTime('2026-10-22T21:30:00+00:00')).toBe('23/10/2026 08:30');
    expect(melbourneTime(null)).toBe('');
  });
});

describe('change attendance api', () => {
  const input = { sessionId: 7, studentId: 'S1234570', status: 'present' as const, time: '07:00', reason: 'Phone died' };

  it('sends the change and returns the new state', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, status: 'present', checked_in_at: '2026-10-22T20:00:00+00:00' }, error: null });
    expect(await changeAttendance(input)).toEqual({ ok: true, status: 'present', checkedInAt: '2026-10-22T20:00:00+00:00' });
    expect(mockRpc).toHaveBeenCalledWith('change_attendance', { p_student_id: 'S1234570', p_session_id: 7, p_status: 'present', p_time: '07:00', p_reason: 'Phone died' });
  });

  it('sends no time for absent', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, status: 'absent', checked_in_at: null }, error: null });
    await changeAttendance({ ...input, status: 'absent' });
    expect(mockRpc).toHaveBeenCalledWith('change_attendance', expect.objectContaining({ p_status: 'absent', p_time: null }));
  });

  it('turns a refusal into words instead of throwing', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, code: 'not_allowed' }, error: null });
    expect(await changeAttendance(input)).toMatchObject({ ok: false, code: 'not_allowed', message: expect.stringMatching(/sessions you teach/) });
  });

  it('reports a lost connection', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });
    expect(await changeAttendance(input)).toMatchObject({ ok: false, code: 'network' });
    mockRpc.mockRejectedValue(new Error('offline'));
    expect(await changeAttendance(input)).toMatchObject({ ok: false, code: 'network' });
  });
});

describe('attendance record screen', () => {
  const renderRecord = async (startEditing = false) =>
    await render(
      <QueryClientProvider client={queryClient}>
        <AttendanceRecord sessionId={7} studentId="S1234570" startEditing={startEditing} />
      </QueryClientProvider>,
    );

  it('shows the record, who last changed it and the history', async () => {
    await renderRecord();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Absent')).toBeTruthy();
    expect(screen.getByText(/Last changed by System, 23\/10\/2026 08:30/)).toBeTruthy();
    expect(screen.getByText('Change attendance')).toBeTruthy();
    expect(screen.getByText("View student's attendance")).toBeTruthy();
  });

  it('picks the status with the three tiles, one at a time', async () => {
    await renderRecord();
    await fireEvent.press(screen.getByText('Change attendance'));
    const tile = (name: string) => screen.getByRole('radio', { name });
    // Absent records start on Present, like the old chips.
    expect(tile('Present').props.accessibilityState.checked).toBe(true);
    await fireEvent.press(tile('Late'));
    expect(tile('Late').props.accessibilityState.checked).toBe(true);
    expect(tile('Present').props.accessibilityState.checked).toBe(false);
    await fireEvent.press(tile('Absent'));
    expect(tile('Absent').props.accessibilityState.checked).toBe(true);
    expect(screen.queryByLabelText('Checked in at')).toBeNull();
  });

  it('says nothing has changed until the status or time differs', async () => {
    mockQueryData = { ...mockQueryData, record: { ...absentRecord, status: 'late', checked_in_at: '2026-10-22T21:05:00+00:00', check_in_method: 'qr' } };
    await renderRecord();
    await fireEvent.press(screen.getByText('Change attendance'));
    expect(screen.getByText('Nothing has changed yet. Choose a different status or time.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Present'));
    expect(screen.getByText(/^Changes Late to Present\./)).toBeTruthy();
  });

  it('hides the change button from someone who may not edit', async () => {
    mockCan = () => false;
    await renderRecord();
    expect(screen.queryByText('Change attendance')).toBeNull();
    expect(screen.getByText('Only the lecturer of this session or an admin can change this record.')).toBeTruthy();
  });

  it('blocks Save without a reason', async () => {
    await renderRecord();
    await fireEvent.press(screen.getByText('Change attendance'));
    await fireEvent.press(screen.getByText('Save change'));
    expect(await screen.findByText('Enter a reason for this change.')).toBeTruthy();
    expect(screen.queryByText('Save this change?')).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('confirms in a second step, then saves with the reason', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, status: 'present', checked_in_at: '2026-10-22T20:00:00+00:00' }, error: null });
    await renderRecord();
    await fireEvent.press(screen.getByText('Change attendance'));
    await fireEvent.changeText(screen.getByLabelText('Reason (required)'), '  Phone battery died ');
    await fireEvent.press(screen.getByText('Save change'));
    expect(await screen.findByText('Save this change?')).toBeTruthy();
    expect(screen.getByText('Absent → Present')).toBeTruthy();
    expect(screen.getByText('07:00 · Manual')).toBeTruthy();
    expect(screen.getByText('Phone battery died')).toBeTruthy();
    expect(mockRpc).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Save change'));
    expect(await screen.findByText('The change was saved with your name.')).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledWith('change_attendance', { p_student_id: 'S1234570', p_session_id: 7, p_status: 'present', p_time: '07:00', p_reason: 'Phone battery died' });
  });

  it('goes back to the form with the reason when the server refuses', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, code: 'not_allowed' }, error: null });
    await renderRecord();
    await fireEvent.press(screen.getByText('Change attendance'));
    await fireEvent.changeText(screen.getByLabelText('Reason (required)'), 'Phone battery died');
    await fireEvent.press(screen.getByText('Save change'));
    await fireEvent.press(await screen.findByText('Save change'));
    expect(await screen.findByText('You can only change attendance for sessions you teach.')).toBeTruthy();
    expect(screen.getByDisplayValue('Phone battery died')).toBeTruthy();
  });

  it('opens straight on the form from Check in manually', async () => {
    mockQueryData = { ...mockQueryData, session: { ...session, status: 'started' }, record: null };
    await renderRecord(true);
    expect(screen.getByLabelText('Reason (required)')).toBeTruthy();
    expect(screen.getByText(/Checks the student in as Present/)).toBeTruthy();
  });
});
