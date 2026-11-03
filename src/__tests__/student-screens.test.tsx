import { fireEvent, render, screen } from '@testing-library/react-native';

import ProfileScreen from '@/app/(app)/(tabs)/profile';
import { SessionCard } from '@/features/sessions/components/session-card';
import { UpcomingRow } from '@/features/sessions/components/upcoming-row';
import { attendancePill, sessionPill } from '@/features/sessions/format';
import { SessionDetails } from '@/features/sessions/session-details';
import { WeekCalendar } from '@/features/sessions/week-calendar';
import { totalsOf } from '@/features/student/attendance-summary';
import { StudentClasses } from '@/features/student/classes';
import { StudentHome } from '@/features/student/home';

const mockPush = jest.fn();
const mockMarkStart = jest.fn();
let mockWide = false;
let mockNow = '2026-11-03T10:05:00';
let mockSessionsByKey: Record<string, unknown[]> = {};
let mockAttendance = new Map<number, unknown>();
let mockSchedules: unknown[] = [];
let mockOverview = new Map<number, unknown>();
let mockSession: unknown = null;
let mockAttendees: unknown[] = [];
let mockCan: (key: string) => boolean = (key) => key === 'attendance.check_in'; // a student
let mockRole = 'student';
let mockProfile: unknown = { id: 'S1000002', first_name: 'Leo', last_name: 'Santos', email: 's1000002@mailinator.com' };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }) }));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'S1000002', role: mockRole }, can: (key: string) => mockCan(key), signOut: jest.fn() }),
}));
jest.mock('@/features/check-in/timing', () => ({ markCheckInStart: () => mockMarkStart() }));
jest.mock('@/features/shell/nav', () => ({ ...jest.requireActual('@/features/shell/nav'), useIsWide: () => mockWide, useIsExtraWide: () => mockWide }));
jest.mock('@/features/shell/use-my-profile', () => ({ useMyProfile: () => ({ data: mockProfile, isPending: false, isError: false }) }));
jest.mock('@/features/sessions/realtime', () => ({ useAttendanceRealtime: jest.fn() }));
jest.mock('@/features/sessions/queries', () => ({
  useAppNow: () => ({ data: mockNow, isPending: false }),
  useSessions: (key: unknown[]) => ({ data: mockSessionsByKey[String(key[0])] ?? [], isPending: false, isError: false }),
  useMyAttendance: () => ({ data: mockAttendance }),
  useSchedules: () => ({ data: mockSchedules, isPending: false, isError: false }),
  useStudentOverview: () => ({ data: mockOverview }),
  useSession: () => ({ data: mockSession, isPending: false }),
  useAttendees: () => ({ data: mockAttendees, isPending: false }),
}));

const session = (over: Record<string, unknown> = {}) => ({
  session_id: 38,
  schedule_id: 4,
  class_id: 6,
  session_date: '2026-11-03',
  class_name: 'Web Development',
  period_name: '2026 Term 4',
  lecturer_id: 'L1000002',
  lecturer_first_name: 'Omar',
  lecturer_last_name: 'Park',
  lecturer_email: 'l1000002@mailinator.com',
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
});

const schedule = (over: Record<string, unknown> = {}) => ({
  schedule_id: 4,
  class_id: 6,
  class_name: 'Web Development',
  period_name: '2026 Term 4',
  period_status: 'active',
  lecturer_id: 'L1000002',
  lecturer_first_name: 'Omar',
  lecturer_last_name: 'Park',
  location_name: 'Room 1.02',
  week_day: 2,
  start_time: '10:00:00',
  end_time: '12:00:00',
  ...over,
});

const numbers = (over: Record<string, unknown> = {}) => ({ schedule_id: 4, finished_sessions: 4, present: 3, late: 0, absent: 1, attendance_pct: 75, ...over });

beforeEach(() => {
  mockPush.mockReset();
  mockMarkStart.mockReset();
  mockWide = false;
  mockNow = '2026-11-03T10:05:00';
  mockSessionsByKey = {};
  mockAttendance = new Map();
  mockSchedules = [schedule()];
  mockOverview = new Map([[4, numbers()]]);
  mockSession = session();
  mockAttendees = [];
  mockCan = (key) => key === 'attendance.check_in';
  mockRole = 'student';
  mockProfile = { id: 'S1000002', first_name: 'Leo', last_name: 'Santos', email: 's1000002@mailinator.com' };
});

