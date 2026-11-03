import { fireEvent, render, screen } from '@testing-library/react-native';

import DevicePermissionsScreen from '@/app/(app)/device-permissions';
import SignInScreen from '@/app/(auth)/sign-in';
import { requestSignInCode, verifySignInCode } from '@/lib/sign-in';

const mockMarkSeen = jest.fn();
let mockWide = false;

jest.mock('@/lib/sign-in', () => ({
  ...jest.requireActual('@/lib/sign-in'),
  requestSignInCode: jest.fn(),
  verifySignInCode: jest.fn(),
}));
jest.mock('@/lib/device-permissions', () => ({ useDevicePermissionsPrompt: () => ({ markSeen: mockMarkSeen }) }));
jest.mock('@/features/shell/nav', () => ({ ...jest.requireActual('@/features/shell/nav'), useIsWide: () => mockWide }));

const request = requestSignInCode as jest.Mock;
const verify = verifySignInCode as jest.Mock;

beforeEach(() => {
  request.mockReset();
  verify.mockReset();
  mockMarkSeen.mockReset();
  mockWide = false;
});

async function reachCodeStep() {
  request.mockResolvedValue('sent');
  await render(<SignInScreen />);
  await fireEvent.changeText(screen.getByLabelText('Institutional email'), 'leo@student.edu');
  await fireEvent.press(screen.getByRole('button', { name: 'Send sign-in code' }));
  await screen.findByText('Check your email');
}

describe('Sign in screen', () => {
  it('asks for the institutional email and says a code will be emailed', async () => {
    await render(<SignInScreen />);
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByText('We will email you a sign-in code. No password needed.')).toBeTruthy();
    expect(screen.getByText('Use your institutional email address.')).toBeTruthy();
    expect(screen.getByText('Attendancely')).toBeTruthy();
    expect(screen.queryByText(/link/i)).toBeNull();
  });

  it('cannot send until an email is typed', async () => {
    await render(<SignInScreen />);
    expect(screen.getByRole('button', { name: 'Send sign-in code' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Institutional email'), 'leo@student.edu');
    expect(screen.getByRole('button', { name: 'Send sign-in code' })).toBeEnabled();
  });

  it('shows the product line beside the form on a wide screen', async () => {
    mockWide = true;
    await render(<SignInScreen />);
    expect(screen.getByText('Check in to class in seconds.')).toBeTruthy();
    expect(screen.getByText('Present')).toBeTruthy();
  });

  it('shows why an email could not be sent', async () => {
    request.mockResolvedValue('not-institutional');
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('Institutional email'), 'leo@gmail.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send sign-in code' }));
    expect(await screen.findByText('Use your institutional email.')).toBeTruthy();
  });

  it('moves to the code step after the email is sent, with the code wording and no link wording', async () => {
    await reachCodeStep();
    expect(request).toHaveBeenCalledWith('leo@student.edu');
    expect(screen.getByText(/we sent a code to it/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Resend code/ })).toBeDisabled();
    expect(screen.queryByText(/link/i)).toBeNull();
  });

  it('signs in with six digits and nothing else', async () => {
    verify.mockResolvedValue('ok');
    await reachCodeStep();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Code'), '12ab34 5');
    expect(screen.getByLabelText('Code').props.value).toBe('12345');
    await fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(verify).toHaveBeenCalledWith('leo@student.edu', '123456');
  });

  it('tells the person when the code is wrong or has expired', async () => {
    verify.mockResolvedValue('invalid');
    await reachCodeStep();
    await fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('That code is wrong or has expired. Check it, or tap Resend code.')).toBeTruthy();
  });

  it('goes back to the email step with "Use a different email"', async () => {
    await reachCodeStep();
    await fireEvent.press(screen.getByRole('button', { name: 'Use a different email' }));
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByLabelText('Institutional email')).toBeTruthy();
  });
});

describe('Device permissions screen', () => {
  it('explains what Bluetooth, NFC and the camera are for', async () => {
    await render(<DevicePermissionsScreen />);
    expect(screen.getByText('Set up check-in')).toBeTruthy();
    for (const word of ['Bluetooth', 'NFC', 'Camera']) expect(screen.getByText(word)).toBeTruthy();
    expect(screen.getByText('Scans the QR code shown in class.')).toBeTruthy();
    expect(screen.getByText('Your phone will ask for each permission the first time you use that method.')).toBeTruthy();
  });

  it('carries on when Continue is pressed', async () => {
    await render(<DevicePermissionsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
  });
});
