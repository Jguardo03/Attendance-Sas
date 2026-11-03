import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/icon';
import { Button, Card, Screen, Text, Loading } from '@/components/ui';
import { audienceOf } from '@/features/sessions/audience';
import { roleLabel } from '@/features/shell/nav';
import { SignOutConfirm } from '@/features/shell/sign-out-confirm';
import { useMyProfile } from '@/features/shell/use-my-profile';
import { useLecturerOverview } from '@/features/teaching/lecturer-overview';
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

// A lecturer's three numbers (Lecturer UI page 26): classes this period, students in them, and the average attendance.
function LecturerStats() {
  const overview = useLecturerOverview();
  if (!overview.ready) return null;
  const stats = [
    { value: String(overview.classes), label: 'classes' },
    { value: String(overview.students), label: 'students' },
    { value: overview.average === null ? '-' : `${overview.average}%`, label: 'average' },
  ];
  return (
    <Card>
      <View className="flex-row">
        {stats.map((stat) => (
          <View key={stat.label} className="flex-1 items-center" accessibilityLabel={`${stat.value} ${stat.label}`} accessible>
            <Text variant="title">{stat.value}</Text>
            <Text variant="meta">{stat.label}</Text>
          </View>
        ))}
      </View>
    </Card>
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
      {profile.isPending ? <Loading /> : null}
      {profile.isError ? <Text variant="error">Could not load your profile.</Text> : null}

      {audienceOf(can) === 'lecturer' ? <LecturerStats /> : null}

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

      {audienceOf(can) === 'lecturer' ? <Text variant="meta">Lecturers don&apos;t check in, so no device permissions are needed.</Text> : null}

      {confirming ? <SignOutConfirm onCancel={() => setConfirming(false)} /> : <Button variant="secondary" label="Sign out" onPress={() => setConfirming(true)} />}
      {__DEV__ ? <Button variant="ghost" label="Dev: UI gallery" onPress={() => router.push('/dev/ui')} /> : null}
    </Screen>
  );
}
