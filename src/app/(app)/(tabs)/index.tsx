import { Card, Screen, Text } from '@/components/ui';
import { audienceOf } from '@/features/sessions/audience';
import { StudentHome } from '@/features/student/home';
import { AdminToday } from '@/features/teaching/admin-today';
import { LecturerHome } from '@/features/teaching/lecturer-home';
import { useAuth } from '@/providers/auth';

export default function HomeScreen() {
  const { can } = useAuth();
  const audience = audienceOf(can);
  if (audience === 'admin') return <AdminToday />;
  if (audience === 'lecturer') return <LecturerHome />;
  if (audience === 'student') return <StudentHome />;

  return (
    <Screen title="Home">
      <Card>
        <Text variant="muted">Your account has no access to sessions yet. Ask an administrator to check your role.</Text>
      </Card>
    </Screen>
  );
}
