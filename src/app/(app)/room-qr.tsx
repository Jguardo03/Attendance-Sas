import { useLocalSearchParams } from 'expo-router';

import { RoomQrDisplay } from '@/features/check-in/room-qr-display';

export default function RoomQrRoute() {
  const { session, location } = useLocalSearchParams<{ session?: string; location?: string }>();
  return <RoomQrDisplay sessionId={session ? Number(session) : undefined} locationId={location ? Number(location) : undefined} />;
}
