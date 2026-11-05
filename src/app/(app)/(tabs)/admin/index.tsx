import { Redirect, useRouter } from 'expo-router';

import { Card, ListRow, Screen, Text } from '@/components/ui';
import { adminIcons, useAdminEntities } from '@/features/admin/components/admin-menu';
import { adminHref } from '@/features/admin/routes';
import { useIsWide } from '@/features/shell/nav';
import { useAuth } from '@/providers/auth';

// The Admin hub (Admin UI page 2): a list of the records to manage, with a link to the attendance reports. On wide
// screens the same list is the menu beside the navigation, so this opens the first record instead.
export default function AdminHome() {
  const { can } = useAuth();
  const router = useRouter();
  const wide = useIsWide();
  const shown = useAdminEntities();
  const reports = can('attendance.view_all');
  if (wide && shown.length > 0) return <Redirect href={adminHref(shown[0].key)} />;

  return (
    <Screen title="Admin">
      <Text variant="meta">Manage the records the rest of the app depends on.</Text>
      <Card>
        {shown.map((entity, index) => (
          <ListRow
            key={entity.key}
            icon={adminIcons[entity.key] ?? 'admin'}
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
