import { decodeClaims, hasPermission } from '@/lib/claims';

function makeToken(payload: object) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'ES256' })}.${encode(payload)}.signature`;
}

describe('decodeClaims', () => {
  it('reads the claims added by the access token hook', () => {
    const claims = decodeClaims(
      makeToken({ app_user_id: 'S1000001', app_role: 'student', permissions: ['attendance.check_in'] }),
    );
    expect(claims).toEqual({
      appUserId: 'S1000001',
      role: 'student',
      permissions: ['attendance.check_in'],
    });
  });

  it('returns empty permissions when the hook claims are missing', () => {
    expect(decodeClaims(makeToken({ sub: 'abc' }))).toEqual({
      appUserId: null,
      role: null,
      permissions: [],
    });
  });

  it('returns null for no token or a malformed token', () => {
    expect(decodeClaims(null)).toBeNull();
    expect(decodeClaims('not-a-jwt')).toBeNull();
  });
});

describe('hasPermission', () => {
  // The hook resolves role grants and per-user overrides (deny beats grant) before it signs the token,
  // so these fixtures are the final effective lists for three situations.
  const roleGrant = decodeClaims(makeToken({ permissions: ['attendance.view_all', 'classes.view_all'] }));
  const userGrantOverride = decodeClaims(
    makeToken({ permissions: ['attendance.view_own', 'admin.access'] }),
  );
  const userDenyOverride = decodeClaims(makeToken({ permissions: ['attendance.view_own'] }));

  it('allows a permission granted by the role', () => {
    expect(hasPermission(roleGrant, 'attendance.view_all')).toBe(true);
  });

  it('allows a permission added by a user override', () => {
    expect(hasPermission(userGrantOverride, 'admin.access')).toBe(true);
  });

  it('denies a permission removed by a deny override', () => {
    expect(hasPermission(userDenyOverride, 'attendance.check_in')).toBe(false);
  });

  it('denies everything when there are no claims', () => {
    expect(hasPermission(null, 'attendance.view_own')).toBe(false);
  });
});
