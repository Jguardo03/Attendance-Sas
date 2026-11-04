import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressRing } from '@/components/charts';
import { Icon, type IconName } from '@/components/icon';
import { Badge, Banner, Button, Card, Screen, ScreenHeader, Text, TextField, TimeField, useScrollUpOn, Loading } from '@/components/ui';
import {
  attendancePill,
  formatDayLong,
  formatDayShort,
  hhmm,
  melbourneDateTime,
  melbourneTime,
  methodLabel,
  timeRange,
  type Session,
} from '@/features/sessions/format';
import {
  useAttendanceHistory,
  useAttendanceRecord,
  useSession,
  useStudentClassNumbers,
  useStudentInfo,
  type AttendanceHistoryRow,
  type AttendanceRecord as RecordRow,
  type StudentInfo,
} from '@/features/sessions/queries';
import { useIsWide } from '@/features/shell/nav';
import { RING_THRESHOLD } from '@/lib/ring';
import type { ColorToken } from '@/theme/tokens';
import { useAuth } from '@/providers/auth';

import { changeAttendance } from './api';
import {
  canChangeAttendance,
  changeSentence,
  checkedInSummary,
  defaultTime,
  REASON_MAX,
  statusChoices,
  statusWord,
  validateChange,
  type ChangeErrors,
  type EditableStatus,
} from './logic';

type Mode = 'view' | 'edit' | 'confirm';

// The three status tiles: written out in full so the styling tool can see the class names.
const tiles: Record<EditableStatus, { on: string; text: string; icon: IconName; color: ColorToken }> = {
  present: { on: 'border-success bg-success-tint', text: 'text-success-strong', icon: 'checkCircle', color: 'successStrong' },
  late: { on: 'border-warning bg-warning-tint', text: 'text-warning-content', icon: 'clock', color: 'warningContent' },
  absent: { on: 'border-danger bg-danger-tint', text: 'text-danger-strong', icon: 'close', color: 'dangerStrong' },
};

