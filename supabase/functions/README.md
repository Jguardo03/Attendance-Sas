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

Deployed 2026-10-28 to project `wsxziqkmnxtspydhanbd` (version 1, `verify_jwt` off) through the Supabase MCP
`deploy_edge_function`. Redeploy after any change to `index.ts`, the same way or with
`supabase functions deploy admin-create-user --no-verify-jwt`. Checked: a call with no token or a bad token returns 401.
