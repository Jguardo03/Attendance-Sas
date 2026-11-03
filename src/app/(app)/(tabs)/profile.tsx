import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/icon';
import { Button, Card, Screen, Text } from '@/components/ui';
import { roleLabel } from '@/features/shell/nav';
import { SignOutConfirm } from '@/features/shell/sign-out-confirm';
import { useMyProfile } from '@/features/shell/use-my-profile';
import { useAuth } from '@/providers/auth';

// What each check in method is for, shown to students (Student UI page 40). Information only until the methods are built.
const permissions: { icon: IconName; title: string; text: string }[] = [
  { icon: 'bluetooth', title: 'Bluetooth', text: 'Room beacon' },
  { icon: 'nfc', title: 'NFC', text: 'Door tag' },
  { icon: 'qrScan', title: 'Camera', text: 'QR code' },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text variant="meta">{label}</Text>
      <Text className="flex-1 text-right">{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { claims, can } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const profile = useMyProfile();
  const data = profile.data;
  const name = data ? `${data.first_name} ${data.last_name}` : '';

  return (
    <Screen
      title="Profile"
      header={
        data ? (
          <View className="items-center gap-1 pt-2">
            <Avatar name={name} id={data.id} size={72} />
            <Text variant="title" className="mt-2">
              {name}
            </Text>
            <Text variant="meta">
              {roleLabel(claims?.role)} · {data.id}
            </Text>
          </View>
        ) : undefined
      }>
      {profile.isPending ? <Text variant="muted">Loading...</Text> : null}
      {profile.isError ? <Text variant="error">Could not load your profile.</Text> : null}

      {can('attendance.check_in') ? (
        <Card title="Check-in permissions">
          {permissions.map((item) => (
            <View key={item.title} className="flex-row items-center gap-3 py-1">
              <View className="h-10 w-10 items-center justify-center rounded-block bg-primary-tint">
                <Icon name={item.icon} size={20} color="primary" />
              </View>
              <View className="flex-1">
                <Text variant="card">{item.title}</Text>
                <Text variant="meta">{item.text}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {data ? (
        <Card title="Personal info">
          <InfoRow label="Email" value={data.email} />
          <InfoRow label="ID" value={data.id} />
          {claims?.role ? <InfoRow label="Role" value={roleLabel(claims.role)} /> : null}
        </Card>
      ) : null}

      {confirming ? <SignOutConfirm onCancel={() => setConfirming(false)} /> : <Button variant="secondary" label="Sign out" onPress={() => setConfirming(true)} />}
      {__DEV__ ? <Button variant="ghost" label="Dev: UI gallery" onPress={() => router.push('/dev/ui')} /> : null}
    </Screen>
  );
}