describe('session and attendance pills', () => {
  it('maps each session status to the mockup pill', () => {
    expect(sessionPill('started')).toEqual({ label: 'Live', tone: 'live', dot: true });
    expect(sessionPill('scheduled')).toEqual({ label: 'Upcoming', tone: 'upcoming', dot: false });
    expect(sessionPill('finished')).toEqual({ label: 'Finished', tone: 'neutral', dot: false });
    expect(sessionPill('cancelled').tone).toBe('cancelled');
    expect(sessionPill('rescheduled').tone).toBe('rescheduled');
  });

  it('maps the attendance words to green, yellow, red and grey, always with a dot', () => {
    expect(attendancePill('Present')).toEqual({ tone: 'success', dot: true });
    expect(attendancePill('Late').tone).toBe('warning');
    expect(attendancePill('Absent').tone).toBe('danger');
    expect(attendancePill('Not checked in yet').tone).toBe('neutral');
  });
});

describe('SessionCard', () => {
  it('offers Check in while check in is open, and opens the check in screen', async () => {
    await render(<SessionCard session={session() as never} showMyAttendance />);
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    expect(mockMarkStart).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/check-in/38');
  });

  it('says when check in opens, with a button that cannot be pressed', async () => {
    const early = session({ status: 'scheduled', now_local: '2026-11-03T09:00:00' });
    await render(<SessionCard session={early as never} showMyAttendance />);
    expect(screen.getByRole('button', { name: 'Check in opens at 09:50' })).toBeDisabled();
  });

  it('has no check in button for a lecturer or in a plain list', async () => {
    await render(<SessionCard session={session() as never} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Omar Park')).toBeTruthy();
  });

  it('opens the session when the card is pressed', async () => {
    await render(<SessionCard session={session() as never} />);
    await fireEvent.press(screen.getByRole('link', { name: 'Web Development, Live' }));
    expect(mockPush).toHaveBeenCalledWith('/session/38');
  });
});

describe('UpcomingRow', () => {
  it('shows the date block, the class, the time and room, and the pill', async () => {
    await render(<UpcomingRow session={session({ session_date: '2026-11-09', status: 'scheduled' }) as never} />);
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('Web Development')).toBeTruthy();
    expect(screen.getByText('10:00 · Room 1.02')).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });
});

describe('attendance totals', () => {
  it('adds the per-class numbers from the database', () => {
    expect(totalsOf([numbers(), numbers({ schedule_id: 5, finished_sessions: 2, present: 1, late: 1, absent: 0 })] as never)).toEqual({ present: 4, late: 1, absent: 1, finished: 6 });
    expect(totalsOf(undefined)).toEqual({ present: 0, late: 0, absent: 0, finished: 0 });
  });
});

