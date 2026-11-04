import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { Session } from '@/features/sessions/format';
import { TeachingSessionPanel } from '@/features/teaching/teaching-session-panel';

const mockRefetch = jest.fn();
const mockUseAttendanceList = jest.fn((..._args: unknown[]) => ({ data: [] as unknown[], isPending: false, refetch: mockRefetch }));
let mockFocusCallback: (() => void) | undefined;
const mockPush = jest.fn();
let mockCan: (key: string) => boolean = () => true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
  },
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'L1000002' }, can: (key: string) => mockCan(key) }),
}));
jest.mock('@/features/sessions/realtime', () => ({ useAttendanceRealtime: jest.fn() }));
jest.mock('@/features/sessions/queries', () => ({
  useAttendanceList: (...args: unknown[]) => mockUseAttendanceList(...args),
}));

const session = {
  session_id: 7,
  lecturer_id: 'L1000002',
  status: 'started',
  start_time: '13:00:00',
  end_time: '15:00:00',
  check_in_opens_at: '2026-11-02T12:50:00',
  now_local: '2026-11-02T13:05:00',
} as unknown as Session;

beforeEach(() => {
  mockPush.mockReset();
  mockCan = () => true;
  mockRefetch.mockReset();
  mockUseAttendanceList.mockReset();
  mockUseAttendanceList.mockReturnValue({ data: [], isPending: false, refetch: mockRefetch });
});

describe('teaching session panel', () => {
  it('refetches the attendees when the screen is shown again (after the room QR page)', async () => {
    await render(<TeachingSessionPanel session={session} />);
    // The first focus is the screen opening: the query already loads then.
    await act(async () => mockFocusCallback?.());
    expect(mockRefetch).not.toHaveBeenCalled();
    await act(async () => mockFocusCallback?.());
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('polls quickly only while check in is open', async () => {
    await render(<TeachingSessionPanel session={session} />);
    expect(mockUseAttendanceList).toHaveBeenLastCalledWith(7, true, true);

    mockUseAttendanceList.mockClear();
    await render(<TeachingSessionPanel session={{ ...session, status: 'finished' } as Session} />);
    expect(mockUseAttendanceList).toHaveBeenLastCalledWith(7, true, false);
  });
});

describe('opening a record', () => {
  const rows = [
    { student_id: 'S1000001', first_name: 'Ada', last_name: 'Lovelace', status: null, checked_in_at: null, check_in_method: null },
    { student_id: 'S1000002', first_name: 'Alan', last_name: 'Turing', status: 'present', checked_in_at: '2026-11-02T02:01:00+00:00', check_in_method: 'qr' },
  ];

  it('opens the record of the student whose card is pressed', async () => {
    mockUseAttendanceList.mockReturnValue({ data: rows, isPending: false, refetch: mockRefetch });
    await render(<TeachingSessionPanel session={session} />);
    await fireEvent.press(screen.getByText('Ada Lovelace'));
    expect(mockPush).toHaveBeenCalledWith('/attendance/7/S1000001');
    await fireEvent.press(screen.getByText('Alan Turing'));
    expect(mockPush).toHaveBeenLastCalledWith('/attendance/7/S1000002');
  });
});
