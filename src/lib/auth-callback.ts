export type CallbackResult =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' };

// The email link returns tokens (or an error) in the URL fragment: app://auth-callback#access_token=...
export function parseAuthCallback(url: string | null | undefined): CallbackResult {
  if (!url) return { kind: 'none' };
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const raw =
    hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(raw);

  const errorCode = params.get('error_code');
  if (errorCode || params.get('error')) {
    return {
      kind: 'error',
      message:
        errorCode === 'otp_expired'
          ? 'This link has expired or was already used. Request a new one.'
          : 'Sign-in failed. Request a new link.',
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };
  return { kind: 'none' };
}
