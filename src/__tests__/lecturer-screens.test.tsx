import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Session } from '@/features/sessions/format';
import { LecturerClasses } from '@/features/teaching/lecturer-classes';
import { LecturerHome } from '@/features/teaching/lecturer-home';
import { TeachingClassDetails } from '@/features/teaching/teaching-class-details';
import { TeachingSessionPanel } from '@/features/teaching/teaching-session-panel';

const mockPush = jest.fn();
let mockSessionsByKey: Record<string, unknown[]> = {};
let mockSchedules: unknown[] = [];
let mockSummaries = new Map<number, unknown>();
let mockStudents: unknown[] = [];
let mockAttendees: unknown[] = [];
let mockCounts = new Map<number, unknown>();
let mockWide = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'L1000002', role: 'lecturer' }, can: (key: string) => key === 'sessions.manage_own' || key === 'attendance.edit' }),
}));
jest.mock('@/features/shell/nav', () => ({ ...jest.requireActual('@/features/shell/nav'), useIsWide: () => mockWide, useIsExtraWide: () => mockWide }));
jest.mock('@/features/shell/use-my-profile', () => ({
  useMyProfile: () => ({ data: { id: 'L1000002', first_name: 'Omar', last_name: 'Park', email: 'l1000002@mailinator.com' }, isPending: false }),
}));
jest.mock('@/features/sessions/realtime', () => ({ useAttendanceRealtime: jest.fn() }));
jest.mock('@/features/sessions/queries', () => ({
  useAppNow: () => ({ data: '2026-11-03T10:05:00', isPending: false }),
  useSessions: (key: unknown[]) => ({ data: mockSessionsByKey[String(key[0])] ?? [], isPending: false, isError: false }),
  useAttendanceCounts: () => ({ data: mockCounts }),
  useSchedules: () => ({ data: mockSchedules, isPending: false, isError: false }),
  useSchedule: () => ({ data: mockSchedules[0], isPending: false }),
  useClassSummaries: () => ({ data: mockSummaries }),
  useSessionTotals: () => ({ data: new Map([[4, { held: 6, total: 12 }]]) }),
  useClassStudents: () => ({ data: mockStudents, isPending: false }),
  useAttendanceList: () => ({ data: mockAttendees, isPending: false, refetch: jest.fn() }),
}));

const session = (over: Record<string, unknown> = {}): Session =>
  ({
    session_id: 38,
    schedule_id: 4,
    class_id: 6,
    session_date: '2026-11-03',
    class_name: 'Web Development',
    period_name: '2026 Term 4',
    lecturer_id: 'L1000002',
    lecturer_first_name: 'Omar',
    lecturer_last_name: 'Park',
    location_id: 2,
    location_name: 'Room 1.02',
    start_time: '10:00:00',
    end_time: '12:00:00',
    stored_status: 'scheduled',
    status: 'started',
    starts_at: '2026-11-03T10:00:00',
    ends_at: '2026-11-03T12:00:00',
    check_in_opens_at: '2026-11-03T09:50:00',
    now_local: '2026-11-03T10:05:00',
    ...over,
  }) as unknown as Session;

const schedule = (over: Record<string, unknown> = {}) => ({
  schedule_id: 4,
  class_id: 6,
  class_name: 'Web Development',
  class_description: null,
  period_name: '2026 Term 4',
  period_status: 'active',
  frequency_name: 'weekly',
  lecturer_id: 'L1000002',
  lecturer_first_name: 'Omar',
  lecturer_last_name: 'Park',
  location_name: 'Room 1.02',
  week_day: 1,
  start_time: '10:00:00',
  end_time: '12:00:00',
  ...over,
});

beforeEach(() => {
  mockPush.mockReset();
  mockSessionsByKey = {};
  mockSchedules = [];
  mockSummaries = new Map();
  mockStudents = [];
  mockAttendees = [];
  mockCounts = new Map();
  mockWide = false;
});

