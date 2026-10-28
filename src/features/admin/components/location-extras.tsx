import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Text, useScrollUpOn } from '@/components/ui';
import { mapDbError, type FriendlyError } from '@/lib/db-errors';

import { callFunction, db } from '../api';
import { dayName, hhmm, type Row } from '../entities';
import { adminHref } from '../routes';
import { CrudError } from './crud-error';

function Link({ label, detail, href }: { label: string; detail?: string; href: ReturnType<typeof adminHref> }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(href)} className="py-1">
      <Text>{label}</Text>
      {detail ? <Text variant="muted">{detail}</Text> : null}
    </Pressable>
  );
}

// Location details: QR check-in on/off, and what is placed in or scheduled for the room.
export function LocationExtras({ id, qrEnabled }: { id: string; qrEnabled: boolean }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  useScrollUpOn(failure);

  const beacons = useQuery({
    queryKey: ['admin', 'locations', id, 'beacons'],
    queryFn: async () => {
      const { data, error } = await db().from('beacon').select('id, uuid, major, minor').eq('location_id', id).order('id');
      if (error) throw error;
      return data as Row[];
    },
  });
  const tags = useQuery({
    queryKey: ['admin', 'locations', id, 'tags'],
    queryFn: async () => {
      const { data, error } = await db().from('nfc_tags').select('nfc_uid').eq('location_id', id).order('nfc_uid');
      if (error) throw error;
      return data as Row[];
    },
  });
  const schedules = useQuery({
    queryKey: ['admin', 'locations', id, 'schedules'],
    queryFn: async () => {
      const { data, error } = await db()
        .from('class_schedule')
        .select('id, week_day, start_time, end_time, class(name), academic_period(name)')
        .eq('location_id', id)
        .order('week_day');
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  // The secret is made and stored by the Edge Function; the app only learns whether QR is on.
  const qr = useMutation({
    mutationFn: (action: 'enable' | 'regenerate' | 'disable') => callFunction('location-qr-seed', { location_id: Number(id), action }),
    onSuccess: async () => {
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
    },
    onError: (error) => {
      setConfirming(false);
      setFailure(mapDbError(error as { code?: string; message?: string }, { item: 'location' }));
    },
  });

  return (
    <View className="gap-4">
      {failure ? <CrudError error={failure} onAction={() => setFailure(null)} onDismiss={() => setFailure(null)} /> : null}

      <Card title="QR check-in">
        <Badge label={qrEnabled ? 'QR check-in: On' : 'QR check-in: Off'} tone={qrEnabled ? 'success' : 'neutral'} />
        {qrEnabled ? (
          confirming ? (
            <>
              <Text variant="muted">Printed or displayed QR codes stop working until the new secret is in use.</Text>
              <Button variant="danger" label={qr.isPending ? 'Working...' : 'Regenerate secret'} disabled={qr.isPending} onPress={() => qr.mutate('regenerate')} />
              <Button variant="secondary" label="Cancel" onPress={() => setConfirming(false)} />
            </>
          ) : (
            <>
              <Button variant="secondary" label="Regenerate QR secret" onPress={() => setConfirming(true)} />
              <Button variant="secondary" label="Turn QR off" disabled={qr.isPending} onPress={() => qr.mutate('disable')} />
            </>
          )
        ) : (
          <Button label={qr.isPending ? 'Working...' : 'Enable QR'} disabled={qr.isPending} onPress={() => qr.mutate('enable')} />
        )}
      </Card>

      <Card title="Equipment in this location">
        {beacons.data?.length === 0 && tags.data?.length === 0 ? <Text variant="muted">No beacons or NFC tags assigned.</Text> : null}
        {beacons.data?.map((beacon) => (
          <Link key={beacon.id} label={`Beacon ${String(beacon.uuid).slice(0, 8)}`} detail={`Major ${beacon.major}, minor ${beacon.minor}`} href={adminHref('beacons', beacon.id)} />
        ))}
        {tags.data?.map((tag) => (
          <Link key={tag.nfc_uid} label={`NFC tag ${tag.nfc_uid}`} href={adminHref('nfc-tags', tag.nfc_uid)} />
        ))}
      </Card>

      <Card title="Schedules using this location">
        {schedules.data?.length === 0 ? <Text variant="muted">None.</Text> : null}
        {schedules.data?.map((schedule) => (
          <Link
            key={schedule.id}
            label={`${schedule.class?.name}`}
            detail={`${dayName(schedule.week_day)} ${hhmm(schedule.start_time)} to ${hhmm(schedule.end_time)}, ${schedule.academic_period?.name}`}
            href={adminHref('schedules', schedule.id)}
          />
        ))}
      </Card>
    </View>
  );
}

// NFC tag details: replace the secret token. The token itself is never shown.
export function TagExtras({ uid }: { uid: string }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  useScrollUpOn(failure);

  const regenerate = useMutation({
    mutationFn: () => callFunction('nfc-tag', { action: 'regenerate', nfc_uid: uid }),
    onSuccess: () => {
      setConfirming(false);
      setDone(true);
    },
    onError: (error) => {
      setConfirming(false);
      setFailure(mapDbError(error as { code?: string; message?: string }, { item: 'NFC tag' }));
    },
  });

  return (
    <View className="gap-4">
      {failure ? <CrudError error={failure} onAction={() => setFailure(null)} onDismiss={() => setFailure(null)} /> : null}
      <Card title="Secret token">
        <Text variant="muted">The token is stored on the server and is never shown. Replacing it means the tag must be written again.</Text>
        {done ? <Badge label="Token replaced" tone="success" /> : null}
        {confirming ? (
          <>
            <Button variant="danger" label={regenerate.isPending ? 'Working...' : 'Replace token'} disabled={regenerate.isPending} onPress={() => regenerate.mutate()} />
            <Button variant="secondary" label="Cancel" onPress={() => setConfirming(false)} />
          </>
        ) : (
          <Button variant="secondary" label="Regenerate token" onPress={() => { setDone(false); setConfirming(true); }} />
        )}
      </Card>
    </View>
  );
}
