import { useLocalSearchParams } from 'expo-router';

import { CheckInScreen } from '@/features/check-in/check-in-screen';

export default function CheckInRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CheckInScreen sessionId={Number(id)} />;
}
