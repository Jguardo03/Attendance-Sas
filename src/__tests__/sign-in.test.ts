import { parseAuthCallback } from '@/lib/auth-callback';
import { requestSignInCode, verifySignInCode } from '@/lib/sign-in';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: jest.fn(), auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));

// Jest has no app manifest for expo-linking to read the scheme from.
jest.mock('expo-linking', () => ({ createURL: (path: string) => `attendancesas://${path}` }));

const rpc = supabase!.rpc as unknown as jest.Mock;
const signInWithOtp = supabase!.auth.signInWithOtp as unknown as jest.Mock;
const verifyOtp = supabase!.auth.verifyOtp as unknown as jest.Mock;

beforeEach(() => {
  rpc.mockReset();
  signInWithOtp.mockReset();
  verifyOtp.mockReset();
});

describe('requestSignInCode', () => {
  it('rejects a non-institutional email without sending anything', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await requestSignInCode('someone@gmail.com')).toBe('not-institutional');
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends the code for an allowed email and never creates users', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    signInWithOtp.mockResolvedValue({ error: null });
    expect(await requestSignInCode('  S1000001@Mailinator.com ')).toBe('sent');
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 's1000001@mailinator.com',
        options: expect.objectContaining({ shouldCreateUser: false }),
      }),
    );
  });

  it('answers the same for an allowed domain with no account', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    signInWithOtp.mockResolvedValue({ error: { status: 422, message: 'Signups not allowed for otp' } });
    expect(await requestSignInCode('nobody@mailinator.com')).toBe('sent');
  });

  it('reports rate limiting and other failures', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    signInWithOtp.mockResolvedValueOnce({ error: { status: 429, message: 'rate limit' } });
    expect(await requestSignInCode('s1000001@mailinator.com')).toBe('rate-limited');
    signInWithOtp.mockResolvedValueOnce({ error: { status: 500, message: 'boom' } });
    expect(await requestSignInCode('s1000001@mailinator.com')).toBe('unavailable');
  });
});

describe('verifySignInCode', () => {
  it('signs in with a correct code, using the email type', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(await verifySignInCode(' S1000001@Mailinator.com ', ' 123456 ')).toBe('ok');
    expect(verifyOtp).toHaveBeenCalledWith({ email: 's1000001@mailinator.com', token: '123456', type: 'email' });
  });

  it('rejects a code of the wrong shape without calling Supabase', async () => {
    expect(await verifySignInCode('s1000001@mailinator.com', '12ab')).toBe('invalid');
    expect(await verifySignInCode('s1000001@mailinator.com', '12345')).toBe('invalid');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('gives one answer for a wrong, expired or reused code', async () => {
    verifyOtp.mockResolvedValueOnce({ error: { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' } });
    expect(await verifySignInCode('s1000001@mailinator.com', '123456')).toBe('invalid');
    verifyOtp.mockResolvedValueOnce({ error: { status: 400, message: 'invalid' } });
    expect(await verifySignInCode('s1000001@mailinator.com', '654321')).toBe('invalid');
  });

  it('reports rate limiting and server failures separately', async () => {
    verifyOtp.mockResolvedValueOnce({ error: { status: 429, message: 'rate limit' } });
    expect(await verifySignInCode('s1000001@mailinator.com', '123456')).toBe('rate-limited');
    verifyOtp.mockResolvedValueOnce({ error: { status: 500, message: 'boom' } });
    expect(await verifySignInCode('s1000001@mailinator.com', '123456')).toBe('unavailable');
  });
});

describe('parseAuthCallback', () => {
  it('reads tokens from the URL fragment', () => {
    expect(parseAuthCallback('attendancesas://auth-callback#access_token=a&refresh_token=r&type=magiclink')).toEqual({
      kind: 'tokens',
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('reports an expired or reused link', () => {
    const result = parseAuthCallback('https://x.app/auth-callback#error=access_denied&error_code=otp_expired');
    expect(result).toEqual({ kind: 'error', message: expect.stringContaining('expired') });
  });

  it('returns none when there is nothing to read', () => {
    expect(parseAuthCallback('https://x.app/auth-callback')).toEqual({ kind: 'none' });
    expect(parseAuthCallback(null)).toEqual({ kind: 'none' });
  });
});
