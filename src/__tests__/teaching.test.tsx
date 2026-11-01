import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { audienceOf } from '@/features/sessions/audience';
import type { Session } from '@/features/sessions/format';
import {
  activeFilterCount,
  attendanceFraction,
  attendancePercent,
  attendeeStatus,
  distinctValues,
  filterSessions,
  movedNote,
  searchStudents,
  sortStudents,
} from '@/features/sessions/teaching';
import { AdminToday } from '@/features/teaching/admin-today';
import { TeachingSessionCard } from '@/features/teaching/teaching-session-card';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

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
  lecturer_email: null,
  location_id: 1,
  location_name: 'Room 1.01',
  week_day: 1,
  start_time: '09:00:00',
  end_time: '11:00:00',
  stored_status: 'scheduled',
  status: 'started',
  starts_at: '2026-11-02T09:00:00',
  ends_at: '2026-11-02T11:00:00',
  check_in_opens_at: '2026-11-02T08:50:00',
  now_local: '2026-11-02T10:00:00',
  ...overrides,
});

describe('who gets which screens', () => {
  const has = (...keys: string[]) => (key: string) => keys.includes(key);
  it('chooses by permission, admin first', () => {
    expect(audienceOf(has('admin.access', 'sessions.manage_own'))).toBe('admin');
    expect(audienceOf(has('sessions.manage_own'))).toBe('lecturer');
    expect(audienceOf(has('attendance.check_in'))).toBe('student');
    expect(audienceOf(has('classes.view_own'))).toBe('none');
  });
});

describe('attendance figures', () => {
  it('shows attended over enrolled, with a percentage once live or over', () => {
    expect(attendancePercent({ enrolled: 24, present: 15, late: 3 })).toBe(75);
    expect(attendancePercent({ enrolled: 0, present: 0, late: 0 })).toBe(0);
    expect(attendanceFraction(session(), { enrolled: 24, present: 15, late: 3 })).toBe('18/24 · 75%');
    expect(attendanceFraction(session({ status: 'finished' }), { enrolled: 24, present: 19, late: 2 })).toBe('21/24 · 88%');
    expect(attendanceFraction(session({ status: 'scheduled' }), { enrolled: 22, present: 0, late: 0 })).toBe('0/22');
    expect(attendanceFraction(session({ status: 'cancelled' }), { enrolled: 22, present: 0, late: 0 })).toBe('Not counted');
    expect(attendanceFraction(session(), undefined)).toBe('');
  });

  it('works out each student line: no row means absent after the session, not checked in while live', () => {
    expect(attendeeStatus(session(), { status: 'present' })).toBe('Present');
    expect(attendeeStatus(session(), { status: 'late' })).toBe('Late');
    expect(attendeeStatus(session(), null)).toBe('Not checked in');
    expect(attendeeStatus(session({ status: 'finished' }), null)).toBe('Absent');
    expect(attendeeStatus(session({ status: 'scheduled', now_local: '2026-11-02T08:00:00' }), null)).toBe('Not open yet');
    expect(attendeeStatus(session({ status: 'cancelled' }), null)).toBe('Absent');
  });

  it('notes moved and cancelled sessions in lists', () => {
    expect(movedNote(session({ status: 'cancelled' }))).toBe('Not counted');
    expect(movedNote(session({ status: 'rescheduled', stored_status: 'rescheduled', start_time: '15:00:00' }))).toBe('Moved to 15:00, Room 1.01');
    expect(movedNote(session())).toBeNull();
  });
});

describe('session filters', () => {
  const list = [
    session({ session_id: 1 }),
    session({ session_id: 2, class_name: 'Database Systems', lecturer_first_name: 'Omar', lecturer_last_name: 'Park', location_name: 'Room 2.05', status: 'finished' }),
    session({ session_id: 3, class_name: 'Database Systems', location_name: 'Room 2.05', status: 'cancelled' }),
  ];

  it('filters by class, lecturer, location and status together', () => {
    expect(filterSessions(list, { class_name: 'Database Systems' }).map((s) => s.session_id)).toEqual([2, 3]);
    expect(filterSessions(list, { class_name: 'Database Systems', lecturer: 'Omar Park' }).map((s) => s.session_id)).toEqual([2]);
    expect(filterSessions(list, { status: 'Live' }).map((s) => s.session_id)).toEqual([1]);
    expect(filterSessions(list, { location_name: 'Room 2.05', status: 'Cancelled' }).map((s) => s.session_id)).toEqual([3]);
    expect(filterSessions(list, {})).toHaveLength(3);
  });

  it('offers only the values that exist, and counts active filters', () => {
    expect(distinctValues(list, (s) => s.class_name)).toEqual(['Database Systems', 'Introduction to Programming']);
    expect(activeFilterCount({ class_name: 'x', status: '' })).toBe(1);
  });
});

