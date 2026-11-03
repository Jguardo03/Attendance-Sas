import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Screen, Select, Text, TextField, TimeField, useScrollUpOn } from '@/components/ui';
import {
  formatDayLong,
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
  useStudentInfo,
  type AttendanceHistoryRow,
  type AttendanceRecord as RecordRow,
  type StudentInfo,
} from '@/features/sessions/queries';
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

const tone = (status: string | null | undefined) => (status === 'present' ? 'success' : status === 'late' ? 'warning' : status === 'absent' ? 'danger' : 'neutral');

type Mode = 'view' | 'edit' | 'confirm';

// One student's attendance in one session, and the Change attendance flow (also how a lecturer checks a student in by
// hand): edit status, time and a required reason, then confirm. The database enforces who may change what.
export function AttendanceRecord({ sessionId, studentId, startEditing = false }: { sessionId: number; studentId: string; startEditing?: boolean }) {
  const router = useRouter();
  const session = useSession(sessionId);
  const record = useAttendanceRecord(sessionId, studentId);
  const student = useStudentInfo(studentId);
  const history = useAttendanceHistory(studentId, sessionId);

  const back = <Button variant="secondary" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
  if (session.isPending || record.isPending || student.isPending) return <Screen standalone title="Attendance record">{back}<Text variant="muted">Loading...</Text></Screen>;
  if (!session.data || !student.data) return <Screen standalone title="Attendance record">{back}<Text variant="error">This record was not found.</Text></Screen>;

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
  const { can, claims } = useAuth();
  const queryClient = useQueryClient();
  const sessionId = data.session_id;
  const studentId = person.id;
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

  const back = <Button variant="secondary" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
  const shownStatus = current?.status ?? (data.status === 'finished' ? 'absent' : null);
  const last = history.data?.[0];
  const lastChanged = last ? `${last.changed_by_name ?? 'System'}, ${melbourneDateTime(last.changed_at)}` : '-';
  const attended = current !== null && current.status !== 'absent';

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

  const heading = (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1">
        <Text variant="heading">
          {person.first_name} {person.last_name}
        </Text>
        <Text variant="muted">{person.id}</Text>
      </View>
      <Badge label={statusWord(shownStatus)} tone={tone(shownStatus)} />
    </View>
  );

  const sessionLine = `${formatDayLong(data.session_date)} · ${timeRange(data)}${data.location_name ? ` · ${data.location_name}` : ''}`;

  if (mode === 'edit') {
    return (
      <Screen standalone title="Change attendance">
        {failure ? (
          <Card>
            <Text variant="error">{failure}</Text>
          </Card>
        ) : null}
        <Card>
          <Text variant="heading">
            {person.first_name} {person.last_name}
          </Text>
          <Text variant="muted">
            {data.class_name} · {sessionLine}
          </Text>
        </Card>
        <Select label="Status" value={status} options={statusChoices} onChange={(value) => setStatus(value as EditableStatus)} />
        {status !== 'absent' ? <TimeField label="Checked in at" value={time} onChange={setTime} error={errors.time} /> : null}
        <Text variant="muted">Method: {status === 'absent' ? '-' : 'Manual (set automatically)'}</Text>
        <TextField
          label="Reason (required)"
          value={reason}
          onChangeText={setReason}
          maxLength={REASON_MAX}
          multiline
          error={errors.reason}
          placeholder="Why is this changing?"
        />
        <Text variant="muted">{changeSentence(current?.status, status)}</Text>
        <Button label="Save change" onPress={review} />
        <Button variant="secondary" label="Cancel" onPress={() => setMode('view')} />
      </Screen>
    );
  }

  if (mode === 'confirm') {
    return (
      <Screen standalone title="Save this change?">
        <Card>
          <Text>
            {data.class_name}, {formatDayLong(data.session_date)} {timeRange(data).slice(0, 5)}
          </Text>
          <Text variant="muted">
            Student: {person.first_name} {person.last_name} · {person.id}
          </Text>
          <Text variant="muted">
            Status: {statusWord(current?.status)} → {statusWord(status)}
          </Text>
          <Text variant="muted">Checked in: {checkedInSummary(status, time)}</Text>
          <Text variant="muted">Reason: {reason.trim()}</Text>
        </Card>
        <Text variant="muted">Saved with your name. Session and class percentages update.</Text>
        <Button label={saving ? 'Saving...' : 'Save change'} disabled={saving} onPress={save} />
        <Button variant="secondary" label="Back to edit" disabled={saving} onPress={() => setMode('edit')} />
      </Screen>
    );
  }

  return (
    <Screen standalone title="Attendance record">
      {back}
      {saved ? (
        <Card>
          <Text>The change was saved with your name.</Text>
        </Card>
      ) : null}
      <Card>
        {heading}
        <Text variant="muted">Class: {data.class_name}</Text>
        <Text variant="muted">Session: {sessionLine}</Text>
        <Text variant="muted">Status: {statusWord(shownStatus)}</Text>
        <Text variant="muted">Checked in at: {melbourneTime(current?.checked_in_at) || '-'}</Text>
        <Text variant="muted">Method: {methodLabel(current?.check_in_method ?? null)}</Text>
        <Text variant="muted">Comments: {current?.comments || '-'}</Text>
        <Text variant="muted">Last changed: {lastChanged}</Text>
      </Card>

      {editable ? (
        <Card>
          <Text variant="muted">You can change records for sessions that have started or finished. Every change needs a reason and is saved with your name.</Text>
          <Button label={!attended && data.status === 'started' ? 'Check in manually' : 'Change attendance'} onPress={startChange} />
        </Card>
      ) : (
        <Card>
          <Text variant="muted">
            {data.status === 'cancelled'
              ? 'This session is cancelled, so its attendance cannot be changed.'
              : data.status === 'started' || data.status === 'finished'
                ? 'Only the lecturer of this session or an admin can change this record.'
                : 'Attendance can be changed once the session has started.'}
          </Text>
        </Card>
      )}

      <Button variant="secondary" label="View student's attendance" onPress={() => router.push(`/student/${person.id}?schedule=${data.schedule_id}`)} />

      <Card title="History">
        {history.isPending ? <Text variant="muted">Loading...</Text> : null}
        {history.data && history.data.length === 0 ? <Text variant="muted">No changes recorded.</Text> : null}
        {history.data?.map((row, index) => (
          <View key={`${row.changed_at}-${index}`} className="gap-1 border-t border-border pt-2">
            <Text>
              {row.old_status ? `${statusWord(row.old_status)} → ${statusWord(row.new_status)}` : `Recorded as ${statusWord(row.new_status)}`}
              {row.new_checked_in_at ? ` · ${melbourneTime(row.new_checked_in_at)}` : ''}
              {row.new_check_in_method ? ` · ${methodLabel(row.new_check_in_method as RecordRow['check_in_method'])}` : ''}
            </Text>
            <Text variant="muted">
              {row.changed_by_name ?? 'System'}, {melbourneDateTime(row.changed_at)}
            </Text>
            {row.reason ? <Text variant="muted">Reason: {row.reason}</Text> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
