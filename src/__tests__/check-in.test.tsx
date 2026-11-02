import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { QrCode } from '@/components/qr-code';
import { submitCheckIn, fetchRoomQr } from '@/features/check-in/api';
import { CheckInScreen } from '@/features/check-in/check-in-screen';
import { describeCheckInError } from '@/features/check-in/messages';
import { firstAvailable, methodStatus, planMethods, type CheckInMethod } from '@/features/check-in/orchestrator';
import { markCheckInStart, takeElapsed } from '@/features/check-in/timing';
import { qrMatrix, qrPath } from '@/lib/qr-matrix';
import { queryClient } from '@/lib/query-client';

const mockInvoke = jest.fn();
let mockCameraProps: { onBarcodeScanned?: (event: { data: string }) => void } = {};
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace, canGoBack: () => true }),
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'S1000001' }, can: () => true }),
}));
jest.mock('expo-camera', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    CameraView: Object.assign(
      (props: typeof mockCameraProps) => {
        mockCameraProps = props;
        return <View testID="camera" />;
      }, { isAvailableAsync: jest.fn(() => Promise.resolve(true)) },
    ),
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn(), jest.fn()],
  };
});

const openSession = {
  session_id: 7,
  schedule_id: 3,
  session_date: '2026-11-02',
  class_name: 'Database Systems',
  location_id: 1,
  location_name: 'Room 2.05',
  start_time: '13:00:00',
  end_time: '15:00:00',
  status: 'started',
  starts_at: '2026-11-02T13:00:00',
  ends_at: '2026-11-02T15:00:00',
  check_in_opens_at: '2026-11-02T12:50:00',
  now_local: '2026-11-02T13:05:00',
};

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
    from: jest.fn((table: string) => builder({ data: table === 'session_overview' ? mockSession() : [], error: null })),
    rpc: jest.fn(() => Promise.resolve({ data: '2026-11-02T13:05:00', error: null })),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

let mockSessionData: unknown = null;
const mockSession = () => mockSessionData;

const refusal = (status: number, body: Record<string, unknown>) => ({
  data: null,
  error: { context: { status, json: () => Promise.resolve(body) } },
});

const CODE = 'v1.1.59319220.0638ac03850215cc';

beforeEach(() => {
  mockInvoke.mockReset();
  mockReplace.mockReset();
  mockSessionData = openSession;
});

describe('check in messages', () => {
  it('says when check in opens and offers no retry', () => {
    expect(describeCheckInError('not_open', { opens_at: '12:50' })).toEqual({ message: 'Check in opens at 12:50.', retry: false, manual: false });
  });

  it('lets the student scan again after a bad code or a lost connection', () => {
    expect(describeCheckInError('invalid_code').retry).toBe(true);
    expect(describeCheckInError('network').retry).toBe(true);
  });

  it('points to the lecturer when scanning cannot help', () => {
    for (const code of ['closed', 'not_enrolled', 'qr_disabled', 'not_allowed']) expect(describeCheckInError(code).manual).toBe(true);
  });

  it('never shows the server text for an unknown code', () => {
    expect(describeCheckInError('boom').message).toMatch(/Something went wrong/);
  });
});

describe('check in methods', () => {
  const method = (id: CheckInMethod['id'], available: boolean): CheckInMethod => ({ id, label: id, isAvailable: async () => available });

  it('picks the first available method in order', async () => {
    const plan = await planMethods([method('beacon', false), method('nfc', true), method('qr', true)]);
    expect(firstAvailable(plan)).toBe('nfc');
    expect(plan.map((item) => methodStatus(plan, item))).toEqual(['Not available on this device', 'Scanning', 'Next if needed']);
  });

  it('has only the QR code while Bluetooth and NFC are not built', async () => {
    const plan = await planMethods();
    expect(plan.map((item) => [item.id, item.available])).toEqual([['beacon', false], ['nfc', false], ['qr', true]]);
  });
});

describe('check in timing', () => {
  it('measures from the tap and clears the mark', () => {
    markCheckInStart(1000);
    expect(takeElapsed(3500)).toBe(2500);
    expect(takeElapsed(4000)).toBeNull();
  });
});

