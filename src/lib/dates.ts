// Calendar maths on plain year / month / day numbers, so no time zone can shift a date.
// Dates are stored and exchanged as ISO text (YYYY-MM-DD).

export type Ymd = { y: number; m: number; d: number }; // m is 1 to 12

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const weekdayInitials = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** A real calendar date in ISO form, or null (so 2027-02-30 is rejected). */
export function parseIso(value: string | null | undefined): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function toIso({ y, m, d }: Ymd): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatLong({ y, m, d }: Ymd): string {
  return `${d} ${monthNames[m - 1].slice(0, 3)} ${y}`;
}

/** 0 = Monday ... 6 = Sunday, to match the ISO weekdays used for schedules. */
export function weekdayIndex(y: number, m: number, d: number): number {
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const index = y * 12 + (m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

/** Weeks of the month starting on Monday; days outside the month are null. */
export function monthGrid(y: number, m: number): (number | null)[][] {
  const cells: (number | null)[] = Array(weekdayIndex(y, m, 1)).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function todayIso(now = new Date()): string {
  return toIso({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

/** Hours 00 to 23 and minutes in steps, for the 24 hour time picker. */
export const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

export function minuteOptions(step = 5, include?: string): string[] {
  const minutes = Array.from({ length: Math.floor(60 / step) }, (_, i) => String(i * step).padStart(2, '0'));
  // Keep a stored minute that is not on the step (for example 09:07) so it can still be shown and kept.
  if (include && /^\d{2}$/.test(include) && !minutes.includes(include)) return [...minutes, include].sort();
  return minutes;
}

export function splitTime(value: string): { hour: string; minute: string } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? { hour: match[1], minute: match[2] } : { hour: '', minute: '' };
}

const dayMs = 86_400_000;

export function addDays(iso: string, days: number): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  const next = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d) + days * dayMs);
  return toIso({ y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() });
}

/** The Monday of the week that holds `iso` (weeks run Monday to Sunday, like the ISO weekdays in schedules). */
export function startOfWeek(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return addDays(iso, -weekdayIndex(parsed.y, parsed.m, parsed.d));
}

/** "Tue 27 Oct" */
export function formatDayShort(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${weekdayInitials[weekdayIndex(parsed.y, parsed.m, parsed.d)]} ${parsed.d} ${monthNames[parsed.m - 1].slice(0, 3)}`;
}

/** "Fri 23 Oct 2026" */
export function formatDayLong(iso: string): string {
  const parsed = parseIso(iso);
  return parsed ? `${formatDayShort(iso)} ${parsed.y}` : iso;
}
