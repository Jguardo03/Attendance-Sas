import { render, screen } from '@testing-library/react-native';

import type { Session } from '@/features/sessions/format';
import { AdminSessionList } from '@/features/teaching/admin-session-list';

let mockMedium = true;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/shell/nav', () => ({ ...jest.requireActual('@/features/shell/nav'), useIsMedium: () => mockMedium }));

const session = (id: number, status: string, extra: Partial<Session> = {}) =>
  ({
    session_id: id,
    class_id: id,
    class_name: `Class ${id}`,
    status,
    stored_status: status,
    start_time: '09:00:00',
    end_time: '11:00:00',
    lecturer_id: 'L1',
    lecturer_first_name: 'Omar',
    lecturer_last_name: 'Park',
    location_name: 'Room 1',
    ...extra,
  }) as unknown as Session;

const counts = new Map([[1, { enrolled: 24, present: 15, late: 3 }]]);

describe('AdminSessionList', () => {
  it('is a table with a header from 768 px, one row per session', async () => {
    mockMedium = true;
    await render(<AdminSessionList sessions={[session(1, 'started'), session(2, 'cancelled')]} counts={counts as never} />);
    expect(screen.getByText('ATTENDANCE')).toBeTruthy();
    expect(screen.getByText('18/24')).toBeTruthy();
    expect(screen.getByText('Not counted')).toBeTruthy();
    expect(screen.getAllByText('Omar Park')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Class 1, Live' })).toBeTruthy();
  });

  it('is a compact card per session on a phone, with no table header', async () => {
    mockMedium = false;
    await render(<AdminSessionList sessions={[session(1, 'started')]} counts={counts as never} />);
    expect(screen.queryByText('ATTENDANCE')).toBeNull();
    expect(screen.getByText('09:00 to 11:00 · Omar Park')).toBeTruthy();
    expect(screen.getByText('18/24')).toBeTruthy();
  });
});
