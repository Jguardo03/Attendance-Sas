import { Card, Screen, Text } from '@/components/ui';
import { StudentClasses } from '@/features/student/classes';
import { useAuth } from '@/providers/auth';

export default function ClassesScreen() {
  const { can } = useAuth();
  // Chosen by permission, not by role name. Lecturer and admin versions arrive in the next step of Phase 7.
  if (can('attendance.check_in')) return <StudentClasses />;

  return (
    <Screen title="Classes">
      <Card title="Classes">
        <Text variant="muted">Built next for lecturers and admins.</Text>
      </Card>
    </Screen>
  );
}
