import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Badge, Banner, Button, Card, Screen, ScreenHeader, Text, TextField, type BadgeTone, Loading } from '@/components/ui';
import { checkInState, checkedInAt, methodLabel, whenAndWhere } from '@/features/sessions/format';
import { useAuth } from '@/providers/auth';
import { parsePayload } from '@/lib/qr-protocol';
import { colors } from '@/theme/tokens';

import { submitCheckIn, type CheckInResult } from './api';
import { planMethods, methodStatus } from './orchestrator';
import { QrScanner } from './qr-scanner';
import { takeElapsed } from './timing';
import { useMyAttendance, useSession } from '../sessions/queries';

const MANUAL_HELP = "Can't check in? Ask your lecturer to check you in manually.";

const methodIcon: Record<string, IconName> = { beacon: 'bluetooth', nfc: 'nfc', qr: 'qr' };

// The chip beside a method: blue with a dot while it is being tried, grey when it is waiting or cannot be used.
function statusChip(status: string): { tone: BadgeTone; dot: boolean } {
  return status === 'Scanning' || status === 'Checking...' ? { tone: 'upcoming', dot: true } : { tone: 'neutral', dot: false };
}

// The student's check in dialog (Student UI pages 33 to 38): which methods are available, the camera for the QR code,
// and the answer. The server decides everything; this screen only collects the code and shows what came back.
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

  if (session.isPending) return <Screen standalone title="Check in" header={<ScreenHeader title="Check in" onBack={back} />}><Loading /></Screen>;
  if (!session.data) {
    return (
      <Screen standalone title="Check in" header={<ScreenHeader title="Check in" onBack={back} />}>
        <Text variant="error">This session was not found.</Text>
        <Button variant="secondary" label="Back" onPress={back} />
      </Screen>
    );
  }

  const data = session.data;
  const state = checkInState(data, mine.data?.get(sessionId));

  // Done: the success screen, centred, with a green tick.
  if (result?.ok) {
    return (
      <Screen
        standalone
        title="You're checked in"
        header={
          <View className="items-center gap-3 pt-4">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-success-tint">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success">
                <Icon name="check" size={36} color="primaryContent" />
              </View>
            </View>
            <Text variant="title">You&apos;re checked in</Text>
            <Text variant="meta" className="text-center">
              {data.class_name} · {whenAndWhere(data)}
            </Text>
          </View>
        }>
        <Card>
          <Text>Status: {result.value.status === 'late' ? 'Late' : 'Present'}</Text>
          <Text>Checked in at: {checkedInAt({ session_id: sessionId, status: result.value.status, checked_in_at: result.value.checked_in_at, check_in_method: 'qr' })}</Text>
          <Text>Method: {methodLabel('qr') === 'QR' ? 'QR code' : methodLabel('qr')}</Text>
          {__DEV__ && tookMs !== null ? <Text variant="meta">Dev only: took {(tookMs / 1000).toFixed(1)} s from the tap</Text> : null}
        </Card>
        <Button size="large" label="Back to session" onPress={() => router.replace(`/session/${sessionId}`)} />
      </Screen>
    );
  }

  // Not open (or already in): say so instead of opening the camera.
  if (phase !== 'done' && state.kind !== 'open') {
    return (
      <Screen standalone title={`Check in to ${data.class_name}`} header={<ScreenHeader title={`Check in to ${data.class_name}`} subtitle={whenAndWhere(data)} onBack={back} />}>
        <Card>
          <Text>{state.kind === 'checked_in' ? 'You are already checked in.' : state.help}</Text>
          <Text variant="meta">{state.label}</Text>
        </Card>
        <Button variant="secondary" label="Back to session" onPress={back} />
      </Screen>
    );
  }

  const failed = result && !result.ok ? result : null;

  return (
    <Screen standalone title={`Check in to ${data.class_name}`} header={<ScreenHeader title={`Check in to ${data.class_name}`} onBack={back} />}>
      {/* The blue banner: what to do now. A failed try swaps the icon for a hand. */}
      <Card variant="hero">
        <View className="items-center gap-3 py-2">
          <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: failed ? colors.warningTint : 'rgba(255,255,255,0.16)' }}>
            <Icon name={failed ? 'hand' : phase === 'sending' ? 'clock' : 'qrScan'} size={36} color={failed ? 'warningContent' : 'primaryContent'} />
          </View>
          <Text className="text-center font-inter-bold text-section text-primary-content">{failed ? "We couldn't check you in" : phase === 'sending' ? 'Checking your code...' : 'Scan the QR code in the room'}</Text>
          <Text variant="meta" className="text-center text-primary-content">
            {whenAndWhere(data)}
          </Text>
        </View>
      </Card>

      <Card title="Check-in methods">
        {plan.data?.map((method) => {
          const status = phase === 'sending' && method.id === 'qr' ? 'Checking...' : methodStatus(plan.data, method);
          const chip = statusChip(status);
          return (
            <View key={method.id} className="flex-row items-center gap-3 py-1">
              <View className="h-10 w-10 items-center justify-center rounded-block bg-primary-tint">
                <Icon name={methodIcon[method.id] ?? 'qr'} size={20} color="primary" />
              </View>
              <Text className="flex-1">{method.label}</Text>
              <Badge label={status} tone={chip.tone} dot={chip.dot} />
            </View>
          );
        })}
        {plan.isPending ? <Text variant="muted">Looking for ways to check in...</Text> : null}
      </Card>

      {failed && !failed.ok ? (
        <>
          <Banner tone="error" title="Could not check in" message={failed.problem.message} />
          {failed.problem.manual ? <Text variant="meta">{MANUAL_HELP}</Text> : null}
          {failed.problem.retry ? <Button size="large" label="Try again" onPress={tryAgain} /> : null}
        </>
      ) : (
        <>
          <QrScanner onCode={handleCode} paused={phase !== 'scanning'} />
          <Text variant="meta" className="text-center">
            {phase === 'sending' ? 'Checking your code...' : 'Point your camera at the QR code in the room'}
          </Text>
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

      {!failed?.problem.manual ? <Text variant="meta">{MANUAL_HELP}</Text> : null}
      <Button variant="ghost" label="Cancel" onPress={back} />
    </Screen>
  );
}
