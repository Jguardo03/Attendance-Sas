import { useLocalSearchParams } from 'expo-router';

import { audienceOf } from '@/features/sessions/audience';
import { ClassDetails } from '@/features/sessions/class-details';
import { TeachingClassDetails } from '@/features/teaching/teaching-class-details';
import { useAuth } from '@/providers/auth';

export default function ClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  // A student sees their own attendance; a lecturer or admin sees the whole class.
  return audienceOf(can) === 'student' ? <ClassDetails scheduleId={Number(id)} /> : <TeachingClassDetails scheduleId={Number(id)} />;
}