describe('QR drawing', () => {
  it('makes a square matrix and a path with one piece per run', () => {
    const matrix = qrMatrix(CODE);
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
    const path = qrPath([[true, true, false], [false, false, true]], 0);
    expect(path).toBe('M0 0h2v1h-2zM2 1h1v1h-1z');
  });

  it('renders with an accessible label', async () => {
    await render(<QrCode value={CODE} label="Check in code for Room 2.05" />);
    expect(screen.getByLabelText('Check in code for Room 2.05')).toBeTruthy();
  });
});

describe('check in api', () => {
  it('sends the code and returns the result', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'present', checked_in_at: '2026-11-02T13:05:00', method: 'qr', session_id: 7 }, error: null });
    const result = await submitCheckIn(7, CODE);
    expect(mockInvoke).toHaveBeenCalledWith('check-in', { body: { sessionId: 7, method: 'qr', evidence: { payload: CODE } } });
    expect(result).toMatchObject({ ok: true, value: { status: 'present' } });
  });

  it('turns a refusal into a message instead of throwing', async () => {
    mockInvoke.mockResolvedValue(refusal(403, { code: 'not_enrolled' }));
    const result = await submitCheckIn(7, CODE);
    expect(result).toMatchObject({ ok: false, code: 'not_enrolled' });
  });

  it('reports a lost connection as network', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });
    expect(await submitCheckIn(7, CODE)).toMatchObject({ ok: false, code: 'network' });
  });

  it('asks for the room code by session or by room', async () => {
    mockInvoke.mockResolvedValue({ data: { payload: CODE }, error: null });
    await fetchRoomQr({ sessionId: 7 });
    await fetchRoomQr({ locationId: 1 });
    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'room-qr', { body: { session_id: 7 } });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'room-qr', { body: { location_id: 1 } });
  });
});

describe('check in screen', () => {
  const renderScreen = async () =>
    await render(
      <QueryClientProvider client={queryClient}>
        <CheckInScreen sessionId={7} />
      </QueryClientProvider>,
    );

  it('shows the methods and the camera while check in is open', async () => {
    await renderScreen();
    expect(await screen.findByTestId('camera')).toBeTruthy();
    expect(screen.getAllByText('Not available on this device')).toHaveLength(2);
    expect(screen.getByText('Scanning')).toBeTruthy();
    expect(screen.getByText("Can't check in? Ask your lecturer to check you in manually.")).toBeTruthy();
  });

  it('shows the success screen after a good code', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'present', checked_in_at: '2026-11-02T13:05:00', method: 'qr', session_id: 7 }, error: null });
    await renderScreen();
    await fireEvent.changeText(await screen.findByPlaceholderText(/v1\./), CODE);
    await fireEvent.press(screen.getByText('Submit code'));
    expect(await screen.findByText("You're checked in")).toBeTruthy();
    expect(screen.getByText('Status: Present')).toBeTruthy();
    expect(screen.getByText('Method: QR code')).toBeTruthy();
  });

  it('explains a refusal and offers to try again', async () => {
    mockInvoke.mockResolvedValue(refusal(422, { code: 'invalid_code' }));
    await renderScreen();
    await fireEvent.changeText(await screen.findByPlaceholderText(/v1\./), CODE);
    await fireEvent.press(screen.getByText('Submit code'));
    expect(await screen.findByText('That QR code is not valid here. Scan the code shown in the room.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId('camera')).toBeTruthy();
  });

  it('does not call the server for text that is not a room code', async () => {
    await renderScreen();
    await fireEvent.changeText(await screen.findByPlaceholderText(/v1\./), 'hello');
    await fireEvent.press(screen.getByText('Submit code'));
    expect(await screen.findByText('That is not a room code. Scan the code shown in the room.')).toBeTruthy();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('sends a steady code that is seen again and again only once', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'late', checked_in_at: '2026-11-02T13:05:00', method: 'qr', session_id: 7 }, error: null });
    await renderScreen();
    await screen.findByTestId('camera');
    await act(async () => {
      mockCameraProps.onBarcodeScanned?.({ data: CODE });
      mockCameraProps.onBarcodeScanned?.({ data: CODE });
    });
    expect(await screen.findByText('Status: Late')).toBeTruthy();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('does not open the camera before check in opens', async () => {
    mockSessionData = { ...openSession, status: 'scheduled', now_local: '2026-11-02T12:00:00' };
    await renderScreen();
    expect(await screen.findByText('Opens at 12:50')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
  });
});
