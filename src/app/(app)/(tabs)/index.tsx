import { ConnectionStatus } from '@/components/connection-status';
import { Card, Screen, Text } from '@/components/ui';
import { StudentHome } from '@/features/student/home';
import { useAuth } from '@/providers/auth';

export default function HomeScreen() {
  const { can } = useAuth();
  // Chosen by permission, not by role name. Lecturer and admin Home arrive in the next step of Phase 7.
  if (can('attendance.check_in')) return <StudentHome />;

  return (
    <Screen title="Home">
      <ConnectionStatus />
      <Card title="Today sessions">
        <Text variant="muted">Built next for lecturers and admins.</Text>
      </Card>
    </Screen>
  );
}
