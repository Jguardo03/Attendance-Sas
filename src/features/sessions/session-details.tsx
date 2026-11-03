import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Badge, Banner, Button, Card, Screen, ScreenHeader, Text, Loading } from '@/components/ui';
import { markCheckInStart } from '@/features/check-in/timing';
import { TeachingSessionPanel } from '@/features/teaching/teaching-session-panel';
import { useAuth } from '@/providers/auth';

import { audienceOf } from './audience';

import {
  attendanceLabel,
  attendancePill,
  checkInState,
  checkedInAt,
  formatDayLong,
  hhmm,
  lecturerName,
  methodLabel,
  sessionPill,
  timeRange,
} from './format';
import { useAttendees, useMyAttendance, useSession } from './queries';
import { useAttendanceRealtime } from './realtime';

const PREVIEW = 5;

function MetaRow({ icon, text }: { icon: 'calendar' | 'clock' | 'pin'; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name={icon} size={18} color="contentMuted" />
      <Text className="flex-1">{text}</Text>
    </View>
  );
}

// Session details (Student UI pages 25 to 32). A student also sees the Check in card (live while check in is open,
// otherwise the reason it is not) and their own attendance. A lecturer or admin can show the room QR code while check
// in is open and sees the whole class's attendance.
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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (session.isPending) return <Screen standalone title="Session details" header={<ScreenHeader title="Session details" onBack={goBack} />}><Loading /></Screen>;
  if (!session.data) return <Screen standalone title="Session details" header={<ScreenHeader title="Session details" onBack={goBack} />}><Text variant="error">This session was not found.</Text></Screen>;

  const data = session.data;
  const attendance = mine.data?.get(sessionId) ?? null;
  const pill = sessionPill(data.status);
  const state = checkInState(data, attendance);
  const word = attendanceLabel(data, attendance);
  // The room code is shown by an admin, or by the lecturer of this session while check in is open.
  const checkInOpen = data.status !== 'cancelled' && data.now_local >= data.check_in_opens_at && data.now_local < data.ends_at;
  const isOwnLecturer = can('sessions.manage_own') && claims?.appUserId === data.lecturer_id;
  const showRoomQr = !isStudent && data.location_id !== null && checkInOpen && (can('locations.manage') || isOwnLecturer);
  const people = attendees.data ?? [];
  const visible = showAll ? people : people.slice(0, PREVIEW);
  const lecturer = lecturerName(data);
  const showResult = isStudent && data.status !== 'cancelled' && (data.status === 'finished' || state.kind === 'checked_in');

  return (
    <Screen standalone title={data.class_name} header={<ScreenHeader title={data.class_name} subtitle={data.period_name} status={{ label: pill.label, tone: pill.tone, dot: pill.dot }} onBack={goBack} />}>
      <Card>
        <MetaRow icon="calendar" text={formatDayLong(data.session_date)} />
        <MetaRow icon="clock" text={timeRange(data)} />
        {data.location_name ? <MetaRow icon="pin" text={data.location_name} /> : null}
      </Card>

      {isStudent ? (
        <>
          {data.status === 'cancelled' ? (
            <Banner tone="warning" title="This session was cancelled" message="It won't count towards your attendance." />
          ) : state.kind === 'open' ? (
            <Card variant="hero">
              <Text className="font-inter-bold text-section text-primary-content">You haven&apos;t checked in yet</Text>
              <Text className="text-primary-content">{state.help}</Text>
              <Button
                variant="secondary"
                size="large"
                icon="check"
                label={state.label}
                onPress={() => {
                  markCheckInStart();
                  router.push(`/check-in/${sessionId}`);
                }}
              />
            </Card>
          ) : state.kind === 'checked_in' ? (
            <Banner tone="success" title="You're checked in" message={state.help} />
          ) : (
            <Card title="Check in">
              <Text variant="meta">{state.help}</Text>
              <Button label={state.label} disabled />
            </Card>
          )}

          {showResult ? (
            <Card title="My attendance">
              <View className="flex-row items-center justify-between">
                <Text variant="meta">Status</Text>
                <Badge label={word} {...attendancePill(word)} />
              </View>
              <View className="flex-row items-center justify-between">
                <Text variant="meta">Checked in at</Text>
                <Text>{checkedInAt(attendance)}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text variant="meta">Method</Text>
                <Text>{methodLabel(attendance?.check_in_method ?? null)}</Text>
              </View>
              {data.status === 'finished' ? <Text variant="meta">Something wrong? Ask your lecturer to correct it.</Text> : null}
            </Card>
          ) : null}
        </>
      ) : null}

      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name={lecturer} id={data.lecturer_id} size={44} />
          <View className="flex-1">
            <Text variant="meta">Lecturer</Text>
            <Text variant="card">{lecturer}</Text>
            {data.lecturer_email ? <Text variant="meta">{data.lecturer_email}</Text> : null}
          </View>
        </View>
      </Card>

      {isStudent ? (
        <Card title={`Session attendees (${people.length})`}>
          {attendees.isPending ? <Loading /> : null}
          {people.length > 0 ? (
            <View className="flex-row flex-wrap items-center gap-1">
              {people.slice(0, PREVIEW).map((person, index) => (
                <Avatar key={`${person.last_name}-${person.first_name}-${index}`} name={`${person.first_name} ${person.last_name}`} size={32} />
              ))}
              {people.length > PREVIEW ? <Text variant="meta">+{people.length - PREVIEW} more</Text> : null}
            </View>
          ) : null}
          {visible.map((person, index) => (
            <View key={`${person.last_name}-${person.first_name}-${index}`} className="flex-row items-center gap-2">
              <Avatar name={`${person.first_name} ${person.last_name}`} size={28} />
              <Text>
                {person.first_name} {person.last_name}
              </Text>
            </View>
          ))}
          {people.length > PREVIEW ? <Button variant="secondary" label={showAll ? 'Show fewer' : 'Show all'} onPress={() => setShowAll((value) => !value)} /> : null}
        </Card>
      ) : (
        <>
          {showRoomQr ? (
            <Card title="Room QR code">
              <Text variant="meta">Show the code on a screen in the room so students can scan it to check in.</Text>
              <Button label="Show room QR" icon="qr" onPress={() => router.push(`/room-qr?session=${sessionId}`)} />
            </Card>
          ) : null}
          <TeachingSessionPanel session={data} />
        </>
      )}
      {data.status === 'rescheduled' ? <Text variant="meta">Moved to {hhmm(data.start_time)}.</Text> : null}
    </Screen>
  );
}