describe('class students', () => {
  const students = [
    { student_id: 'S1', first_name: 'Mia', last_name: 'Nguyen', attendance_pct: 46 },
    { student_id: 'S2', first_name: 'Leo', last_name: 'Santos', attendance_pct: 92 },
    { student_id: 'S3', first_name: 'Ana', last_name: 'Costa', attendance_pct: null },
  ];
  it('sorts by name, lowest or highest attendance', () => {
    expect(sortStudents(students, 'name').map((s) => s.student_id)).toEqual(['S3', 'S1', 'S2']);
    expect(sortStudents(students, 'lowest').map((s) => s.student_id)).toEqual(['S3', 'S1', 'S2']);
    expect(sortStudents(students, 'highest').map((s) => s.student_id)).toEqual(['S2', 'S1', 'S3']);
  });
  it('searches by name or student ID', () => {
    expect(searchStudents(students, 'nguy').map((s) => s.student_id)).toEqual(['S1']);
    expect(searchStudents(students, 's2').map((s) => s.student_id)).toEqual(['S2']);
    expect(searchStudents(students, '  ')).toHaveLength(3);
  });
});

describe('TeachingSessionCard', () => {
  it('shows the live figure and the Open live attendance button', async () => {
    await render(<TeachingSessionCard session={session()} counts={{ enrolled: 24, present: 15, late: 3 }} withAction showLecturer />);
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('18/24 · 75%')).toBeTruthy();
    expect(screen.getByText('Lena Lee')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open live attendance' })).toBeTruthy();
  });

  it('shows enrolled and when check in opens for an upcoming session', async () => {
    await render(
      <TeachingSessionCard session={session({ status: 'scheduled', now_local: '2026-11-02T08:00:00' })} counts={{ enrolled: 22, present: 0, late: 0 }} withAction />,
    );
    expect(screen.getByText('22 enrolled · check in opens 08:50')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View session' })).toBeTruthy();
  });
});

// --- The admin Today dashboard, end to end with a pretend backend -------------------------------------------------

const mockToday = [
  { ...session({ session_id: 1 }) },
  { ...session({ session_id: 2, class_name: 'Database Systems', lecturer_first_name: 'Omar', lecturer_last_name: 'Park', status: 'finished', location_name: 'Room 2.05' }) },
];

const mockBuilder = (result: { data: unknown; error: null }) => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockBuilder({ data: mockToday, error: null })),
    rpc: jest.fn((name: string) => {
      if (name === 'app_now') return Promise.resolve({ data: '2026-11-02T10:00:00', error: null });
      if (name === 'admin_today_counts') {
        return Promise.resolve({ data: [{ sessions_today: 2, live_now: 1, upcoming: 0, finished: 1, rescheduled_or_cancelled: 0 }], error: null });
      }
      if (name === 'session_attendance_counts') {
        return Promise.resolve({
          data: [
            { session_id: 1, enrolled: 24, present: 15, late: 3 },
            { session_id: 2, enrolled: 20, present: 17, late: 0 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    }),
  },
}));

describe('AdminToday', () => {
  it('shows the five counts, lists every session once with attendance, and filters', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <QueryClientProvider client={client}>
        <AdminToday />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('All sessions today (2)')).toBeTruthy();
    expect(screen.getByLabelText('Sessions today: 2')).toBeTruthy();
    expect(screen.getByLabelText('Live now: 1')).toBeTruthy();
    expect(screen.getByLabelText('Finished: 1')).toBeTruthy();
    expect(await screen.findByText('18/24 · 75%')).toBeTruthy();
    expect(screen.getByText('17/20 · 85%')).toBeTruthy();
    expect(screen.getAllByText('Introduction to Programming')).toHaveLength(1);

    // Filtering by lecturer narrows the list and the heading says how many of the day are shown.
    await fireEvent.press(screen.getByRole('button', { name: 'Lecturer' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Omar Park' }));
    expect(await screen.findByText('Sessions today (1 of 2)')).toBeTruthy();
    expect(screen.queryByText('18/24 · 75%')).toBeNull();
    client.clear();
  });
});
