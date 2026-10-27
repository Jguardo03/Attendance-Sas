import { useLinkingURL } from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { parseAuthCallback } from '@/lib/auth-callback';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

// Landing page for the emailed sign-in link. On web, supabase-js has already read the tokens
// from the URL; on native this screen reads the deep link and stores the session.
export default function AuthCallbackScreen() {
  const { status } = useAuth();
  const router = useRouter();
  const nativeUrl = useLinkingURL();
  const [sessionFailed, setSessionFailed] = useState(false);

  const isWeb = Platform.OS === 'web';
  const url = isWeb ? (typeof window === 'undefined' ? null : window.location.href) : nativeUrl;
  const result = useMemo(() => parseAuthCallback(url), [url]);

  useEffect(() => {
    if (isWeb || result.kind !== 'tokens') return;
    supabase?.auth
      .setSession({ access_token: result.accessToken, refresh_token: result.refreshToken })
      .then(({ error }) => {
        if (error) setSessionFailed(true);
      });
  }, [isWeb, result]);

  if (status === 'signedIn') return <Redirect href="/" />;

  let error: string | undefined;
  if (sessionFailed) error = 'Sign-in failed. Request a new link.';
  else if (result.kind === 'error') error = result.message;
  // On native the link can arrive a moment after the screen mounts, so wait for it.
  else if (result.kind === 'none' && (isWeb || url)) {
    error = 'This sign-in link is not valid. Request a new one.';
  }

  return (
    <Screen title={error ? 'Sign-in link problem' : 'Signing you in'}>
      {error ? (
        <>
          <Card>
            <Text variant="error">{error}</Text>
          </Card>
          <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <Text variant="muted">One moment...</Text>
      )}
    </Screen>
  );
}
