import { fireEvent, render, screen } from '@testing-library/react-native';

import { toCsv } from '@/features/reports/csv';
import type { ClassReportRow, StudentReportRow } from '@/features/reports/queries';
import { ReportsScreen } from '@/features/reports/reports-screen';
import { classCsv, filterByStanding, isBelow, pctText, reportFilename, studentCsv } from '@/features/reports/rows';

const mockExport = jest.fn();
const mockPush = jest.fn();
let mockCan: (key: string) => boolean = () => true;
let mockStudents: StudentReportRow[] = [];
let mockClasses: ClassReportRow[] = [];
const mockFilters: unknown[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/providers/auth', () => ({ useAuth: () => ({ can: (key: string) => mockCan(key) }) }));
jest.mock('@/features/reports/export', () => ({ exportCsv: (...args: unknown[]) => mockExport(...args) }));
jest.mock('@/features/sessions/queries', () => ({
  useSchedules: () => ({
    isPending: false,
    isSuccess: true,
    data: [
      { schedule_id: 1, academic_period_id: 4, period_name: '2026 Term 4', period_status: 'active', class_id: 10, class_name: 'Web Development', lecturer_id: 'L1000002', lecturer_first_name: 'Omar', lecturer_last_name: 'Park' },
      { schedule_id: 2, academic_period_id: 3, period_name: '2026 Term 3', period_status: 'finished', class_id: 11, class_name: 'Databases', lecturer_id: 'L1000001', lecturer_first_name: 'Ana', lecturer_last_name: 'Lee' },
    ],
  }),
}));
jest.mock('@/features/reports/queries', () => ({
  useStudentReport: (filters: unknown, enabled: boolean) => {
    if (enabled) mockFilters.push(filters);
    return { isPending: false, isError: false, data: enabled ? mockStudents : undefined };
  },
  useClassReport: (_filters: unknown, enabled: boolean) => ({ isPending: false, isError: false, data: enabled ? mockClasses : undefined }),
  useLecturerReport: () => ({ isPending: false, isError: false, data: undefined }),
}));

const student = (id: string, pct: number | null, extra: Partial<StudentReportRow> = {}): StudentReportRow => ({
  student_id: id,
  first_name: `First${id}`,
  last_name: 'Last',
  schedule_id: 1,
  class_name: 'Web Development',
  period_name: '2026 Term 4',
  lecturer_id: 'L1000002',
  lecturer_name: 'Omar Park',
  finished_sessions: pct === null ? 0 : 4,
  present: pct === null ? 0 : 3,
  late: 0,
  absent: pct === null ? 0 : 1,
  attendance_pct: pct,
  ...extra,
});

beforeEach(() => {
  mockExport.mockReset();
  mockPush.mockReset();
  mockCan = () => true;
  mockFilters.length = 0;
  mockStudents = [student('S1', 75), student('S2', 46), student('S3', null)];
  mockClasses = [{ schedule_id: 1, class_name: 'Web Development', period_name: '2026 Term 4', lecturer_id: 'L1000002', lecturer_name: 'Omar Park', enrolled: 7, finished_sessions: 4, class_average_pct: 82.5, students_below_75: 2 }];
});

describe('csv', () => {
  it('quotes cells with commas, quotes and line breaks, and ends rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', 3]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",3\r\n');
  });

  it('leaves empty cells empty and numbers as they are', () => {
    expect(toCsv(['a', 'b', 'c'], [[null, undefined, 0]])).toBe('a,b,c\r\n,,0\r\n');
  });

  it('stops text that a spreadsheet would run as a formula', () => {
    expect(toCsv(['n'], [['=SUM(A1)'], ['+1'], ['-1'], ['@x'], [-5]])).toBe("n\r\n'=SUM(A1)\r\n'+1\r\n'-1\r\n'@x\r\n-5\r\n");
  });
});

