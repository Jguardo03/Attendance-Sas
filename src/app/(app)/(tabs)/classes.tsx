import { Card, Screen, Text } from '@/components/ui';
import { audienceOf } from '@/features/sessions/audience';
import { StudentClasses } from '@/features/student/classes';
import { AdminClasses } from '@/features/teaching/admin-classes';
import { LecturerClasses } from '@/features/teaching/lecturer-classes';
import { useAuth } from '@/providers/auth';

export default function ClassesScreen() {
  const { can } = useAuth();
  const audience = audienceOf(can);
  if (audience === 'admin') return <AdminClasses />;
  if (audience === 'lecturer') return <LecturerClasses />;
  if (audience === 'student') return <StudentClasses />;

  return (
    <Screen title="Classes">
      <Card>
        <Text variant="muted">Your account has no classes.</Text>
      </Card>
    </Screen>
  );
}
