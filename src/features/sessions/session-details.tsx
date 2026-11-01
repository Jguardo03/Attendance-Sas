import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/providers/auth';

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

const PREVIEW = 5;

// Session details (read-only). A student also sees the Check in button, shown disabled with the right label
// until check-in is switched on in the next phase, and their own attendance for the session.
export function SessionDetails({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const { can, claims } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const session = useSession(sessionId);
  const isStudent = can('attendance.check_in');
  const mine = useMyAttendance(isStudent ? claims?.appUserId : null, [sessionId]);
  const attendees = useAttendees(sessionId);

  const back = <Button variant="secondary" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;

  if (session.isPending) return <Screen standalone title="Session details">{back}<Text variant="muted">Loading...</Text></Screen>;
  if (!session.data) return <Screen standalone title="Session details">{back}<Text variant="error">This session was not found.</Text></Screen>;

  const data = session.data;
  const attendance = mine.data?.get(sessionId) ?? null;
  const badge = statusBadge(data.status);
  const state = checkInState(data, attendance);
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
            {/* Inert until Phase 8. Disabled, with the state's own label. */}
            <Button label={state.label} disabled onPress={() => undefined} />
            {state.kind === 'open' ? <Text variant="muted">Check in will be switched on in the next update.</Text> : null}
          </Card>

          <Card title="My attendance">
            <Text variant="muted">Status: {attendanceLabel(data, attendance)}</Text>
            <Text variant="muted">Checked in at: {checkedInAt(attendance)}</Text>
            <Text variant="muted">Method: {methodLabel(attendance?.check_in_method ?? null)}</Text>
          </Card>
        </>
      ) : null}

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
    </Screen>
  );
}
