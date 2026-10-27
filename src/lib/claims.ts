// Claims added to the access token by the Phase 3 hook (private.custom_access_token_hook).
// The hook already applies deny-over-grant, so `permissions` is the final effective list.
export type AppClaims = {
  appUserId: string | null;
  role: string | null;
  permissions: string[];
};

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Reads claims for UI decisions only. The server never trusts this: RLS reads the verified JWT.
export function decodeClaims(accessToken: string | null | undefined): AppClaims | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(accessToken.split('.')[1] ?? ''));
    return {
      appUserId: typeof payload.app_user_id === 'string' ? payload.app_user_id : null,
      role: typeof payload.app_role === 'string' ? payload.app_role : null,
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.filter((p: unknown): p is string => typeof p === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export function hasPermission(claims: AppClaims | null, permissionKey: string): boolean {
  return Boolean(claims?.permissions.includes(permissionKey));
}
