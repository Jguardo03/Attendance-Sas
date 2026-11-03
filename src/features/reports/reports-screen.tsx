import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Collapsible, Dropdown, EmptyState, Grid, Screen, ScreenHeader, SegmentedTabs, Text, Loading } from '@/components/ui';
import { useSchedules } from '@/features/sessions/queries';
import { useAuth } from '@/providers/auth';
import { shadows } from '@/theme/tokens';

import { exportCsv } from './export';
import { useClassReport, useLecturerReport, useStudentReport, type ReportFilters } from './queries';
import { classCsv, filterByStanding, isBelow, lecturerCsv, pctText, reportFilename, standingChoices, studentCsv, type ReportView, type Standing } from './rows';

const PAGE = 50;

const views: { value: ReportView; label: string }[] = [
  { value: 'students', label: 'By student' },
  { value: 'lecturers', label: 'By lecturer' },
  { value: 'classes', label: 'By class' },
];

const unique = (pairs: { value: string; label: string }[]) => {
  const seen = new Map(pairs.map((pair) => [pair.value, pair.label]));
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
};

const tone = (value: number | string | null) => (value === null ? 'neutral' : isBelow(value) ? 'danger' : 'success');

// A report row: a tappable white card (rows without a destination are plain).
const rowClass = 'gap-1 rounded-card bg-surface p-4 active:opacity-90';

