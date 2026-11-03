import { useRouter } from 'expo-router';

import { Card, ListRow, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/icon';
import { entities } from '@/features/admin/entities';
import { adminHref } from '@/features/admin/routes';
import { useAuth } from '@/providers/auth';

// One icon per kind of record; anything new falls back to the generic one.
const icons: Record<string, IconName> = {
  periods: 'calendar',
  classes: 'classes',
  schedules: 'clock',
  locations: 'room',
  beacons: 'bluetooth',
  'nfc-tags': 'nfc',
  frequencies: 'frequency',
  'email-formats': 'mail',
  permissions: 'permissions',
  roles: 'roles',
  users: 'users',
};

// The Admin hub (Admin UI page 15): a list of the records to manage, with a link to the attendance reports.
export default function AdminHome() {
  const { can } = useAuth();
  const router = useRouter();
  const shown = entities.filter((entity) => can(entity.permission));
  const reports = can('attendance.view_all');

  return (
    <Screen title="Admin">
      <Text variant="meta">Manage the records the rest of the app depends on.</Text>
      <Card>
        {shown.map((entity, index) => (
          <ListRow
            key={entity.key}
            icon={icons[entity.key] ?? 'admin'}
            title={entity.label}
            onPress={() => router.push(adminHref(entity.key))}
            last={index === shown.length - 1 && !reports}
          />
        ))}
        {reports ? (
          <ListRow icon="admin" title="Attendance reports" subtitle="By student, lecturer or class, with filters and CSV export." onPress={() => router.push('/reports')} last />
        ) : null}
      </Card>
    </Screen>
  );
}
