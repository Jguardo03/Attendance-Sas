import { useLocalSearchParams } from 'expo-router';

import { StudentHistory } from '@/features/teaching/student-history';

export default function StudentRoute() {
  const { id, schedule } = useLocalSearchParams<{ id: string; schedule?: string }>();
  return <StudentHistory studentId={id} scheduleId={schedule ? Number(schedule) : null} />;
}