describe('Student Home', () => {
  it('greets the student and shows the live session with a Check in button', async () => {
    mockSessionsByKey = { today: [session()], upcoming: [session({ session_id: 39, session_date: '2026-11-09', status: 'scheduled' })] };
    await render(<StudentHome />);
    expect(screen.getByText('Hi, Leo')).toBeTruthy();
    expect(screen.getByText('Tue 3 Nov 2026')).toBeTruthy();
    expect(screen.getByText('Live now')).toBeTruthy();
    expect(screen.getByText("Today's sessions")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Check in now' }));
    expect(mockPush).toHaveBeenCalledWith('/check-in/38');
  });

  it('shows My attendance and Coming up', async () => {
    mockSessionsByKey = { today: [session()], upcoming: [session({ session_id: 39, session_date: '2026-11-09', status: 'scheduled' })] };
    await render(<StudentHome />);
    expect(screen.getByText('My attendance')).toBeTruthy();
    expect(screen.getByText('4 finished sessions')).toBeTruthy();
    expect(screen.getByText('Coming up')).toBeTruthy();
  });

  it('shows a friendly empty state with the next session when nothing is on today', async () => {
    mockSessionsByKey = { today: [], upcoming: [session({ session_id: 39, session_date: '2026-11-09', status: 'scheduled' })] };
    await render(<StudentHome />);
    expect(screen.getByText('No sessions today')).toBeTruthy();
    expect(screen.getByText('Enjoy the free time.')).toBeTruthy();
    expect(screen.getByText('No sessions today. Your next one is Mon 9 Nov at 10:00.')).toBeTruthy(); // in the banner
    await fireEvent.press(screen.getByRole('button', { name: 'Open calendar' }));
    expect(mockPush).toHaveBeenCalledWith('/calendar');
  });

  it('keeps the banner when nothing is live: it shows the next session and has no Check in now button', async () => {
    mockSessionsByKey = { today: [session({ status: 'scheduled', now_local: '2026-11-03T08:00:00' })], upcoming: [] };
    await render(<StudentHome />);
    expect(screen.getByText('Hi, Leo')).toBeTruthy();
    expect(screen.getByText('Next: Web Development · 10:00 to 12:00 · Room 1.02')).toBeTruthy();
    expect(screen.queryByText('Live now')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Check in now' })).toBeNull();
  });

  it('says there are no classes yet for a student who is not enrolled', async () => {
    mockSchedules = [];
    await render(<StudentHome />);
    expect(screen.getByText('Welcome, Leo')).toBeTruthy();
    expect(screen.getByText('No classes yet')).toBeTruthy();
    expect(screen.getByText("Wrong? Contact your institution's admin.")).toBeTruthy();
  });

  it('is laid out in two columns on a wide screen, with the same content', async () => {
    mockWide = true;
    mockSessionsByKey = { today: [session()], upcoming: [] };
    await render(<StudentHome />);
    expect(screen.getByText('My attendance')).toBeTruthy();
    expect(screen.getByText("Today's sessions")).toBeTruthy();
  });
});

describe('Student Classes', () => {
  it('shows each class with its slot, lecturer and percentage, red below 75%', async () => {
    mockSchedules = [schedule(), schedule({ schedule_id: 5, class_id: 7, class_name: 'Databases' })];
    mockOverview = new Map<number, unknown>([[4, numbers({ attendance_pct: 92 })], [5, numbers({ schedule_id: 5, attendance_pct: 64 })]]);
    await render(<StudentClasses />);
    expect(screen.getByText('Web Development')).toBeTruthy();
    expect(screen.getAllByText('Tue · 10:00 to 12:00 · Room 1.02')).toHaveLength(2);
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('64%')).toBeTruthy();
    expect(screen.getAllByText('Below 75%')).toHaveLength(1);
    expect(screen.getByText('2026 Term 4 (active)')).toBeTruthy();
  });

  it('shows a dash instead of a percentage before the first finished session', async () => {
    mockOverview = new Map();
    await render(<StudentClasses />);
    expect(screen.getByText('No finished sessions yet')).toBeTruthy();
    expect(screen.queryByText('Below 75%')).toBeNull();
  });

  it('switches between Active period and Previous, with an empty state that points to Previous', async () => {
    mockSchedules = [schedule({ schedule_id: 9, class_name: 'Old class', period_status: 'finished', period_name: '2026 Term 3' })];
    await render(<StudentClasses />);
    expect(screen.getByText('No classes this period')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'See previous periods' }));
    expect(screen.getByText('Old class')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Previous' })).toBeSelected();
  });

  it('opens a class', async () => {
    await render(<StudentClasses />);
    await fireEvent.press(screen.getByRole('link', { name: 'Web Development' }));
    expect(mockPush).toHaveBeenCalledWith('/class/4');
  });
});

