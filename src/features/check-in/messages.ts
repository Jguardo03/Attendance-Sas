// What a student is told when a check in does not go through. The server's `code` decides the words and whether
// trying again can help; the server's own error text is never shown.
export type CheckInProblem = {
  message: string;
  /** Scanning again can help (a wrong or expired code, a bad connection). */
  retry: boolean;
  /** Show "Ask your lecturer to check you in manually". */
  manual: boolean;
};

export function describeCheckInError(code: string, extra: { opens_at?: string } = {}): CheckInProblem {
  switch (code) {
    case 'invalid_code':
    case 'bad_request':
      return { message: 'That QR code is not valid here. Scan the code shown in the room.', retry: true, manual: false };
    case 'not_open':
      return { message: `Check in opens at ${extra.opens_at ?? 'a later time'}.`, retry: false, manual: false };
    case 'closed':
      return { message: 'Check in has closed for this session.', retry: false, manual: true };
    case 'cancelled':
      return { message: 'This session is cancelled.', retry: false, manual: false };
    case 'not_enrolled':
      return { message: 'You are not enrolled in this class.', retry: false, manual: true };
    case 'already_checked_in':
      return { message: 'You are already checked in to this session.', retry: false, manual: false };
    case 'qr_disabled':
      return { message: 'QR check in is switched off for this room.', retry: false, manual: true };
    case 'session_not_found':
      return { message: 'This session could not be found.', retry: false, manual: false };
    case 'not_allowed':
      return { message: 'Your account cannot check in to sessions.', retry: false, manual: true };
    case 'network':
      return { message: 'Could not reach the server. Check your connection and try again.', retry: true, manual: false };
    default:
      return { message: 'Something went wrong. Try again, or ask your lecturer to check you in.', retry: true, manual: true };
  }
}
