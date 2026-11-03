// Numbers behind the percentage rings and bars. Pure, so they can be tested without drawing anything.
// The percentages themselves always come from the database; this only turns them into arcs and colours.

/** Attendance below this percentage is shown in red (the 75% rule). */
export const RING_THRESHOLD = 75;

export const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export type RingTone = 'success' | 'danger' | 'neutral';

/** Green at 75 and above, red below, neutral when there is nothing to show yet. */
export function ringTone(value: number | null | undefined): RingTone {
  if (value === null || value === undefined || Number.isNaN(value)) return 'neutral';
  return value < RING_THRESHOLD ? 'danger' : 'success';
}

/** The length of the coloured part of a ring and the gap after it, for stroke-dasharray. */
export function ringDash(radius: number, percent: number): { circumference: number; dash: number; gap: number } {
  const circumference = 2 * Math.PI * radius;
  const dash = (circumference * clampPercent(percent)) / 100;
  return { circumference, dash, gap: circumference - dash };
}

export type RingCounts = { present: number; late: number; absent: number };
export type RingSegment = { key: keyof RingCounts; dash: number; gap: number; offset: number };

/**
 * Splits a ring into present, late and absent arcs sized by their counts. `offset` is the stroke-dashoffset that
 * starts each arc where the previous one ended. Empty counts give no arc, and no sessions give no arcs at all.
 */
export function ringSegments(counts: RingCounts, radius: number): { total: number; attendedPercent: number | null; segments: RingSegment[] } {
  const total = counts.present + counts.late + counts.absent;
  if (total <= 0) return { total: 0, attendedPercent: null, segments: [] };

  const circumference = 2 * Math.PI * radius;
  let used = 0;
  const segments: RingSegment[] = [];
  for (const key of ['present', 'late', 'absent'] as const) {
    if (counts[key] <= 0) continue;
    const dash = (circumference * counts[key]) / total;
    segments.push({ key, dash, gap: circumference - dash, offset: -used });
    used += dash;
  }
  return { total, attendedPercent: Math.round((100 * (counts.present + counts.late)) / total), segments };
}

/** The filled share of a progress bar, 0 to 100. A bar with nothing to count is empty. */
export function barPercent(value: number, max: number): number {
  return max > 0 ? clampPercent((100 * value) / max) : 0;
}
