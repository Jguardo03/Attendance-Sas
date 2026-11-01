import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import { ClassDetails } from '@/features/sessions/class-details';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'S1000001' }, can: () => true }),
}));

const schedule = {
  schedule_id: 3,
  class_name: 'Database Systems',
  class_description: 'Relational modelling.',
  period_name: '2026 Term 4',
  period_status: 'active',
  frequency_name: 'weekly',
  lecturer_first_name: 'Lena',
  lecturer_last_name: 'Lee',
  lecturer_email: 'l1000001@mailinator.com',
  location_name: 'Room 2.05',
  week_day: 3,
  start_time: '13:00:00',
  end_time: '15:00:00',
};

const session = (id: number, date: string, status: string) => ({
  session_id: id,
  schedule_id: 3,
  session_date: date,
  class_name: 'Database Systems',
  location_name: 'Room 2.05',
  start_time: '13:00:00',
  end_time: '15:00:00',
  status,
  starts_at: `${date}T13:00:00`,
  ends_at: `${date}T15:00:00`,
  check_in_opens_at: `${date}T12:50:00`,
  now_local: '2026-11-02T10:00:00',
});

// A query builder that answers like Supabase: chainable, and awaitable (list) or maybeSingle (one row).
const builder = (result: { data: unknown; error: null }) => {
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
    from: jest.fn((table: string) => {
      if (table === 'schedule_overview') return builder({ data: schedule, error: null });
      if (table === 'session_overview') {
        return builder({ data: [session(10, '2026-10-28', 'finished'), session(11, '2026-11-04', 'scheduled')], error: null });
      }
      return builder({ data: [], error: null });
    }),
    rpc: jest.fn((name: string) => {
      if (name === 'app_now') return Promise.resolve({ data: '2026-11-02T10:00:00', error: null });
      return Promise.resolve({
        data: [{ schedule_id: 3, finished_sessions: 4, present: 2, late: 0, absent: 2, attendance_pct: 50 }],
        error: null,
      });
    }),
  },
}));

describe('ClassDetails', () => {
  // Regression: the schedule row and the schedule's sessions once shared one cache key, so the page crashed
  // with "map is not a function" as soon as both had loaded.
  it('shows the class, my attendance and the upcoming sessions without crashing', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <QueryClientProvider client={client}>
        <ClassDetails scheduleId={3} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Database Systems')).toBeTruthy();
    expect(await screen.findByText('50%')).toBeTruthy();
    expect(screen.getByText('2 present · 0 late · 2 absent')).toBeTruthy();
    expect(await screen.findByText('Wed 4 Nov · 13:00 to 15:00')).toBeTruthy();
    expect(screen.queryByText('Wed 28 Oct · 13:00 to 15:00')).toBeNull();
    client.clear();
  });
});
