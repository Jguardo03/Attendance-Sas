// How long a check in takes from the tap on "Check in" to the "You're checked in" screen. The target is under 5 seconds
// (NFR-05). The number is logged and shown in development builds only.
let startedAt: number | null = null;

export function markCheckInStart(now: number = Date.now()): void {
  startedAt = now;
}

/** Milliseconds since the last tap on Check in, or null if there was none. Clears the mark. */
export function takeElapsed(now: number = Date.now()): number | null {
  if (startedAt === null) return null;
  const elapsed = now - startedAt;
  startedAt = null;
  return elapsed;
}
