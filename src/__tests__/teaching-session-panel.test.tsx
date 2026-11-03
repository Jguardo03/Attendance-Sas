import { act, render } from '@testing-library/react-native';

import type { Session } from '@/features/sessions/format';
import { TeachingSessionPanel } from '@/features/teaching/teaching-session-panel';

const mockRefetch = jest.fn();
const mockUseAttendanceList = jest.fn((..._args: unknown[]) => ({ data: [], isPending: false, refetch: mockRefetch }));
let mockFocusCallback: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
  },
}));
jest.mock('@/features/sessions/queries', () => ({
  useAttendanceList: (...args: unknown[]) => mockUseAttendanceList(...args),
}));

const session = {
  session_id: 7,
  status: 'started',
  start_time: '13:00:00',
  end_time: '15:00:00',
  check_in_opens_at: '2026-11-02T12:50:00',
  now_local: '2026-11-02T13:05:00',
} as unknown as Session;

beforeEach(() => {
  mockRefetch.mockReset();
  mockUseAttendanceList.mockClear();
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