describe('Calendar', () => {
  it('shows the week as seven day chips and the sessions of today', async () => {
    mockSessionsByKey = { week: [session(), session({ session_id: 40, session_date: '2026-11-05', class_name: 'Other class', status: 'scheduled' })] };
    await render(<WeekCalendar />);
    expect(screen.getByRole('button', { name: 'Tue 3 Nov (today), 1 sessions' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Thu 5 Nov, 1 sessions' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Mon 2 Nov' })).toBeTruthy();
    expect(screen.getByText('Tue 3 Nov 2026 (today)')).toBeTruthy();
    expect(screen.getByText('Web Development')).toBeTruthy();
    expect(screen.queryByText('Other class')).toBeNull();
  });

  it('shows another day when its chip is pressed, and says when a day is empty', async () => {
    mockSessionsByKey = { week: [session({ session_id: 40, session_date: '2026-11-05', class_name: 'Other class', status: 'scheduled' })] };
    await render(<WeekCalendar />);
    expect(screen.getByText('No sessions')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Thu 5 Nov, 1 sessions' }));
    expect(screen.getByText('Other class')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thu 5 Nov, 1 sessions' })).toBeSelected();
  });

  it('moves between weeks', async () => {
    await render(<WeekCalendar />);
    expect(screen.getByText('Mon 2 Nov to Sun 8 Nov')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByText('Mon 9 Nov to Sun 15 Nov')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByText('Mon 2 Nov to Sun 8 Nov')).toBeTruthy();
  });
});

describe('Session details for a student', () => {
  it('invites a student to check in while check in is open', async () => {
    await render(<SessionDetails sessionId={38} />);
    expect(screen.getByText("You haven't checked in yet")).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    expect(mockPush).toHaveBeenCalledWith('/check-in/38');
  });

  it('says why check in is not open yet, with a button that cannot be pressed', async () => {
    mockSession = session({ status: 'scheduled', now_local: '2026-11-03T09:00:00' });
    await render(<SessionDetails sessionId={38} />);
    expect(screen.getByRole('button', { name: 'Opens at 09:50' })).toBeDisabled();
    expect(screen.queryByText("You haven't checked in yet")).toBeNull();
  });

  it('shows a confirmation and the result once checked in', async () => {
    mockAttendance = new Map([[38, { session_id: 38, status: 'late', checked_in_at: '2026-11-03T00:08:00+00:00', check_in_method: 'qr' }]]);
    await render(<SessionDetails sessionId={38} />);
    expect(screen.getByText("You're checked in")).toBeTruthy();
    expect(screen.getByText('My attendance')).toBeTruthy();
    expect(screen.getByText('Late')).toBeTruthy();
    expect(screen.getByText('QR')).toBeTruthy();
  });

  it('shows Absent and how to get it corrected after the session', async () => {
    mockSession = session({ status: 'finished', now_local: '2026-11-03T13:00:00' });
    await render(<SessionDetails sessionId={38} />);
    expect(screen.getByText('Absent')).toBeTruthy();
    expect(screen.getByText('Something wrong? Ask your lecturer to correct it.')).toBeTruthy();
  });

  it('says a cancelled session does not count', async () => {
    mockSession = session({ status: 'cancelled' });
    await render(<SessionDetails sessionId={38} />);
    expect(screen.getByText('This session was cancelled')).toBeTruthy();
    expect(screen.getByText("It won't count towards your attendance.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Check in' })).toBeNull();
  });

  it('shows the lecturer and the attendees, with Show all for a long list', async () => {
    mockAttendees = Array.from({ length: 8 }, (_, index) => ({ first_name: `First${index}`, last_name: 'Last' }));
    await render(<SessionDetails sessionId={38} />);
    expect(screen.getByText('Omar Park')).toBeTruthy();
    expect(screen.getByText('Session attendees (8)')).toBeTruthy();
    expect(screen.getByText('+3 more')).toBeTruthy();
    expect(screen.queryByText('First7 Last')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByText('First7 Last')).toBeTruthy();
  });

  it('says so when the session cannot be found', async () => {
    mockSession = null;
    await render(<SessionDetails sessionId={1} />);
    expect(screen.getByText('This session was not found.')).toBeTruthy();
  });
});

describe('Profile', () => {
  it('shows the student with their check-in permissions and details', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByText('Leo Santos')).toBeTruthy();
    expect(screen.getByText('Student · S1000002')).toBeTruthy();
    expect(screen.getByText('Check-in permissions')).toBeTruthy();
    for (const word of ['Bluetooth', 'NFC', 'Camera']) expect(screen.getByText(word)).toBeTruthy();
    expect(screen.getByText('s1000002@mailinator.com')).toBeTruthy();
  });

  it('leaves out the check-in permissions for someone who cannot check in', async () => {
    mockCan = () => false;
    mockRole = 'lecturer';
    await render(<ProfileScreen />);
    expect(screen.queryByText('Check-in permissions')).toBeNull();
    expect(screen.getByText('Lecturer · S1000002')).toBeTruthy();
  });

  it('asks before signing out', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Sign out?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Sign out?')).toBeNull();
  });
});