describe('Lecturer Home', () => {
  it('greets, shows the live session with its figures and opens it', async () => {
    mockSessionsByKey = { 'teach-today': [session()], 'teach-upcoming': [session({ session_id: 40, session_date: '2026-11-10', status: 'scheduled' })] };
    mockSchedules = [schedule()];
    mockSummaries = new Map([[4, { enrolled: 24, finished_sessions: 6, class_average_pct: 81, students_below_75: 3 }]]);
    mockCounts = new Map([[38, { session_id: 38, enrolled: 24, present: 15, late: 3 }]]);
    await render(<LecturerHome />);

    expect(screen.getByText('Hi, Omar')).toBeTruthy();
    expect(screen.getByText('Live now')).toBeTruthy();
    expect(screen.getByText('18 of 24 checked in · 3 late so far')).toBeTruthy();
    expect(screen.getByText('18/24 · 75%')).toBeTruthy(); // the session card under "Today's sessions"
    expect(screen.getByText('3 students below 75%')).toBeTruthy();
    expect(screen.getByText('Across your 1 class this period')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Open live session' }));
    expect(mockPush).toHaveBeenCalledWith('/session/38');
    await fireEvent.press(screen.getByRole('button', { name: 'See classes' }));
    expect(mockPush).toHaveBeenLastCalledWith('/classes');
  });

  it('says there are no sessions today and still lists what is coming up', async () => {
    mockSessionsByKey = { 'teach-upcoming': [session({ session_id: 40, session_date: '2026-11-10', status: 'rescheduled', stored_status: 'rescheduled' })] };
    await render(<LecturerHome />);
    expect(screen.getByText('No sessions today')).toBeTruthy();
    expect(screen.getByText('You have no sessions today.')).toBeTruthy();
    expect(screen.getByText(/Your next one is/)).toBeTruthy(); // in the banner
    expect(screen.getByText('Rescheduled')).toBeTruthy();
    expect(screen.queryByText('Live now')).toBeNull();
  });
});

describe('Lecturer Classes', () => {
  it('lists the class with enrolment, sessions held and who is below 75%, and has the two tabs', async () => {
    mockSchedules = [schedule(), schedule({ schedule_id: 9, class_name: 'Old Class', period_name: '2026 Term 3', period_status: 'finished' })];
    mockSummaries = new Map([
      [4, { enrolled: 24, finished_sessions: 6, class_average_pct: 81, students_below_75: 3 }],
      [9, { enrolled: 20, finished_sessions: 12, class_average_pct: 90, students_below_75: 0 }],
    ]);
    await render(<LecturerClasses />);
    expect(screen.getByText('Web Development')).toBeTruthy();
    expect(screen.getByText('24 enrolled · 6 of 12 sessions held')).toBeTruthy();
    expect(screen.getByText('3 students below 75%')).toBeTruthy();
    expect(screen.queryByText('Old Class')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Previous periods' }));
    expect(screen.getByText('Old Class')).toBeTruthy();
    expect(screen.queryByText('Web Development')).toBeNull();
  });
});

describe('Class details for a lecturer', () => {
  it('shows the empty state when nobody is enrolled', async () => {
    mockSchedules = [schedule()];
    await render(<TeachingClassDetails scheduleId={4} />);
    expect(screen.getByText('No students enrolled yet')).toBeTruthy();
  });

  it('lists students with a red pill below 75% and opens one', async () => {
    mockSchedules = [schedule()];
    mockStudents = [
      { student_id: 'S1234570', first_name: 'Ada', last_name: 'Kim', attendance_pct: 46, present: 5, late: 1, absent: 7 },
      { student_id: 'S1234567', first_name: 'Dan', last_name: 'Tay', attendance_pct: 92, present: 11, late: 1, absent: 1 },
    ];
    await render(<TeachingClassDetails scheduleId={4} />);
    expect(screen.getByText('46% Below 75%')).toBeTruthy();
    expect(screen.getByText('92% On track')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Ada Kim S1234570' }));
    expect(mockPush).toHaveBeenCalledWith('/student/S1234570?schedule=4');
  });
});

describe('Class details for a lecturer on a wide screen', () => {
  it('has no tabs: the students as a table, and the upcoming and previous sessions beside it', async () => {
    mockWide = true;
    mockSchedules = [schedule()];
    mockStudents = [
      { student_id: 'S1234570', first_name: 'Ada', last_name: 'Kim', attendance_pct: 46, present: 5, late: 1, absent: 7 },
      { student_id: 'S1234567', first_name: 'Dan', last_name: 'Tay', attendance_pct: 92, present: 11, late: 1, absent: 1 },
    ];
    mockSessionsByKey = {
      'schedule-teach': [
        session({ session_id: 1, session_date: '2026-10-27', ends_at: '2026-10-27T12:00:00', status: 'finished' }),
        session({ session_id: 2, session_date: '2026-11-10', ends_at: '2026-11-10T12:00:00', status: 'scheduled' }),
      ],
    };
    mockCounts = new Map([[1, { session_id: 1, enrolled: 24, present: 20, late: 1 }]]);
    await render(<TeachingClassDetails scheduleId={4} />);

    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('Enrolled students (2)')).toBeTruthy();
    expect(screen.getByText('46%')).toBeTruthy();
    expect(screen.getByText('Below 75%')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('On track')).toBeTruthy();
    expect(screen.getAllByText('View')).toHaveLength(2);
    expect(screen.getAllByText('Upcoming')).toHaveLength(2); // the card title and the session's pill
    expect(screen.getByText('Previous')).toBeTruthy();
    expect(screen.getByText('21 of 24 attended')).toBeTruthy();
    expect(screen.getByText('88%')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Ada Kim S1234570' }));
    expect(mockPush).toHaveBeenCalledWith('/student/S1234570?schedule=4');
  });
});

describe('Session panel counts', () => {
  const rows = [
    { student_id: 'S1', first_name: 'Ada', last_name: 'Lovelace', status: 'present', checked_in_at: '2026-11-03T00:01:00+00:00', check_in_method: 'qr' },
    { student_id: 'S2', first_name: 'Alan', last_name: 'Turing', status: 'late', checked_in_at: '2026-11-03T00:12:00+00:00', check_in_method: 'beacon' },
    { student_id: 'S3', first_name: 'Grace', last_name: 'Hopper', status: null, checked_in_at: null, check_in_method: null },
  ];

  it('puts the figures in one banner on a phone, and each student in a card that opens the record', async () => {
    mockAttendees = rows;
    await render(<TeachingSessionPanel session={session()} />);
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.getByText('Checked in')).toBeTruthy();
    expect(screen.getByText('Session attendees')).toBeTruthy();
    expect(screen.queryByText('View')).toBeNull();
    await fireEvent.press(screen.getByText('Alan Turing'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/attendance\/\d+\/S2$/));
  });

  it('says Attended, Present, Late and Absent once the session is over', async () => {
    mockAttendees = rows;
    await render(<TeachingSessionPanel session={session({ status: 'finished', now_local: '2026-11-03T13:00:00' })} />);
    expect(screen.getByText('Attended')).toBeTruthy();
    expect(screen.getAllByText('Absent')).toHaveLength(2); // the figure and Grace's status
  });

  it('shows four cards and a table with one line per student on a wide screen', async () => {
    mockWide = true;
    mockAttendees = rows;
    await render(<TeachingSessionPanel session={session()} />);
    expect(screen.getByText('Session attendance')).toBeTruthy();
    expect(screen.getByText('2 of 3 checked in')).toBeTruthy();
    expect(screen.getByText('Present on time')).toBeTruthy();
    expect(screen.getByText('Present late')).toBeTruthy();
    expect(screen.getByText('Not checked in yet')).toBeTruthy();
    expect(screen.getByText('Session attendees')).toBeTruthy();
    expect(screen.getByText('Checked in at')).toBeTruthy();
    expect(screen.getByText('Method')).toBeTruthy();
    expect(screen.getAllByText('View')).toHaveLength(3);
    expect(screen.getByText('QR')).toBeTruthy();
    expect(screen.getByText('Not checked in')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Ada Lovelace S1, Present' }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/attendance\/\d+\/S1$/));
  });

  it('calls the last card Absent once the session is over', async () => {
    mockWide = true;
    mockAttendees = rows;
    await render(<TeachingSessionPanel session={session({ status: 'finished', now_local: '2026-11-03T13:00:00' })} />);
    expect(screen.queryByText('Not checked in yet')).toBeNull();
    expect(screen.getAllByText('Absent')).toHaveLength(2); // the card and Grace's status
  });

  it('says when check in opens, with no figures yet, before the session', async () => {
    mockAttendees = rows.map((row) => ({ ...row, status: null }));
    await render(<TeachingSessionPanel session={session({ status: 'scheduled', now_local: '2026-11-03T09:00:00' })} />);
    expect(screen.getByText('Check in opens at 09:50')).toBeTruthy();
    expect(screen.getByText('0 of 3 checked in')).toBeTruthy();
    expect(screen.getByText('Enrolled students')).toBeTruthy();
    expect(screen.getAllByText('Not open yet')).toHaveLength(3);
  });

  it('keeps only student, ID and status in the table before the session', async () => {
    mockWide = true;
    mockAttendees = rows.map((row) => ({ ...row, status: null }));
    await render(<TeachingSessionPanel session={session({ status: 'scheduled', now_local: '2026-11-03T09:00:00' })} />);
    expect(screen.queryByText('Present on time')).toBeNull();
    expect(screen.queryByText('Checked in at')).toBeNull();
    expect(screen.getAllByText('Not open yet')).toHaveLength(3);
  });
});
