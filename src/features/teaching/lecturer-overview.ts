import { useClassSummaries, useSchedules } from '@/features/sessions/queries';

// The lecturer's numbers across this period's classes: how many classes and students, who is below 75%, and the
// average of the class averages. Row level security limits the schedules to the lecturer's own. `ready` is false until
// every class summary has loaded, so a screen can wait instead of showing a wrong zero.
export function useLecturerOverview() {
  const schedules = useSchedules();
  const current = (schedules.data ?? []).filter((schedule) => schedule.period_status !== 'finished');
  const summaries = useClassSummaries(current.map((schedule) => schedule.schedule_id));

  const rows = current.map((schedule) => summaries.data?.get(schedule.schedule_id));
  const ready = Boolean(schedules.data) && (current.length === 0 || rows.every(Boolean));
  const averages = rows.flatMap((row) => (row && row.class_average_pct !== null ? [Number(row.class_average_pct)] : []));

  return {
    ready,
    classes: current.length,
    students: rows.reduce((sum, row) => sum + Number(row?.enrolled ?? 0), 0),
    below: rows.reduce((sum, row) => sum + Number(row?.students_below_75 ?? 0), 0),
    average: averages.length > 0 ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length) : null,
  };
}
