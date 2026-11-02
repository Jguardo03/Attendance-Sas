# Check-in protocol (QR, version 1)

How a student proves they are in the room, and how the server decides. The rules live in the database and in two
Edge Functions. The app only collects evidence and shows the result: it never decides, and it never sees a secret.

## The rotating QR code

Each location with QR switched on has a secret (`location.qr_secret_seed`, 16 to 64 random bytes). Nothing outside the
server can read it. The code shown in the room is

```
v1.<locationId>.<step>.<mac>
```

- `step` = `floor(unixSeconds / 30)`: it changes every 30 seconds.
- `mac` = the first 16 hex characters of `HMAC-SHA256(seed, "<locationId>.<step>")`.
- Test vector: the seed `000102...1f` (bytes 0 to 31), location 1, step 59319220 gives `v1.1.59319220.0638ac03850215cc`
  (checked against an independent HMAC in `src/__tests__/qr-protocol.test.ts`).

The server accepts the current step and one step either side. The room screen moves to a new code every 30 seconds, so
a photo of a code stops working within 60 seconds of the code first appearing. A forged code needs the seed: 64 bits of
MAC checked against a window of three steps cannot be guessed in practice.

### Who can show it

`room-qr` returns the current code for one location:

| Caller | Allowed when |
| --- | --- |
| Admin (`locations.manage`) | any location that has QR on |
| Lecturer (`sessions.manage_own`) | for a session they teach, from 10 minutes before it starts until it ends; the location is the session's effective one |

The display page asks again every 25 seconds, so a fresh code is always on screen.

## Checking in

`check-in` receives `{ sessionId, method: "qr", evidence: { payload } }` from a signed-in student and answers in this
order. The first failure stops it.

1. **Signed in with `attendance.check_in`** (the verified token, not a value the app sends). No: 401 or 403.
2. **The code is valid for the session's location.** The location is the session's effective one (a moved session uses
   its new room). The location in the code must match it, the step must be the current one or the one either side, and
   the MAC must match. No: 422 `invalid_code`.
3. **`record_check_in` (database), all in one statement:**
   1. the session exists (404 `session_not_found`)
   2. the student is enrolled in the class (403 `not_enrolled`)
   3. the session is not cancelled (409 `cancelled`)
   4. the student has no present or late record yet (409 `already_checked_in`, with the record)
   5. check in is open: from 10 minutes before the start until the end (409 `not_open` with `opens_at`, or 409 `closed`)
   6. **Present** before the start time, **Late** from the start time on
   7. insert the attendance row with the **database clock** (`now()`), method `qr`, `created_by` = the student

Times are the institution's wall clock, **Australia/Melbourne**. The client's clock is never used: the window, the
Present/Late decision and the stored time all come from the server.

Success: 201 `{ status, checked_in_at, method, session_id }`.

## Students who never check in

A job runs every minute (`pg_cron`). For every session that has finished (by the clock, not cancelled) it adds an
`absent` row for each enrolled student who has no row yet, with `created_by` empty (the system). It is safe to run
repeatedly. The `chk_attendance_check_in` rule holds: absent rows have no check-in time or method.

## What this does not stop

- **A relayed code.** A student can photograph the code and send it to someone outside the room within about a
  minute. Bluetooth and NFC checks (later phases) are stronger because they need the phone to be at the room.
- **Mid-term enrolment.** Percentages count every finished session of a class for every enrolled student, so a student
  enrolled part way through is counted absent for the earlier sessions. This was already true before check-in existed.

## Error answers

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `bad_request` / `unsupported_method` | missing fields, or a method that is not built yet |
| 401 | none | not signed in |
| 403 | `not_enrolled` or `not_allowed` | the caller may not do this |
| 404 | `session_not_found` | no such session |
| 409 | `cancelled`, `not_open`, `closed`, `already_checked_in`, `qr_disabled` | the session is not in a state to check in |
| 422 | `invalid_code` | wrong, expired, or for another room |