describe('report rows', () => {
  it('shows percentages whole, and a dash when there is nothing yet', () => {
    expect(pctText(46.4)).toBe('46%');
    expect(pctText('82.5')).toBe('83%');
    expect(pctText(null)).toBe('-');
  });

  it('treats under 75 as below, and no number as neither', () => {
    expect(isBelow(74.9)).toBe(true);
    expect(isBelow(75)).toBe(false);
    expect(isBelow(null)).toBe(false);
  });

  it('filters students by standing', () => {
    const rows = [student('S1', 75), student('S2', 46), student('S3', null)];
    expect(filterByStanding(rows, '').map((row) => row.student_id)).toEqual(['S1', 'S2', 'S3']);
    expect(filterByStanding(rows, 'below').map((row) => row.student_id)).toEqual(['S2']);
    expect(filterByStanding(rows, 'meets').map((row) => row.student_id)).toEqual(['S1']);
    expect(filterByStanding(rows, 'none').map((row) => row.student_id)).toEqual(['S3']);
  });

  it('writes a header and one line per row', () => {
    const lines = studentCsv([student('S2', 46)]).trim().split('\r\n');
    expect(lines[0]).toBe('Student ID,First name,Last name,Class,Period,Lecturer,Sessions held,Present,Late,Absent,Attendance %');
    expect(lines[1]).toBe('S2,FirstS2,Last,Web Development,2026 Term 4,Omar Park,4,3,0,1,46');
    expect(classCsv(mockClasses).trim().split('\r\n')[1]).toBe('Web Development,2026 Term 4,Omar Park,7,4,82.5,2');
    expect(reportFilename('students', '2026-11-03')).toBe('attendance-by-student-2026-11-03.csv');
  });
});

describe('reports screen', () => {
  it('is for administrators only', async () => {
    mockCan = () => false;
    await render(<ReportsScreen />);
    expect(screen.getByText('Reports are for administrators.')).toBeTruthy();
    expect(screen.queryByText('Export CSV')).toBeNull();
  });

  it('opens on the active period and lists a row per student per class', async () => {
    await render(<ReportsScreen />);
    expect(mockFilters.at(-1)).toEqual({ periodId: 4, classId: null, lecturerId: null });
    expect(screen.getByText('3 student rows')).toBeTruthy();
    expect(screen.getByText('FirstS2 Last')).toBeTruthy();
    expect(screen.getByText('46%')).toBeTruthy();
    expect(screen.getByText('No finished sessions yet')).toBeTruthy();
  });

  it('opens the student history from a row', async () => {
    await render(<ReportsScreen />);
    await fireEvent.press(screen.getByLabelText('FirstS2 Last Web Development'));
    expect(mockPush).toHaveBeenCalledWith('/student/S2?schedule=1');
  });

  it('switches to the class report', async () => {
    await render(<ReportsScreen />);
    await fireEvent.press(screen.getByText('By class'));
    expect(screen.getByText('1 classes')).toBeTruthy();
    expect(screen.getByText('7 enrolled · 4 sessions held · 2 below 75%')).toBeTruthy();
    expect(screen.getByText('83%')).toBeTruthy();
  });

  it('exports the rows on screen as a CSV file', async () => {
    await render(<ReportsScreen />);
    await fireEvent.press(screen.getByText('Export CSV'));
    expect(mockExport).toHaveBeenCalledTimes(1);
    const [name, csv] = mockExport.mock.calls[0] as [string, string];
    expect(name).toMatch(/^attendance-by-student-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv.trim().split('\r\n')).toHaveLength(4);
  });

  it('shows 50 rows at a time and exports all of them', async () => {
    mockStudents = Array.from({ length: 120 }, (_, index) => student(`S${index}`, 80));
    await render(<ReportsScreen />);
    expect(screen.getByText('120 student rows')).toBeTruthy();
    expect(screen.getAllByText('80%')).toHaveLength(50);
    await fireEvent.press(screen.getByText('Show 50 more'));
    expect(screen.getAllByText('80%')).toHaveLength(100);
    await fireEvent.press(screen.getByText('Export CSV'));
    expect((mockExport.mock.calls[0] as [string, string])[1].trim().split('\r\n')).toHaveLength(121);
  });

  it('says so when nothing matches, and offers no export', async () => {
    mockStudents = [];
    await render(<ReportsScreen />);
    expect(screen.getByText('Nothing matches these filters.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Export CSV'));
    expect(mockExport).not.toHaveBeenCalled();
  });
});
