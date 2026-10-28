# Applied migrations (project wsxziqkmnxtspydhanbd)

These were applied in order through the Supabase connector (`apply_migration`). The `.sql` files in this folder are the
exact text recorded in the project's migration history (`supabase_migrations.schema_migrations`), exported with their
original version numbers. To rebuild a fresh project, apply them in filename order (Supabase CLI: `npx supabase link
--project-ref <ref>` then `npx supabase db push`), then enable the access-token hook in the dashboard (see below).

| # | Name | What it does |
|---|------|--------------|
| 1 | `init_schema_tables` | Enums, 17 tables, constraints, exclusion constraints, audit table. Same as `docs/schema.sql` without comments and triggers. |
| 2 | `init_schema_triggers` | Table comments, `updated_at` and attendance-audit triggers (functions pin `search_path`), `btree_gist` moved to the `extensions` schema, indexes for foreign keys. |
| 3 | `reference_data_and_authz_helpers` | Roles (student, lecturer, admin), 15 permissions, role grants, frequencies; `private` schema with `app_user_id()`, `has_permission()`, `effective_permissions()`, the access-token hook, ownership helpers and the created_by/updated_by stamping trigger. |
| 4 | `rls_policies_grants_and_rpcs` | RLS on all tables, policies, explicit grants (column-level for `location` and `nfc_tags` so secrets are never readable), `is_allowed_email()`, attendance summary functions. |
| 5 | `revoke_default_table_privileges` | Removes TRUNCATE/REFERENCES/TRIGGER/MAINTAIN that Supabase grants to `anon` and `authenticated` by default. |
| 6 | `advisor_fixes_policies_and_execute_grants` | Splits "manage" policies so each table has one SELECT policy; revokes `EXECUTE` on `rls_auto_enable()` and, after sign-in, on `is_allowed_email()`. |
| 7 | `phase6_qr_flag_availability_and_session_generation` | Generated `location.qr_enabled` flag (readable, shows QR on/off without exposing the seed); `locations_availability()` (free/booked rooms for a slot, mirrors the overlap constraint); `generate_sessions()` (creates a schedule's sessions from the period dates and frequency). Checked by `supabase/tests/phase6_sessions_and_availability.sql`. |
| 8 | `location_name_case_insensitive` | Replaces the case-sensitive unique name on `location` with a unique index on `lower(btrim(name))`, so "Room 1" and "room 1 " are the same room. |
| 9 | `names_case_insensitive` | Same case-insensitive, space-trimmed uniqueness for the names of roles, permissions, classes, periods and frequencies (unique indexes on `lower(btrim(name))` replace the old constraints). |

Design notes
- Authorization data is in the JWT: the custom access token hook adds `app_user_id`, `app_role` and `permissions[]`.
  Claims refresh when the access token is refreshed, so role changes apply the next time the app refreshes its session.
- `private` is not an exposed schema, so helper functions there are not reachable as `/rest/v1/rpc/...`.
- Clients cannot write `attendance` or `attendance_audit`; Phase 8 (check-in) and Phase 9 (corrections) add the Edge
  Functions / RPCs that do. Edge Functions use the `service_role` key, which has `ALL` on every table.
- Dashboard step required once: Authentication > Hooks > Custom Access Token > Postgres function `private.custom_access_token_hook`.
