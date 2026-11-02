import { FunctionCallError, invokeFunction } from '@/lib/functions';

import { describeCheckInError, type CheckInProblem } from './messages';

export type CheckInSuccess = { status: 'present' | 'late'; checked_in_at: string; method: 'qr'; session_id: number };

export type CheckInResult = { ok: true; value: CheckInSuccess } | { ok: false; code: string; problem: CheckInProblem };

/** Sends the scanned code to the server, which decides everything. Never throws: a refusal comes back as `ok: false`. */
export async function submitCheckIn(sessionId: number, payload: string): Promise<CheckInResult> {
  try {
    const value = await invokeFunction<CheckInSuccess>('check-in', { sessionId, method: 'qr', evidence: { payload } });
    return { ok: true, value };
  } catch (error) {
    if (error instanceof FunctionCallError) {
      return { ok: false, code: error.code, problem: describeCheckInError(error.code, { opens_at: error.body.opens_at as string | undefined }) };
    }
    return { ok: false, code: 'network', problem: describeCheckInError('network') };
  }
}

export type RoomQr = { location_id: number; location_name: string; payload: string; step: number; expires_in: number };

/** The code to show in a room right now. Asks by session (lecturers, admins) or by room (admins). */
export function fetchRoomQr(target: { sessionId?: number; locationId?: number }): Promise<RoomQr> {
  return invokeFunction<RoomQr>('room-qr', target.sessionId ? { session_id: target.sessionId } : { location_id: target.locationId });
}
