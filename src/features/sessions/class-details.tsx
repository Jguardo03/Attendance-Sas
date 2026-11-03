import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BreakdownRing } from '@/components/charts';
import { Icon } from '@/components/icon';
import { Badge, Card, Screen, ScreenHeader, SegmentedTabs, Text, Loading } from '@/components/ui';
import { useAuth } from '@/providers/auth';

import {
  attendanceLabel,
  attendancePill,
  checkedInAt,
  formatDayShort,
  methodLabel,
  sessionPill,
  slotLabel,
  timeRange,
  type MyAttendance,
  type Session,
} from './format';
import { useAppNow, useMyAttendance, useSchedule, useSessions, useStudentOverview } from './queries';

function ClassSessionRow({ session, attendance, previous, last }: { session: Session; attendance?: MyAttendance | null; previous: boolean; last: boolean }) {
  const router = useRouter();
  const upcoming = sessionPill(session.status);
  const word = attendanceLabel(session, attendance);
  const attended = attendance && attendance.status !== 'absent';

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${formatDayShort(session.session_date)} ${timeRange(session)}`}
      onPress={() => router.push(`/session/${session.session_id}`)}
      className={`min-h-14 flex-row items-center gap-3 py-2 active:opacity-80 ${last ? '' : 'border-b border-border'}`}>
      <View className="flex-1 gap-0.5">
        <Text variant="card">
          {formatDayShort(session.session_date)} · {timeRange(session)}
        </Text>
        <Text variant="meta">{previous ? (attended ? `Checked in ${checkedInAt(attendance)} · ${methodLabel(attendance.check_in_method)}` : 'No check-in') : session.location_name}</Text>
      </View>
      {previous ? (
        session.status === 'cancelled' ? (
          <Badge label="Cancelled" tone="cancelled" />
        ) : (
          <Badge label={word} {...attendancePill(word)} />
        )
      ) : (
        <Badge label={upcoming.label} tone={upcoming.tone} dot={upcoming.dot} />
      )}
    </Pressable>
  );
}

// Class details for a student (Student UI page 20): the class, "My attendance in this class" with the ring and counts,
// the lecturer, and the class's upcoming and previous sessions.
export function ClassDetails({ scheduleId }: { scheduleId: number }) {
  const router = useRouter();
  const { claims } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'previous'>('upcoming');
  const schedule = useSchedule(scheduleId);
  const now = useAppNow();
  const sessions = useSessions(['schedule', scheduleId], (q) => q.eq('schedule_id', scheduleId).order('session_date'));
  const numbers = useStudentOverview(claims?.appUserId);
  const attendance = useMyAttendance(claims?.appUserId, (sessions.data ?? []).map((session) => session.session_id));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/classes'));

  if (schedule.isPending) return <Screen standalone title="Class details" header={<ScreenHeader title="Class details" onBack={goBack} />}><Loading /></Screen>;
  if (!schedule.data) return <Screen standalone title="Class details" header={<ScreenHeader title="Class details" onBack={goBack} />}><Text variant="error">This class was not found.</Text></Screen>;

  const info = schedule.data;
  const mine = numbers.data?.get(scheduleId);
  const nowLocal = now.data ?? '';
  const all = sessions.data ?? [];
  const upcoming = all.filter((session) => session.ends_at > nowLocal);
  const previous = all.filter((session) => session.ends_at <= nowLocal).reverse();
  const shown = tab === 'upcoming' ? upcoming : previous;
  const lecturer = `${info.lecturer_first_name ?? ''} ${info.lecturer_last_name ?? ''}`.trim();

  return (
    <Screen standalone title={info.class_name} header={<ScreenHeader title={info.class_name} subtitle={`${info.period_name} (${info.period_status})`} onBack={goBack} />}>
      <Card variant="hero">
        <View className="flex-row items-center gap-4">
          {mine && mine.attendance_pct !== null ? (
            <>
              <View className="rounded-full bg-surface p-1">
                <BreakdownRing present={Number(mine.present)} late={Number(mine.late)} absent={Number(mine.absent)} percent={Number(mine.attendance_pct)} size={76} strokeWidth={8} caption="" />
              </View>
              <View className="flex-1 gap-1">
                <Text variant="card" className="text-primary-content">
                  My attendance in this class
                </Text>
                <Text className="text-primary-content">
                  {mine.present} present · {mine.late} late · {mine.absent} absent
                </Text>
              </View>
            </>
          ) : (
            <View className="flex-1 gap-1">
              <Text variant="card" className="text-primary-content">
                My attendance in this class
              </Text>
              <Text className="text-primary-content">No finished sessions yet.</Text>
            </View>
          )}
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center gap-2">
          <Icon name="clock" size={18} color="contentMuted" />
          <Text className="flex-1">
            {slotLabel(info.week_day, info.start_time, info.end_time)} · {info.frequency_name}
          </Text>
        </View>
        {info.location_name ? (
          <View className="flex-row items-center gap-2">
            <Icon name="pin" size={18} color="contentMuted" />
            <Text className="flex-1">{info.location_name}</Text>
          </View>
        ) : null}
        {info.class_description ? <Text variant="meta">{info.class_description}</Text> : null}
      </Card>

      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name={lecturer} id={info.lecturer_id} size={44} />
          <View className="flex-1">
            <Text variant="meta">Lecturer</Text>
            <Text variant="card">{lecturer}</Text>
            {info.lecturer_email ? <Text variant="meta">{info.lecturer_email}</Text> : null}
          </View>
        </View>
      </Card>

      <SegmentedTabs
        label="Sessions"
        value={tab}
        options={[
          { value: 'previous', label: 'Previous' },
          { value: 'upcoming', label: 'Upcoming' },
        ]}
        onChange={(value) => setTab(value as 'upcoming' | 'previous')}
      />
      <Card>
        {sessions.data && shown.length === 0 ? <Text variant="meta">{tab === 'upcoming' ? 'No upcoming sessions.' : 'No previous sessions.'}</Text> : null}
        {shown.map((session, index) => (
          <ClassSessionRow key={session.session_id} session={session} attendance={attendance.data?.get(session.session_id)} previous={tab === 'previous'} last={index === shown.length - 1} />
        ))}
      </Card>
    </Screen>
  );
}
