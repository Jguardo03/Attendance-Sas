import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { checkInState, checkedInAt, methodLabel, whenAndWhere } from '@/features/sessions/format';
import { useAuth } from '@/providers/auth';
import { parsePayload } from '@/lib/qr-protocol';

import { submitCheckIn, type CheckInResult } from './api';
import { planMethods, methodStatus } from './orchestrator';
import { QrScanner } from './qr-scanner';
import { takeElapsed } from './timing';
import { useMyAttendance, useSession } from '../sessions/queries';

const MANUAL_HELP = "Can't check in? Ask your lecturer to check you in manually.";

// The student's check in dialog: which methods are available, the camera for the QR code, and the answer.
// The server decides everything; this screen only collects the code and shows what came back.
export function CheckInScreen({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { claims } = useAuth();
  const session = useSession(sessionId);
  const mine = useMyAttendance(claims?.appUserId, [sessionId]);
  const plan = useQuery({ queryKey: ['check-in', 'methods'], queryFn: () => planMethods() });

  const [phase, setPhase] = useState<'scanning' | 'sending' | 'done'>('scanning');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [tookMs, setTookMs] = useState<number | null>(null);
  const busy = useRef(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace(`/session/${sessionId}`));

  async function handleCode(raw: string) {
    if (busy.current) return;
    if (!parsePayload(raw)) {
      setHint('That is not a room code. Scan the code shown in the room.');
      return;
    }
    busy.current = true;
    setHint(null);
    setPhase('sending');
    const answer = await submitCheckIn(sessionId, raw.trim());
    setResult(answer);
    if (answer.ok) {
      const elapsed = takeElapsed();
      setTookMs(elapsed);
      if (__DEV__ && elapsed !== null) console.info(`[check-in] tap to success: ${elapsed} ms`);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
    setPhase('done');
    busy.current = false;
  }

  function tryAgain() {
    setResult(null);
    setPhase('scanning');
  }

  if (session.isPending) return <Screen standalone title="Check in"><Text variant="muted">Loading...</Text></Screen>;
  if (!session.data) {
    return (
      <Screen standalone title="Check in">
        <Text variant="error">This session was not found.</Text>
        <Button variant="secondary" label="Back" onPress={back} />
      </Screen>
    );
  }

  const data = session.data;
  const state = checkInState(data, mine.data?.get(sessionId));

  // Done: the success screen.
  if (result?.ok) {
    return (
      <Screen standalone title="You're checked in">
        <Card title={data.class_name}>
          <Text variant="muted">{whenAndWhere(data)}</Text>
          <Text>Status: {result.value.status === 'late' ? 'Late' : 'Present'}</Text>
          <Text>Checked in at: {checkedInAt({ session_id: sessionId, status: result.value.status, checked_in_at: result.value.checked_in_at, check_in_method: 'qr' })}</Text>
          <Text>Method: {methodLabel('qr') === 'QR' ? 'QR code' : methodLabel('qr')}</Text>
          {__DEV__ && tookMs !== null ? <Text variant="muted">Dev only: took {(tookMs / 1000).toFixed(1)} s from the tap</Text> : null}
        </Card>
        <Button label="Back to session" onPress={() => router.replace(`/session/${sessionId}`)} />
      </Screen>
    );
  }

  // Not open (or already in): say so instead of opening the camera.
  if (phase !== 'done' && state.kind !== 'open') {
    return (
      <Screen standalone title={`Check in to ${data.class_name}`}>
        <Card>
          <Text>{state.kind === 'checked_in' ? 'You are already checked in.' : state.help}</Text>
          <Text variant="muted">{state.label}</Text>
        </Card>
        <Button variant="secondary" label="Back to session" onPress={back} />
      </Screen>
    );
  }

  return (
    <Screen standalone title={`Check in to ${data.class_name}`}>
      <Text variant="muted">{whenAndWhere(data)}</Text>

      <Card>
        {plan.data?.map((method, index) => (
          <View key={method.id} className="flex-row items-center justify-between gap-2">
            <Text className="flex-1">
              {index + 1}. {method.label}
            </Text>
            <Text variant="muted">{phase === 'sending' && method.id === 'qr' ? 'Checking...' : methodStatus(plan.data, method)}</Text>
          </View>
        ))}
        {plan.isPending ? <Text variant="muted">Looking for ways to check in...</Text> : null}
      </Card>

      {result && !result.ok ? (
        <Card title="Could not check in">
          <Text variant="error">{result.problem.message}</Text>
          {result.problem.manual ? <Text variant="muted">{MANUAL_HELP}</Text> : null}
          {result.problem.retry ? <Button label="Try again" onPress={tryAgain} /> : null}
        </Card>
      ) : (
        <>
          <QrScanner onCode={handleCode} paused={phase !== 'scanning'} />
          <Text variant="muted">{phase === 'sending' ? 'Checking your code...' : 'Point your camera at the QR code in the room'}</Text>
          {hint ? <Text variant="error">{hint}</Text> : null}
        </>
      )}

      {/* Development builds only: paste the code text, for a computer or emulator that cannot scan a screen. */}
      {__DEV__ ? (
        <Card title="Dev only: enter a room code">
          <TextField label="Room code" value={pasted} onChangeText={setPasted} placeholder="v1.1.12345678.0123456789abcdef" autoCapitalize="none" autoCorrect={false} />
          <Button variant="secondary" label="Submit code" disabled={!pasted.trim() || phase === 'sending'} onPress={() => handleCode(pasted)} />
        </Card>
      ) : null}

      <Text variant="muted">{MANUAL_HELP}</Text>
      <Button variant="secondary" label="Cancel" onPress={back} />
    </Screen>
  );
}
