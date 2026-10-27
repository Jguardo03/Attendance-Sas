import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { decodeClaims, hasPermission, type AppClaims } from '@/lib/claims';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  claims: AppClaims | null;
  can: (permissionKey: string) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    // getSession waits for supabase-js to finish reading a session from the URL or storage.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock the client.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const claims = useMemo(() => decodeClaims(session?.access_token), [session?.access_token]);
  const can = useCallback((key: string) => hasPermission(claims, key), [claims]);
  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    queryClient.clear();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status: loading ? 'loading' : session ? 'signedIn' : 'signedOut',
      session,
      claims,
      can,
      signOut,
    }),
    [loading, session, claims, can, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
