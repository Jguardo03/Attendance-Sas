import { useLocalSearchParams } from 'expo-router';

import { ClassDetails } from '@/features/sessions/class-details';

export default function ClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClassDetails scheduleId={Number(id)} />;
}
