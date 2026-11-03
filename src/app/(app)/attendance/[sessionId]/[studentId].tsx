import { useLocalSearchParams } from 'expo-router';

import { AttendanceRecord } from '@/features/attendance-edit/attendance-record';

export default function AttendanceRecordRoute() {
  const { sessionId, studentId, edit } = useLocalSearchParams<{ sessionId: string; studentId: string; edit?: string }>();
  return <AttendanceRecord sessionId={Number(sessionId)} studentId={studentId} startEditing={edit === '1'} />;
}