// Attendance reports for administrators: by student (every class, % per class), by lecturer (classes, sessions held,
// average attendance) and by class. Filters for period, class and lecturer; students can also be filtered by standing.
// Every number is worked out in the database. Export gives the rows on screen as a CSV file.
export function ReportsScreen() {
  const router = useRouter();
  const { can } = useAuth();
  const schedules = useSchedules();
  const all = schedules.data ?? [];

  const [view, setView] = useState<ReportView>('students');
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const [classId, setClassId] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [standing, setStanding] = useState<Standing>('');
  const [limit, setLimit] = useState(PAGE);
  const [failure, setFailure] = useState('');

  // Opens on the active period, like the Classes screen; "All" shows every period.
  const activePeriod = all.find((schedule) => schedule.period_status === 'active')?.academic_period_id;
  const periodValue = period === undefined ? (activePeriod ? String(activePeriod) : '') : period;
  const filters: ReportFilters = {
    periodId: periodValue ? Number(periodValue) : null,
    classId: classId ? Number(classId) : null,
    lecturerId: lecturerId || null,
  };

  const ready = schedules.isSuccess && can('attendance.view_all');
  const students = useStudentReport(filters, ready && view === 'students');
  const classes = useClassReport(filters, ready && view === 'classes');
  const lecturers = useLecturerReport(filters, ready && view === 'lecturers');

  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setLimit(PAGE);
    setFailure('');
  };

  if (!can('attendance.view_all')) {
    return (
      <Screen standalone title="Reports">
        <Text variant="muted">Reports are for administrators.</Text>
      </Screen>
    );
  }

  const studentRows = filterByStanding(students.data ?? [], standing);
  const active = { students, classes, lecturers }[view];
  const count = view === 'students' ? studentRows.length : (active.data?.length ?? 0);
  const activeFilters = [classId, lecturerId, standing].filter(Boolean).length + (period !== undefined ? 1 : 0);

  const download = async () => {
    setFailure('');
    const csv = view === 'students' ? studentCsv(studentRows) : view === 'classes' ? classCsv(classes.data ?? []) : lecturerCsv(lecturers.data ?? []);
    try {
      await exportCsv(reportFilename(view, new Date().toISOString().slice(0, 10)), csv);
    } catch {
      setFailure('The file could not be shared. Try again.');
    }
  };

  return (
    <Screen standalone title="Reports" header={<ScreenHeader title="Reports" subtitle="Attendance by student, lecturer or class" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}>
      <SegmentedTabs label="Report" value={view} options={views} onChange={reset((value: string) => setView(value as ReportView))} />

      <Collapsible title={activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}>
        <Dropdown label="Period" value={periodValue} options={[{ value: '', label: 'All' }, ...unique(all.map((s) => ({ value: String(s.academic_period_id), label: s.period_name })))]} onChange={reset(setPeriod)} />
        <Dropdown label="Class" value={classId} options={[{ value: '', label: 'All' }, ...unique(all.map((s) => ({ value: String(s.class_id), label: s.class_name })))]} onChange={reset(setClassId)} />
        <Dropdown label="Lecturer" value={lecturerId} options={[{ value: '', label: 'All' }, ...unique(all.map((s) => ({ value: s.lecturer_id, label: `${s.lecturer_first_name ?? ''} ${s.lecturer_last_name ?? ''}`.trim() })))]} onChange={reset(setLecturerId)} />
        {view === 'students' ? <Dropdown label="Standing" value={standing} options={standingChoices} onChange={reset((value: string) => setStanding(value as Standing))} /> : null}
      </Collapsible>
      {activeFilters > 0 ? (
        <Button
          variant="secondary"
          label="Reset filters"
          onPress={() => {
            setPeriod(undefined);
            setClassId('');
            setLecturerId('');
            setStanding('');
            setLimit(PAGE);
          }}
        />
      ) : null}

      <Text variant="section">{`${count} ${view === 'students' ? 'student rows' : view === 'lecturers' ? 'lecturers' : 'classes'}`}</Text>
      {view === 'students' ? <Text variant="meta">One row per student per class. Only finished sessions count; no check in means absent.</Text> : null}
      <Button variant="secondary" icon="download" label="Export CSV" disabled={count === 0} onPress={download} />
      {failure ? <Text variant="error">{failure}</Text> : null}

      {schedules.isPending || active.isPending ? <Loading /> : null}
      {active.isError ? <Text variant="error">The report could not be loaded. Try again.</Text> : null}
      {active.data && count === 0 ? (
        <Card>
          <EmptyState image="classes" title="Nothing matches" message="Nothing matches these filters." />
        </Card>
      ) : null}

      <Grid>
        {view === 'students'
          ? studentRows.slice(0, limit).map((row) => (
              <Pressable key={`${row.student_id}-${row.schedule_id}`} accessibilityRole="link" accessibilityLabel={`${row.first_name} ${row.last_name} ${row.class_name}`} onPress={() => router.push(`/student/${row.student_id}?schedule=${row.schedule_id}`)} className={rowClass} style={{ boxShadow: shadows.card }}>
                <>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text variant="card" className="flex-1">
                      {row.first_name} {row.last_name}
                    </Text>
                    <Badge label={pctText(row.attendance_pct)} tone={tone(row.attendance_pct)} dot />
                  </View>
                  <Text variant="meta">
                    {row.student_id} · {row.class_name} · {row.lecturer_name}
                  </Text>
                  <Text variant="meta">
                    {row.finished_sessions === 0 ? 'No finished sessions yet' : `${row.present} present · ${row.late} late · ${row.absent} absent of ${row.finished_sessions}`}
                  </Text>
                </>
              </Pressable>
            ))
          : null}
        {view === 'classes'
          ? (classes.data ?? []).slice(0, limit).map((row) => (
              <Pressable key={row.schedule_id} accessibilityRole="link" accessibilityLabel={row.class_name} onPress={() => router.push(`/class/${row.schedule_id}`)} className={rowClass} style={{ boxShadow: shadows.card }}>
                <>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text variant="card" className="flex-1">
                      {row.class_name}
                    </Text>
                    <Badge label={pctText(row.class_average_pct)} tone={tone(row.class_average_pct)} dot />
                  </View>
                  <Text variant="meta">
                    {row.period_name} · {row.lecturer_name}
                  </Text>
                  <Text variant="meta">
                    {row.enrolled} enrolled · {row.finished_sessions} sessions held · {row.students_below_75} below 75%
                  </Text>
                </>
              </Pressable>
            ))
          : null}
        {view === 'lecturers'
          ? (lecturers.data ?? []).slice(0, limit).map((row) => (
              <View key={row.lecturer_id} className={rowClass} style={{ boxShadow: shadows.card }}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text variant="card" className="flex-1">
                    {row.lecturer_name}
                  </Text>
                  <Badge label={pctText(row.average_attendance_pct)} tone={tone(row.average_attendance_pct)} dot />
                </View>
                <Text variant="meta">
                  {row.lecturer_id} · {row.classes} class{Number(row.classes) === 1 ? '' : 'es'} · {row.sessions_held} sessions held
                </Text>
              </View>
            ))
          : null}
      </Grid>
      {count > limit ? <Button variant="secondary" label={`Show ${Math.min(PAGE, count - limit)} more`} onPress={() => setLimit((current) => current + PAGE)} /> : null}
    </Screen>
  );
}
