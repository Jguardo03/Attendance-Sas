import { parseAuthCallback } from '@/lib/auth-callback';
import { requestSignInLink } from '@/lib/sign-in';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: jest.fn(), auth: { signInWithOtp: jest.fn() } },
}));

// Jest has no app manifest for expo-linking to read the scheme from.
jest.mock('expo-linking', () => ({ createURL: (path: string) => `attendancesas://${path}` }));

const rpc = supabase!.rpc as unknown as jest.Mock;
const signInWithOtp = supabase!.auth.signInWithOtp as unknown as jest.Mock;

beforeEach(() => {
  rpc.mockReset();
  signInWithOtp.mockReset();
});

describe('requestSignInLink', () => {
  it('rejects a non-institutional email without sending anything', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await requestSignInLink('someone@gmail.com')).toBe('not-institutional');
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends the link for an allowed email and never creates users', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    signInWithOtp.mockResolvedValue({ error: null });
    expect(await requestSignInLink('  S1000001@Mailinator.com ')).toBe('sent');
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
    expect(await requestSignInLink('nobody@mailinator.com')).toBe('sent');
  });

  it('reports rate limiting and other failures', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    signInWithOtp.mockResolvedValueOnce({ error: { status: 429, message: 'rate limit' } });
    expect(await requestSignInLink('s1000001@mailinator.com')).toBe('rate-limited');
    signInWithOtp.mockResolvedValueOnce({ error: { status: 500, message: 'boom' } });
    expect(await requestSignInLink('s1000001@mailinator.com')).toBe('unavailable');
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
