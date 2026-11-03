import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { entities } from '@/features/admin/entities';
import { useAuth } from '@/providers/auth';
import { adminHref } from '@/features/admin/routes';

export default function AdminHome() {
  const { can } = useAuth();
  const router = useRouter();

  return (
    <Screen title="Admin">
      <Text variant="muted">Manage the records the rest of the app depends on.</Text>
      {entities
        .filter((entity) => can(entity.permission))
        .map((entity) => (
          <Pressable key={entity.key} accessibilityRole="link" onPress={() => router.push(adminHref(entity.key))}>
            <Card>
              <Text variant="heading">{entity.label}</Text>
            </Card>
          </Pressable>
        ))}
      {can('attendance.view_all') ? (
        <Pressable accessibilityRole="link" onPress={() => router.push('/reports')}>
          <Card>
            <Text variant="heading">Attendance reports</Text>
            <Text variant="muted">By student, lecturer or class, with filters and CSV export.</Text>
          </Card>
        </Pressable>
      ) : null}
    </Screen>
  );
}
