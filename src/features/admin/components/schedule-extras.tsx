import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Select, Text, TextField } from '@/components/ui';
import { mapDbError, type FriendlyError } from '@/lib/db-errors';

import { db, listOptions } from '../api';
import { hhmm, type Row } from '../entities';
import { CrudError } from './crud-error';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// Status words and tones from the session state diagram.
const statusBadge: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  scheduled: { label: 'Upcoming', tone: 'neutral' },
  started: { label: 'Live', tone: 'success' },
  finished: { label: 'Finished', tone: 'neutral' },
  rescheduled: { label: 'Rescheduled', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

function useFailure() {
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  const report = (error: unknown, item: string) =>
    setFailure(mapDbError(error as { code?: string; message?: string }, { item }));
  return { failure, report, clear: () => setFailure(null) };
}

function SessionRow({ session, schedule, onChanged }: { session: Row; schedule: Row; onChanged: () => void }) {
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view');
  const [start, setStart] = useState(hhmm(session.override_start_time ?? schedule.start_time));
  const [end, setEnd] = useState(hhmm(session.override_end_time ?? schedule.end_time));
  const [locationId, setLocationId] = useState(String(session.override_location_id ?? ''));
  const [error, setError] = useState<string | undefined>();
  const { failure, report, clear } = useFailure();

  const locations = useQuery({
    queryKey: ['admin', 'options', 'location', ''],
    queryFn: () => listOptions({ table: 'location', value: 'id', label: 'name', order: 'name' }),
  });

  const update = useMutation({
    mutationFn: async (changes: Row) => {
      const { error: updateError } = await db().from('class_session').update(changes).eq('id', session.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setMode('view');
      onChanged();
    },
    onError: (err) => report(err, 'session'),
  });

  function saveReschedule() {
    if (!timeRegex.test(start) || !timeRegex.test(end)) return setError('Use the 24 hour format HH:MM');
    if (end <= start) return setError('The end time must be after the start time');
    setError(undefined);
    update.mutate({
      status: 'rescheduled',
      override_start_time: start,
      override_end_time: end,
      override_location_id: locationId ? Number(locationId) : null,
    });
  }

  const badge = statusBadge[session.status] ?? statusBadge.scheduled;
  const start_ = hhmm(session.override_start_time ?? schedule.start_time);
  const end_ = hhmm(session.override_end_time ?? schedule.end_time);
  const room = session.override_location?.name ?? schedule.location?.name;

  return (
    <View className="gap-2 border-t border-border pt-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text>{session.session_date}</Text>
        <Badge label={badge.label} tone={badge.tone} />
      </View>
      <Text variant="muted">
        {start_} to {end_}, {room}
      </Text>
      {failure ? <CrudError error={failure} onAction={clear} onDismiss={clear} /> : null}

      {mode === 'view' ? (
        <View className="gap-2">
          <Button variant="secondary" label="Reschedule" onPress={() => setMode('reschedule')} />
          {session.status !== 'cancelled' ? <Button variant="secondary" label="Cancel session" onPress={() => setMode('cancel')} /> : null}
          {session.status === 'rescheduled' || session.status === 'cancelled' ? (
            <Button
              variant="secondary"
              label="Reset to schedule"
              onPress={() => update.mutate({ status: 'scheduled', override_start_time: null, override_end_time: null, override_location_id: null })}
            />
          ) : null}
        </View>
      ) : null}

      {mode === 'reschedule' ? (
        <View className="gap-3">
          <TextField label="New start time" value={start} onChangeText={setStart} placeholder="09:00" autoCapitalize="none" />
          <TextField label="New end time" value={end} onChangeText={setEnd} placeholder="11:00" autoCapitalize="none" error={error} />
          <Select
            label="Location"
            value={locationId}
            options={[{ value: '', label: 'Same location' }, ...(locations.data ?? [])]}
            onChange={setLocationId}
          />
          <Button label={update.isPending ? 'Saving...' : 'Save'} disabled={update.isPending} onPress={saveReschedule} />
          <Button variant="secondary" label="Cancel" onPress={() => setMode('view')} />
        </View>
      ) : null}

      {mode === 'cancel' ? (
        <View className="gap-2">
          <Text variant="muted">Students will see this session as cancelled.</Text>
          <Button variant="danger" label={update.isPending ? 'Working...' : 'Cancel this session'} disabled={update.isPending} onPress={() => update.mutate({ status: 'cancelled' })} />
          <Button variant="secondary" label="Keep session" onPress={() => setMode('view')} />
        </View>
      ) : null}
    </View>
  );
}

function Sessions({ id, schedule }: { id: string; schedule: Row }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const { failure, report, clear } = useFailure();

  const sessions = useQuery({
    queryKey: ['admin', 'schedules', id, 'sessions'],
    queryFn: async () => {
      const { data, error } = await db()
        .from('class_session')
        .select('id, session_date, status, override_start_time, override_end_time, override_location_id, override_location:location!fk_class_session_override_location_id(name)')
        .eq('class_schedule_id', id)
        .order('session_date');
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'schedules', id, 'sessions'] });

  // Dates are worked out in the database (one definition), from the period dates and the frequency.
  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await db().rpc('generate_sessions', { p_schedule_id: Number(id) });
      if (error) throw error;
      return data as number;
    },
    onSuccess: async (added) => {
      setMessage(added === 0 ? 'Nothing to add: every date already has a session.' : `${added} sessions added.`);
      await refresh();
    },
    onError: (err) => report(err, 'session'),
  });

  return (
    <Card title={`Sessions (${sessions.data?.length ?? 0})`}>
      {failure ? <CrudError error={failure} onAction={clear} onDismiss={clear} /> : null}
      <Button label={generate.isPending ? 'Generating...' : 'Generate sessions'} disabled={generate.isPending} onPress={() => { setMessage(null); generate.mutate(); }} />
      {message ? <Text variant="muted">{message}</Text> : null}
      {sessions.isPending ? <Text variant="muted">Loading...</Text> : null}
      {sessions.data?.length === 0 ? <Text variant="muted">No sessions yet. Generate them from the period dates and frequency.</Text> : null}
      {sessions.data?.map((session) => (
        <SessionRow key={`${session.id}-${session.status}-${session.override_start_time}`} session={session} schedule={schedule} onChanged={refresh} />
      ))}
    </Card>
  );
}