function StatusTiles({ value, onChange }: { value: EditableStatus; onChange: (value: EditableStatus) => void }) {
  return (
    <View className="gap-1" accessibilityRole="radiogroup" accessibilityLabel="Status">
      <Text variant="meta" className="font-inter-medium">
        Status
      </Text>
      <View className="flex-row gap-2">
        {statusChoices.map((choice) => {
          const selected = choice.value === value;
          const tile = tiles[choice.value];
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(choice.value)}
              className={`min-h-20 flex-1 items-center justify-center gap-1 rounded-block border-2 active:opacity-80 ${selected ? tile.on : 'border-border bg-surface'}`}>
              <Icon name={tile.icon} size={24} color={selected ? tile.color : 'contentMuted'} />
              <Text className={`font-inter-semibold ${selected ? tile.text : ''}`}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text variant="meta">{label}</Text>
      <Text className="flex-1 text-right">{value}</Text>
    </View>
  );
}

// One student's attendance in one session, and the Change attendance flow (also how a lecturer checks a student in by
// hand): edit status, time and a required reason, then confirm. The database enforces who may change what.
// Lecturer UI pages 16 to 21.
export function AttendanceRecord({ sessionId, studentId, startEditing = false }: { sessionId: number; studentId: string; startEditing?: boolean }) {
  const router = useRouter();
  const session = useSession(sessionId);
  const record = useAttendanceRecord(sessionId, studentId);
  const student = useStudentInfo(studentId);
  const history = useAttendanceHistory(studentId, sessionId);

  const header = <ScreenHeader title="Attendance record" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
  if (session.isPending || record.isPending || student.isPending) return <Screen standalone title="Attendance record" header={header}><Loading /></Screen>;
  if (!session.data || !student.data) return <Screen standalone title="Attendance record" header={header}><Text variant="error">This record was not found.</Text></Screen>;

  return <RecordBody session={session.data} person={student.data} current={record.data ?? null} history={history} startEditing={startEditing} />;
}

function RecordBody({
  session: data,
  person,
  current,
  history,
  startEditing,
}: {
  session: Session;
  person: StudentInfo;
  current: RecordRow | null;
  history: { isPending: boolean; data?: AttendanceHistoryRow[] };
  startEditing: boolean;
}) {
  const router = useRouter();
  const wide = useIsWide();
  const { can, claims } = useAuth();
  const queryClient = useQueryClient();
  const sessionId = data.session_id;
  const studentId = person.id;
  const numbers = useStudentClassNumbers(studentId, data.schedule_id);
  const editable = canChangeAttendance(data, can, claims?.appUserId);

  const [mode, setMode] = useState<Mode>(startEditing && editable ? 'edit' : 'view');
  const [status, setStatus] = useState<EditableStatus>(current && current.status !== 'absent' ? current.status : 'present');
  // The time offered first is the one already recorded, else the session start.
  const [time, setTime] = useState(() => defaultTime(data, current?.checked_in_at));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<ChangeErrors>({});
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useScrollUpOn(failure);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const shownStatus = current?.status ?? (data.status === 'finished' ? 'absent' : null);
  const last = history.data?.[0];
  const lastChanged = last ? `Last changed by ${last.changed_by_name ?? 'System'}, ${melbourneDateTime(last.changed_at)}` : '';
  const attended = current !== null && current.status !== 'absent';
  const fullName = `${person.first_name} ${person.last_name}`;

  const startChange = () => {
    setStatus(attended ? (current as RecordRow).status : 'present');
    setTime(defaultTime(data, current?.checked_in_at));
    setReason('');
    setErrors({});
    setFailure('');
    setSaved(false);
    setMode('edit');
  };

  const review = () => {
    const found = validateChange(data, { status, time, reason });
    setErrors(found);
    if (Object.keys(found).length === 0) setMode('confirm');
  };

  const save = async () => {
    setSaving(true);
    setFailure('');
    const result = await changeAttendance({ sessionId, studentId, status, time, reason: reason.trim() });
    setSaving(false);
    if (!result.ok) {
      setFailure(result.message);
      setMode('edit');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    setSaved(true);
    setMode('view');
  };

  const sessionLine = `${formatDayLong(data.session_date)} · ${timeRange(data)}${data.location_name ? ` · ${data.location_name}` : ''}`;
  const shortSession = `${formatDayShort(data.session_date)} ${hhmm(data.start_time)}`;

  if (mode === 'edit') {
    return (
      <Screen standalone title="Change attendance" header={<ScreenHeader title="Change attendance" subtitle={`${fullName} · ${shortSession}`} onBack={() => setMode('view')} />}>
        {failure ? <Banner tone="error" message={failure} /> : null}
        <Card>
          <View className="flex-row items-center gap-3">
            <Avatar name={fullName} id={person.id} size={44} />
            <View className="flex-1">
              <Text variant="card">{fullName}</Text>
              <Text variant="meta">
                {data.class_name} · {sessionLine}
              </Text>
            </View>
          </View>
        </Card>
        <Card>
          <StatusTiles value={status} onChange={setStatus} />
          <View className="gap-3 md:flex-row">
            {status !== 'absent' ? (
              <View className="md:flex-1">
                <TimeField label="Checked in at" value={time} onChange={setTime} error={errors.time} />
              </View>
            ) : null}
            <View className="gap-1 md:flex-1">
              <Text variant="meta" className="font-inter-medium">
                Method
              </Text>
              <View className="min-h-11 justify-center rounded-button border border-border bg-surface-muted px-3">
                <Text variant="meta">{status === 'absent' ? '-' : 'Manual (automatic)'}</Text>
              </View>
            </View>
          </View>
          <TextField
            label="Reason (required)"
            value={reason}
            onChangeText={setReason}
            maxLength={REASON_MAX}
            multiline
            error={errors.reason}
            placeholder="e.g. Phone battery died, confirmed present in class"
          />
          <Text variant="meta">{changeSentence(current?.status, status, !(current && current.status === status && (status === 'absent' || time === defaultTime(data, current.checked_in_at))))}</Text>
        </Card>
        <View className="gap-2 md:flex-row-reverse">
          <View className="md:w-48">
            <Button label="Save change" onPress={review} />
          </View>
          <View className="md:w-48">
            <Button variant="secondary" label="Cancel" onPress={() => setMode('view')} />
          </View>
        </View>
      </Screen>
    );
  }

  if (mode === 'confirm') {
    return (
      <Screen standalone title="Save this change?" header={<ScreenHeader title="Save this change?" subtitle={`${data.class_name}, ${shortSession}`} onBack={() => setMode('edit')} />}>
        <Card>
          <Row label="Student" value={`${fullName} · ${person.id}`} />
          <Row label="Status" value={`${statusWord(current?.status)} → ${statusWord(status)}`} />
          <Row label="Checked in" value={checkedInSummary(status, time)} />
          <Row label="Reason" value={reason.trim()} />
        </Card>
        <Text variant="meta">Saved with your name. Session and class percentages update.</Text>
        <View className="gap-2 md:flex-row-reverse">
          <View className="md:w-48">
            <Button label={saving ? 'Saving...' : 'Save change'} disabled={saving} onPress={save} />
          </View>
          <View className="md:w-48">
            <Button variant="secondary" label="Back to edit" disabled={saving} onPress={() => setMode('edit')} />
          </View>
        </View>
      </Screen>
    );
  }

  const savedBanner = saved ? <Banner tone="success" message="The change was saved with your name." /> : null;
  const sessionRows = (
    <>
      <Row label="Session" value={sessionLine} />
      <Row label="Checked in at" value={melbourneTime(current?.checked_in_at) || '-'} />
      <Row label="Method" value={methodLabel(current?.check_in_method ?? null)} />
      <Row label="Comments" value={current?.comments || '-'} />
      {lastChanged ? <Text variant="meta">{lastChanged}</Text> : null}
    </>
  );

  const correctCard = (
    <Card title="Need to correct this?">
      {editable ? (
        <>
          <Text variant="meta">You can change records for sessions that have started or finished. Every change needs a reason and is saved with your name.</Text>
          <Button label={!attended && data.status === 'started' ? 'Check in manually' : 'Change attendance'} onPress={startChange} />
        </>
      ) : (
        <Text variant="meta">
          {data.status === 'cancelled'
            ? 'This session is cancelled, so its attendance cannot be changed.'
            : data.status === 'started' || data.status === 'finished'
              ? 'Only the lecturer of this session or an admin can change this record.'
              : 'Attendance can be changed once the session has started.'}
        </Text>
      )}
    </Card>
  );

  const viewStudent = <Button variant="secondary" label="View student's attendance" onPress={() => router.push(`/student/${person.id}?schedule=${data.schedule_id}`)} />;

  const historyCard = (
    <Card title="History">
      {history.isPending ? <Loading /> : null}
      {history.data && history.data.length === 0 ? <Text variant="meta">No changes recorded.</Text> : null}
      {history.data?.map((row, index) => (
        <View key={`${row.changed_at}-${index}`} className="gap-1 border-t border-border pt-2">
          <Text>
            {row.old_status ? `${statusWord(row.old_status)} → ${statusWord(row.new_status)}` : `Recorded as ${statusWord(row.new_status)}`}
            {row.new_checked_in_at ? ` · ${melbourneTime(row.new_checked_in_at)}` : ''}
            {row.new_check_in_method ? ` · ${methodLabel(row.new_check_in_method as RecordRow['check_in_method'])}` : ''}
          </Text>
          <Text variant="meta">
            {row.changed_by_name ?? 'System'}, {melbourneDateTime(row.changed_at)}
          </Text>
          {row.reason ? <Text variant="meta">Reason: {row.reason}</Text> : null}
        </View>
      ))}
    </Card>
  );

  // From 1024 px three columns: the student and this record take two, the right one has the change and the student's
  // numbers in this class.
  if (wide) {
    const pct = numbers.data?.attendance_pct == null ? null : Math.round(Number(numbers.data.attendance_pct));
    const done = numbers.data ? Number(numbers.data.present) + Number(numbers.data.late) : 0;
    return (
      <Screen standalone title="Attendance record" header={<ScreenHeader title="Attendance record" subtitle={data.class_name} onBack={goBack} />}>
        {savedBanner}
        <View className="flex-row items-start gap-4">
          <View className="flex-[2] gap-4">
            <Card>
              <View className="flex-row items-center gap-4">
                <Avatar name={fullName} id={person.id} size={64} />
                <View className="flex-1 gap-0.5">
                  <Text variant="title">{fullName}</Text>
                  <Text variant="meta">
                    {person.id}
                    {person.email ? ` · ${person.email}` : ''}
                  </Text>
                </View>
                <Badge label={statusWord(shownStatus)} {...attendancePill(statusWord(shownStatus))} />
              </View>
              {sessionRows}
            </Card>
            {historyCard}
          </View>
          <View className="flex-1 gap-4">
            {correctCard}
            <Card title="Student in this class">
              {numbers.isPending ? <Loading /> : null}
              {numbers.data && pct === null ? <Text variant="meta">No finished sessions yet.</Text> : null}
              {numbers.data && pct !== null ? (
                <View className="flex-row items-center gap-4">
                  <ProgressRing value={pct} size={76} strokeWidth={8} label="Class attendance" />
                  <View className="flex-1 gap-0.5">
                    <Text variant="card">{`${done} of ${numbers.data.finished_sessions} attended`}</Text>
                    <Text variant="meta">{pct < RING_THRESHOLD ? 'Below 75%' : 'On track'}</Text>
                  </View>
                </View>
              ) : null}
              {viewStudent}
            </Card>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen standalone title="Attendance record" header={<ScreenHeader title="Attendance record" subtitle={data.class_name} onBack={goBack} />}>
      {savedBanner}
      <Card>
        <View className="items-center gap-1">
          <Avatar name={fullName} id={person.id} size={72} />
          <Text variant="title" className="mt-2">
            {fullName}
          </Text>
          <Text variant="meta">
            {person.id}
            {person.email ? ` · ${person.email}` : ''}
          </Text>
          <View className="mt-1">
            <Badge label={statusWord(shownStatus)} {...attendancePill(statusWord(shownStatus))} />
          </View>
        </View>
      </Card>

      <Card>{sessionRows}</Card>

      {correctCard}
      {viewStudent}
      {historyCard}
    </Screen>
  );
}
