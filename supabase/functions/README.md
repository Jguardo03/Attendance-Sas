# Edge Functions

## admin-create-user

Creates a Supabase Auth account and the matching `public.users` row. Sign-in uses
`shouldCreateUser: false`, so every person needs an auth account created here first.

- Caller must be signed in with the `users.manage` permission (checked from the verified token claims).
- Runs with the project's secret key, which Supabase injects into Edge Functions. Nothing is stored in
  this repository and nothing goes in an `EXPO_PUBLIC_*` variable.
- `verify_jwt` is off for this function (the new publishable/secret keys are not JWTs, so the gateway
  check cannot be used); authorization happens in the code instead.

Request: `POST /functions/v1/admin-create-user` with `Authorization: Bearer <user access token>` and JSON
`{ id, first_name, last_name, email, role_id, email_parm_id }`. Replies 201 `{ id, auth_user_id }`,
401 not signed in, 403 missing `users.manage`, 400 bad input.

Deployed 2026-10-28 to project `wsxziqkmnxtspydhanbd` (version 2, `verify_jwt` off) through the Supabase MCP
`deploy_edge_function`. Redeploy after any change to `index.ts`, the same way or with
`supabase functions deploy admin-create-user --no-verify-jwt`. Checked: a call with no token or a bad token returns 401.

## location-qr-seed

Turns QR check-in on, off or replaces its secret for one location. The seed is 32 random bytes made in the
function and never returned; the app only sees `location.qr_enabled`.

Request: `POST /functions/v1/location-qr-seed`, `{ location_id, action: 'enable' | 'regenerate' | 'disable' }`.
Needs `locations.manage`. Replies `{ location_id, qr_enabled }`; 401, 403, 404 (unknown location) or 400.

## nfc-tag

Registers an NFC tag or replaces its secret token (`payload_token`, 32 random bytes as hex, never returned or
readable by clients).

Request: `POST /functions/v1/nfc-tag`, `{ action: 'create', nfc_uid, location_id? }` or
`{ action: 'regenerate', nfc_uid }`. The UID is uppercased and must be 8, 14 or 20 hex characters. Needs
`locations.manage`. Replies 201 `{ nfc_uid }` for create, 200 for regenerate; 401, 403, 404 or 400.

Both were deployed 2026-10-28 (version 1, `verify_jwt` off). The sign-in check and CORS block are repeated in each
function because each one deploys on its own. Unauthenticated calls return 401.

## check-in

Records a student's check in. Needs `attendance.check_in`. Request: `POST /functions/v1/check-in`,
`{ sessionId, method: 'qr', evidence: { payload } }`. It checks that the QR code is genuine and for the session's room
(HMAC with the room secret, current step plus or minus one), then calls the database function `record_check_in`, which
decides enrolled, open, late and already checked in with the database clock. Replies 201 `{ status, checked_in_at, method,
session_id }`, or 400, 401, 403, 404, 409, 422 (codes in `docs/check-in-protocol.md`).

## room-qr

Returns the QR code to show in a room now. Admins (`locations.manage`): `{ location_id }` or `{ session_id }`. Lecturers
(`sessions.manage_own`): `{ session_id }` for a session they teach, while check in is open. Replies
`{ location_id, location_name, payload, step, expires_in }`.

Both deployed 2026-11-02 (version 2, `verify_jwt` off) and checked end to end with real sign-ins: present, late, already
checked in, too early, not enrolled, cancelled, unknown session, forged, wrong-room, expired and made-up codes, and the
admin, lecturer and student permissions. The server key reads `session_overview` and runs `app_now()` only because of
migrations 13 and 14.