function Enrolments({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { failure, report, clear } = useFailure();

  const enrolled = useQuery({
    queryKey: ['admin', 'schedules', id, 'enrolments'],
    queryFn: async () => {
      const { data, error } = await db()
        .from('enrollment')
        .select('id, user:users!fk_enrollment_user_id(id, first_name, last_name)')
        .eq('class_schedule_id', id)
        .order('user_id');
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const students = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: async () => {
      const { data, error } = await db().from('users').select('id, first_name, last_name').like('id', 'S%').order('id');
      if (error) throw error;
      return data as Row[];
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'schedules', id, 'enrolments'] });

  const add = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db().from('enrollment').insert({ user_id: userId, class_schedule_id: Number(id) });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (err) => report(err, 'enrolment'),
  });
  const remove = useMutation({
    mutationFn: async (enrollmentId: number) => {
      const { error } = await db().from('enrollment').delete().eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (err) => report(err, 'enrolment'),
  });

  const enrolledIds = new Set((enrolled.data ?? []).map((row) => row.user?.id));
  const needle = search.trim().toLowerCase();
  const candidates = (students.data ?? [])
    .filter((student) => !enrolledIds.has(student.id))
    .filter((student) => !needle || `${student.id} ${student.first_name} ${student.last_name}`.toLowerCase().includes(needle))
    .slice(0, 8);

  return (
    <Card title={`Enrolled students (${enrolled.data?.length ?? 0})`}>
      {failure ? <CrudError error={failure} onAction={clear} onDismiss={clear} /> : null}
      {enrolled.data?.length === 0 ? <Text variant="muted">No students enrolled yet.</Text> : null}
      {enrolled.data?.map((row) => (
        <View key={row.id} className="flex-row items-center justify-between gap-2">
          <Text className="flex-1">
            {row.user?.id} {row.user?.first_name} {row.user?.last_name}
          </Text>
          <Button variant="secondary" label="Remove" disabled={remove.isPending} onPress={() => remove.mutate(row.id)} />
        </View>
      ))}

      <TextField label="Add a student" value={search} onChangeText={setSearch} placeholder="Search by ID or name" autoCapitalize="none" />
      {candidates.map((student) => (
        <View key={student.id} className="flex-row items-center justify-between gap-2">
          <Text className="flex-1">
            {student.id} {student.first_name} {student.last_name}
          </Text>
          <Button label="Enrol" disabled={add.isPending} onPress={() => add.mutate(student.id)} />
        </View>
      ))}
      {students.data && candidates.length === 0 ? <Text variant="muted">No matching students left to enrol.</Text> : null}
    </Card>
  );
}

// Schedule details: its sessions (generate, reschedule, cancel) and who is enrolled.
export function ScheduleExtras({ id, schedule }: { id: string; schedule: Row }) {
  return (
    <View className="gap-4">
      <Sessions id={id} schedule={schedule} />
      <Enrolments id={id} />
    </View>
  );
}
