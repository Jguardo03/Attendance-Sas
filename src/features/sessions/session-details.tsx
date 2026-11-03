import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { TeachingSessionPanel } from '@/features/teaching/teaching-session-panel';
import { markCheckInStart } from '@/features/check-in/timing';
import { useAuth } from '@/providers/auth';

import { audienceOf } from './audience';

import {
  attendanceLabel,
  checkInState,
  checkedInAt,
  formatDayLong,
  hhmm,
  lecturerName,
  methodLabel,
  statusBadge,
} from './format';
import { useAttendees, useMyAttendance, useSession } from './queries';
import { useAttendanceRealtime } from './realtime';

const PREVIEW = 5;

// Session details. A student also sees the Check in button (live while check in is open, otherwise disabled with the
// right label) and their own attendance. A lecturer or admin can show the room QR code while check in is open.
export function SessionDetails({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const { can, claims } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const session = useSession(sessionId);
  // Students get check in and their own attendance; lecturers and admins get the whole class's attendance.
  const isStudent = audienceOf(can) === 'student';
  const mine = useMyAttendance(isStudent ? claims?.appUserId : null, [sessionId]);
  const attendees = useAttendees(sessionId, isStudent);
  // A student's own record can change under them (a lecturer checks them in): hear about it at once.
  useAttendanceRealtime(isStudent && claims?.appUserId ? `student_id=eq.${claims.appUserId}` : null);

  const back = <Button variant="secondary" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;

  if (session.isPending) return <Screen standalone title="Session details">{back}<Text variant="muted">Loading...</Text></Screen>;
  if (!session.data) return <Screen standalone title="Session details">{back}<Text variant="error">This session was not found.</Text></Screen>;

  const data = session.data;
  const attendance = mine.data?.get(sessionId) ?? null;
  const badge = statusBadge(data.status);
  const state = checkInState(data, attendance);
  // The room code is shown by an admin, or by the lecturer of this session while check in is open.
  const checkInOpen = data.status !== 'cancelled' && data.now_local >= data.check_in_opens_at && data.now_local < data.ends_at;
  const isOwnLecturer = can('sessions.manage_own') && claims?.appUserId === data.lecturer_id;
  const showRoomQr = !isStudent && data.location_id !== null && checkInOpen && (can('locations.manage') || isOwnLecturer);
  const people = attendees.data ?? [];
  const visible = showAll ? people : people.slice(0, PREVIEW);

  return (
    <Screen standalone title={data.class_name}>
      {back}
      <Badge label={badge.label} tone={badge.tone} />

      <Card title="Session details">
        <Text variant="muted">Class: {data.class_name}</Text>
        <Text variant="muted">Date: {formatDayLong(data.session_date)}</Text>
        <Text variant="muted">
          Time: {hhmm(data.start_time)} to {hhmm(data.end_time)}
        </Text>
        <Text variant="muted">Location: {data.location_name}</Text>
        <Text variant="muted">Status: {badge.label}</Text>
      </Card>

      <Card title="Lecturer">
        <Text>{lecturerName(data)}</Text>
        {data.lecturer_email ? <Text variant="muted">{data.lecturer_email}</Text> : null}
      </Card>

      {isStudent ? (
        <>
          <Card title="Check in">
            <Text variant="muted">{state.help}</Text>
            <Button
              label={state.label}
              disabled={state.kind !== 'open'}
              onPress={() => {
                markCheckInStart();
                router.push(`/check-in/${sessionId}`);
              }}
            />
          </Card>

          <Card title="My attendance">
            <Text variant="muted">Status: {attendanceLabel(data, attendance)}</Text>
            <Text variant="muted">Checked in at: {checkedInAt(attendance)}</Text>
            <Text variant="muted">Method: {methodLabel(attendance?.check_in_method ?? null)}</Text>
          </Card>
        </>
      ) : null}

      {isStudent ? (
        <Card title={`Session attendees (${people.length})`}>
          {attendees.isPending ? <Text variant="muted">Loading...</Text> : null}
          {visible.map((person, index) => (
            <Text key={`${person.last_name}-${person.first_name}-${index}`}>
              {person.first_name} {person.last_name}
            </Text>
          ))}
          {people.length > PREVIEW ? (
            <Button variant="secondary" label={showAll ? 'Show fewer' : 'Show all'} onPress={() => setShowAll((value) => !value)} />
          ) : null}
        </Card>
      ) : (
        <>
          {showRoomQr ? (
            <Card title="Room QR code">
              <Text variant="muted">Show the code on a screen in the room so students can scan it to check in.</Text>
              <Button label="Show room QR" onPress={() => router.push(`/room-qr?session=${sessionId}`)} />
            </Card>
          ) : null}
          <TeachingSessionPanel session={data} />
        </>
      )}
    </Screen>
  );
}
