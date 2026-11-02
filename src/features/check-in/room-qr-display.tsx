import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { QrCode } from '@/components/qr-code';
import { FunctionCallError } from '@/lib/functions';

import { fetchRoomQr } from './api';

function problemText(error: unknown): string {
  if (error instanceof FunctionCallError) {
    if (error.code === 'qr_disabled') return 'QR check in is turned off for this room. An admin can turn it on from the location details.';
    if (error.status === 403) return 'You can only show the code for your own open session.';
    if (error.code === 'session_not_found' || error.status === 404) return 'This session or room was not found.';
    if (error.code === 'cancelled') return 'This session is cancelled.';
    if (error.code === 'closed') return 'Check in has closed for this session.';
  }
  return 'The code could not be loaded. Check the connection and try again.';
}

// The code a room shows on a projector or tablet. It changes every 30 seconds; the page asks the server for the next
// one when the old one runs out and shows a countdown. Asked for by session (lecturer, admin) or by room (admin).
export function RoomQrDisplay({ sessionId, locationId }: { sessionId?: number; locationId?: number }) {
  const router = useRouter();
  const qr = useQuery({
    queryKey: ['room-qr', sessionId ?? null, locationId ?? null],
    queryFn: () => fetchRoomQr({ sessionId, locationId }),
    retry: false,
    gcTime: 0,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = qr.data ? Math.max(0, qr.data.expires_in - Math.floor((now - qr.dataUpdatedAt) / 1000)) : 0;
  // The code changes every 30 seconds: ask for the next one the moment the countdown ends (and again if that fails).
  useEffect(() => {
    if (qr.data && left === 0 && !qr.isFetching) void qr.refetch();
  }, [qr, left]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen standalone title="Room QR code">
      <Button variant="secondary" label="Back" onPress={back} />

      {qr.isPending ? <Text variant="muted">Loading the code...</Text> : null}

      {qr.error && !qr.data ? (
        <Card title="Cannot show the code">
          <Text variant="error">{problemText(qr.error)}</Text>
          <Button label="Try again" onPress={() => qr.refetch()} />
        </Card>
      ) : null}

      {qr.data ? (
        <View className="items-center gap-4">
          <Text variant="title">{qr.data.location_name}</Text>
          <QrCode value={qr.data.payload} size={320} label={`Check in code for ${qr.data.location_name}`} />
          <Badge label={`Changes in ${left} s`} tone={left > 5 ? 'neutral' : 'warning'} />
          <Text variant="muted">Students scan this code with the app to check in. Do not share a picture of it.</Text>
          {qr.error ? <Text variant="error">{problemText(qr.error)}</Text> : null}
          {/* Development builds only: the text of the code, for the paste box on the check in screen. */}
          {__DEV__ ? <Text variant="muted" selectable>{qr.data.payload}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}
