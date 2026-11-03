import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Text, TextField } from '@/components/ui';
import { AuthShell } from '@/features/auth/auth-shell';
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
      <AuthShell>
        <View className="gap-1">
          <Text variant="title">Check your email</Text>
          <Text variant="meta">If this address can sign in, we sent a code to it. Enter the code below. The code works once and expires soon.</Text>
        </View>
        <Card>
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
        <Button size="large" label={verifying ? 'Signing in...' : 'Sign in'} disabled={!codePattern.test(code) || verifying} onPress={verify} />
        <Button
          variant="secondary"
          label={cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
          disabled={cooldown > 0 || sending || verifying}
          onPress={send}
        />
        <Button
          variant="ghost"
          label="Use a different email"
          onPress={() => {
            setSent(false);
            setCode('');
            setError(undefined);
            setCooldown(0);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <View className="gap-1">
        <Text variant="title">Sign in</Text>
        <Text variant="meta">We will email you a sign-in code. No password needed.</Text>
      </View>
      <Card>
        <TextField
          label="Institutional email"
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
      <Button size="large" label={sending ? 'Sending...' : 'Send sign-in code'} disabled={!email.trim() || sending} onPress={send} />
      <Text variant="meta" className="text-center">
        Use your institutional email address.
      </Text>
    </AuthShell>
  );
}
