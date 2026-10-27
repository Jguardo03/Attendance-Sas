import { useEffect, useState } from 'react';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { requestSignInLink, type SignInResult } from '@/lib/sign-in';

const RESEND_SECONDS = 60;

const errorMessages: Record<Exclude<SignInResult, 'sent'>, string> = {
  'not-institutional': 'Use your institutional email.',
  'rate-limited': 'Too many requests. Wait a minute and try again.',
  unavailable: 'Sign-in is unavailable right now. Try again later.',
};

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    setSending(true);
    setError(undefined);
    const result = await requestSignInLink(email);
    setSending(false);
    if (result === 'sent') {
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } else {
      setError(errorMessages[result]);
    }
  }

  if (sent) {
    return (
      <Screen title="Check your email">
        <Card>
          <Text>
            If this address can sign in, we sent a sign-in link to it. Open the link on this device.
          </Text>
          <Text variant="muted">The link works once and expires soon.</Text>
        </Card>
        <Button
          variant="secondary"
          label={cooldown > 0 ? `Resend link (${cooldown}s)` : 'Resend link'}
          disabled={cooldown > 0 || sending}
          onPress={send}
        />
        <Button
          variant="secondary"
          label="Use a different email"
          onPress={() => {
            setSent(false);
            setCooldown(0);
          }}
        />
        {error ? <Text variant="error">{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen title="Sign in">
      <Card>
        <Text variant="muted">Enter your institutional email. We will send you a sign-in link.</Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@institution.edu"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          error={error}
          onSubmitEditing={send}
        />
      </Card>
      <Button label={sending ? 'Sending...' : 'Send link'} disabled={!email.trim() || sending} onPress={send} />
    </Screen>
  );
}
