import { useEffect, useState } from 'react';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import {
  codePattern,
  requestSignInCode,
  verifySignInCode,
  type SignInResult,
  type VerifyResult,
} from '@/lib/sign-in';

const RESEND_SECONDS = 60;

const sendErrors: Record<Exclude<SignInResult, 'sent'>, string> = {
  'not-institutional': 'Use your institutional email.',
  'rate-limited': 'Too many requests. Wait a minute and try again.',
  unavailable: 'Sign-in is unavailable right now. Try again later.',
};

const verifyErrors: Record<Exclude<VerifyResult, 'ok'>, string> = {
  invalid: 'That code is wrong or has expired. Check it, or tap Resend code.',
  'rate-limited': 'Too many attempts. Wait a minute and try again.',
  unavailable: 'Sign-in is unavailable right now. Try again later.',
};

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
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
    const result = await requestSignInCode(email);
    setSending(false);
    if (result === 'sent') {
      setSent(true);
      setCode('');
      setCooldown(RESEND_SECONDS);
    } else {
      setError(sendErrors[result]);
    }
  }

  async function verify() {
    setVerifying(true);
    setError(undefined);
    const result = await verifySignInCode(email, code);
    // On success the auth listener signs the person in and the router leaves this screen.
    if (result !== 'ok') {
      setVerifying(false);
      setError(verifyErrors[result]);
    }
  }

  if (sent) {
    return (
      <Screen standalone title="Check your email">
        <Card>
          <Text>If this address can sign in, we sent a code to it. Enter the code below.</Text>
          <Text variant="muted">The code works once and expires soon.</Text>
          <TextField
            label="Code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            onSubmitEditing={verify}
          />
        </Card>
        <Button
          label={verifying ? 'Signing in...' : 'Sign in'}
          disabled={!codePattern.test(code) || verifying}
          onPress={verify}
        />
        <Button
          variant="secondary"
          label={cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
          disabled={cooldown > 0 || sending || verifying}
          onPress={send}
        />
        <Button
          variant="secondary"
          label="Use a different email"
          onPress={() => {
            setSent(false);
            setCode('');
            setError(undefined);
            setCooldown(0);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen standalone title="Sign in">
      <Card>
        <Text variant="muted">Enter your institutional email. We will send you a sign-in code.</Text>
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
      <Button label={sending ? 'Sending...' : 'Send code'} disabled={!email.trim() || sending} onPress={send} />
    </Screen>
  );
}
