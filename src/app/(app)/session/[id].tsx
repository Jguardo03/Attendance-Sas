import { useLocalSearchParams } from 'expo-router';

import { SessionDetails } from '@/features/sessions/session-details';

export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SessionDetails sessionId={Number(id)} />;
}
