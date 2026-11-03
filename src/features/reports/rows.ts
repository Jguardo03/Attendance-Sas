// What the report screen shows and exports, worked out from the rows the database returned. Pure, so it is testable.
import { toCsv } from './csv';
import type { ClassReportRow, LecturerReportRow, StudentReportRow } from './queries';

export type ReportView = 'students' | 'lecturers' | 'classes';
export type Standing = '' | 'below' | 'meets' | 'none';

export const standingChoices: { value: Standing; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'below', label: 'Below 75%' },
  { value: 'meets', label: '75% or above' },
  { value: 'none', label: 'No finished sessions yet' },
];

/** "46%" or "-" when there is nothing to average yet. */
export const pctText = (value: number | string | null | undefined) => (value === null || value === undefined ? '-' : `${Math.round(Number(value))}%`);

/** The numbers come from the database as text or number; below 75 is the attendance rule. */
export const isBelow = (value: number | string | null | undefined) => value !== null && value !== undefined && Number(value) < 75;

/** Keeps the student rows with the chosen standing. A filter on the rows, not a recalculation. */
export function filterByStanding(rows: StudentReportRow[], standing: Standing): StudentReportRow[] {
  if (!standing) return rows;
  return rows.filter((row) => {
    if (row.attendance_pct === null) return standing === 'none';
    return standing === 'below' ? isBelow(row.attendance_pct) : standing === 'meets' ? !isBelow(row.attendance_pct) : false;
  });
}

export function studentCsv(rows: StudentReportRow[]): string {
  return toCsv(
    ['Student ID', 'First name', 'Last name', 'Class', 'Period', 'Lecturer', 'Sessions held', 'Present', 'Late', 'Absent', 'Attendance %'],
    rows.map((row) => [row.student_id, row.first_name, row.last_name, row.class_name, row.period_name, row.lecturer_name, row.finished_sessions, row.present, row.late, row.absent, row.attendance_pct]),
  );
}

export function classCsv(rows: ClassReportRow[]): string {
  return toCsv(
    ['Class', 'Period', 'Lecturer', 'Enrolled', 'Sessions held', 'Class average %', 'Students below 75%'],
    rows.map((row) => [row.class_name, row.period_name, row.lecturer_name, row.enrolled, row.finished_sessions, row.class_average_pct, row.students_below_75]),
  );
}

export function lecturerCsv(rows: LecturerReportRow[]): string {
  return toCsv(
    ['Lecturer ID', 'Lecturer', 'Classes', 'Sessions held', 'Average attendance %'],
    rows.map((row) => [row.lecturer_id, row.lecturer_name, row.classes, row.sessions_held, row.average_attendance_pct]),
  );
}

export const reportFilename = (view: ReportView, date: string) => `attendance-by-${view === 'students' ? 'student' : view === 'lecturers' ? 'lecturer' : 'class'}-${date}.csv`;
