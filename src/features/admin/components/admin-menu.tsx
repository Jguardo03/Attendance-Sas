import { usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';

import type { IconName } from '@/components/icon';
import { Text } from '@/components/ui';
import { entities } from '@/features/admin/entities';
import { adminHref } from '@/features/admin/routes';
import { Row } from '@/features/shell/sidebar';
import { useAuth } from '@/providers/auth';

// One icon per kind of record; anything new falls back to the generic one.
export const adminIcons: Record<string, IconName> = {
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

/** The records this person may manage, in menu order. */
export function useAdminEntities() {
  const { can } = useAuth();
  return entities.filter((entity) => can(entity.permission));
}

// The Admin sub menu on wide screens (Admin UI page 1): the records to manage in a column beside the main navigation,
// with the one being shown highlighted. The page of the chosen record opens to its right.
export function AdminMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = useAuth();
  const shown = useAdminEntities();

  return (
    <View className="w-56 gap-1 border-r border-border bg-surface px-3 py-5" role="navigation" accessibilityLabel="Admin">
      <Text variant="label" className="mb-1 px-3">
        Manage
      </Text>
      {shown.map((entity) => {
        const href = adminHref(entity.key) as string;
        return (
          <Row key={entity.key} icon={adminIcons[entity.key] ?? 'admin'} label={entity.label} active={pathname === href || pathname.startsWith(`${href}/`)} onPress={() => router.push(href as never)} />
        );
      })}
      {can('attendance.view_all') ? <Row icon="admin" label="Attendance reports" onPress={() => router.push('/reports')} /> : null}
    </View>
  );
}
