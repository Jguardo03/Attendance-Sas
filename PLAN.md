# Attendance SAS: Implementation Plan

Source docs (all in `docs/`): `Product Requirement Docuement.pdf` (FR-01..09, NFR-01..06), `schema.sql`, `Data_Dictionary.xlsx`, `ERD Attendance SAS.drawio/.jpg`, `attendance-student-ui.drawio` (9 pages: site maps, user flows, state diagrams; `attendance-ui-backup-9-pages.drawio` is a byte-identical copy), wireframe PDFs for Student, Lecturer and Admin.

Execution model: each phase runs in a fresh chat context. Read this file's **Phase 0** and the phase you are executing, nothing more. Every phase ends with something a person can open and test, and is committed before the next starts.

---

## Primary goal

A student walks into a room, taps Check in on their own phone, and is recorded present or late within 5 seconds, using the room's Bluetooth beacon, NFC tag or QR code. Their lecturer sees it live and can correct any record, and an administrator manages the whole institution (periods, classes, schedules, people, rooms, devices) and sees attendance everywhere from one TypeScript codebase on web, iOS and Android.

## Working rules (apply to every phase)

- **Agile slices.** Each phase delivers a vertical, testable product. No phase is "infrastructure only" except Phase 1 (tooling).
- **Prototype first, style later.** Build from the wireframes with plain NativeWind layout utilities only. All screens compose primitives from `src/components/ui/` (`Screen`, `Card`, `Button`, `TextField`, `ListItem`, `Badge`, `EmptyState`, `ErrorBanner`). Colors, spacing and type come from `tailwind.config.js` theme tokens, never hard-coded in screens. This keeps a later design pass (new tokens, new primitives) to a few files and lets styling be added at any phase boundary.
- **Types come from the database.** After every migration run the Supabase type generator and commit `src/types/database.ts`.
- **Tests per phase.** Unit (Jest via `jest-expo`), database (SQL assertions against a Supabase branch or local DB), and one web end-to-end path per phase. Native sensor paths are tested on physical devices plus fake adapters.
- **Permissions are data.** Authorization checks use permission keys (`attendance.view_all`, `attendance.edit_all`, ...) read from the user's JWT claims, never `role === 'admin'` in code (NFR-03).

---

## Phase 0: Documentation Discovery (done during planning; consolidated here)

**How this serves the primary goal:** Every later phase copies from documented APIs instead of guessing, so the three check-in methods and the role model are built on things that actually exist.

### Sources consulted

| Topic | Source | What was read |
|---|---|---|
| Product scope | `docs/Product Requirement Docuement.pdf` | FR-01..09, NFR-01..06, scope in/out |
| Data model | `docs/schema.sql`, `Data_Dictionary.xlsx` (5 sheets: Data Dictionary, Composite Constraints, Relationships, Enums, Audit Columns) | 17 tables (after the schema update: `auth_tokens` removed, `attendance_audit` added, `users.auth_user_id` added), 5 enums, 2 GiST exclusion constraints, `chk_attendance_check_in`, `set_updated_at` triggers |
| Screens | 3 wireframe PDFs (text extracted with `pdftotext -layout`) | Student: Home, Classes (current/previous), Calendar, Class details, Session details, Check-in dialog states, Profile. Lecturer: same plus attendees, attendance record, Change attendance (2-step confirm), student history. Admin: Today dashboard, Calendar, Classes, Periods CRUD, Schedules (availability picker), Roles (permission checklist), Beacons, CRUD-error component |
| Flows | `attendance-student-ui.drawio` pages 1-9 | Sign-in, view sessions, check-in (beacon, then NFC, then QR), sign-out, state diagrams, lecturer modify-attendance, admin CRUD sitemap with entity rules |
| Supabase Auth | supabase.com/docs/guides/auth/auth-email-passwordless | `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo } })`; `supabase.auth.verifyOtp({ email, token, type: 'email' })`; code vs link is decided by the email template (`{{ .Token }}` vs `{{ .ConfirmationURL }}`); OTP lifetime configurable, max 86400 s |
| Supabase RBAC | supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac | Custom Access Token Hook `public.custom_access_token_hook(event jsonb)`, grants to `supabase_auth_admin`, `auth.jwt() ->> 'claim'` in RLS, `(SELECT authorize('perm'))` wrapper pattern |
| Expo web output | docs.expo.dev/router/web/static-rendering | `app.json` `expo.web.output: "static"`, `npx expo export --platform web` writes `dist/`, deploy `dist` to any static host |
| NativeWind | nativewind.dev/docs/getting-started/installation | v4.2.7 with Tailwind CSS v3.4.x; `babel.config.js` preset `["babel-preset-expo", { jsxImportSource: "nativewind" }]` + `"nativewind/babel"`; `metro.config.js` `withNativeWind(config, { input: './global.css' })`; `app.json` `expo.web.bundler: "metro"`; `nativewind-env.d.ts` with `/// <reference types="nativewind/types" />` |
| Expo Router guards | docs.expo.dev/router/advanced/protected | `<Stack.Protected guard={bool}>`, `<Tabs.Protected guard={bool}>` (from `expo-router/js-tabs` in that page's example); a screen can be declared only once |
| QR scanning | docs.expo.dev/versions/latest/sdk/camera | `CameraView` with `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` and `onBarcodeScanned={({type,data}) => ...}`; `useCameraPermissions()`; works on Android, iOS and Web; config plugin `"expo-camera"` |
| NFC | github.com/revtel/react-native-nfc-manager | `NfcManager.start()`, `NfcManager.requestTechnology(NfcTech.Ndef)`, `NfcManager.getTag()`, `tag.ndefMessage`, `NfcManager.cancelTechnologyRequest()` in `finally`; Expo config plugin `"react-native-nfc-manager"`; **not usable in Expo Go**; iOS needs a physical device, RN 0.76+ New Architecture |
| TanStack Query RN | tanstack.com/query/latest/docs/framework/react/react-native | `onlineManager.setEventListener` with NetInfo/`expo-network`; `focusManager.setFocused` from `AppState` (skip on web) |
| Beacons | web search only (weak evidence) | `react-native-ble-plx` needs a dev client and does not expose CoreLocation iBeacon ranging; `react-native-ibeacon` wraps CoreLocation but is old (v0.6.0). **No verified Expo-compatible iBeacon library.** This is the project's biggest technical risk; Phase 12 starts with a spike. |

### Allowed APIs (use only these; look up anything else before using it)

- `@supabase/supabase-js`: `createClient`, `auth.signInWithOtp`, `auth.verifyOtp`, `auth.getSession`, `auth.onAuthStateChange`, `auth.signOut`, `from().select/insert/update/delete/upsert`, `rpc()`, `functions.invoke()`, `channel().on('postgres_changes', ...)`.
- Supabase MCP tools already connected in this environment: `apply_migration`, `execute_sql`, `list_tables`, `generate_typescript_types`, `get_advisors`, `search_docs`, `deploy_edge_function`, `create_branch`.
- `expo-router`: file-based routes, `Stack`, `Tabs`, `Stack.Protected`, `Tabs.Protected`, `Redirect`, `useRouter`, `useLocalSearchParams`.
- `@tanstack/react-query` v5: `QueryClient`, `QueryClientProvider`, `useQuery`, `useMutation`, `useQueryClient`, `focusManager`, `onlineManager`. Object-form arguments only.
- `expo-camera`: `CameraView`, `useCameraPermissions`.
- `react-native-nfc-manager`: `NfcManager`, `NfcTech`, `Ndef` helpers (confirm `Ndef` decode helpers in its `docs/guide/reading-ndef.md` before use).
- `nativewind` v4 `className` on RN components.

### Anti-patterns to avoid (grep for these in Final Verification)

- `supabase.auth.signIn(` (v1 API), `getSession()` used to authorize on a server (use `getUser`/verified claims server-side).
- `useQuery(key, fn)` positional form (v4 API).
- Putting `SUPABASE_SERVICE_ROLE` / secret keys in any `EXPO_PUBLIC_*` variable or any client bundle.
- Using `role === 'admin'` branches instead of permission keys.
- Writing QR seed (`location.qr_secret_seed`) or NFC `payload_token` to any client response outside the admin-only forms (wireframes: "never shown").
- Importing `react-native-nfc-manager`, BLE or iBeacon modules at the top level of a file that is bundled for web without a `.web.ts` stub.
- Joining `attendance` into list queries to compute percentages (the Admin sitemap says percentages come from separate `GROUP BY` queries).
- Assuming Expo Go works: NFC and Bluetooth need a development build (`expo-dev-client`).

### Decisions this plan makes (change them early or they stay)

1. **Auth uses Supabase Auth (`signInWithOtp` / `verifyOtp`). The `auth_tokens` table is dropped from `docs/schema.sql`** (decided by the user; PRD FR-09 only requires a one-time link or code).
2. **`users.auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id)` links each user to a Supabase Auth identity** (decided by the user; already in `docs/schema.sql`). Admins create users; the `admin-create-user` Edge Function creates the `auth.users` row and the `users` row together.
3. **`attendance_audit` keeps the history of attendance changes** (approved by the user; already in `docs/schema.sql`, filled by trigger `trg_attendance_audit`, append-only via `trg_attendance_audit_immutable`).
3. **Web build is the full app** (admin, lecturer, student). On web only **QR** check-in exists: Web NFC and iBeacon scanning are not available in browsers. Native builds add NFC and Bluetooth.
4. **Hosting split:** Netlify serves the static web export; native apps ship through EAS Build (outside Netlify); server logic (check-in verification, admin user creation) runs in Supabase Edge Functions.
5. **Check-in rules** (from state diagrams, which say these are app rules, not schema): window opens 10 minutes before start, `present` if before start, `late` after start, closed at session end, then a system job writes `absent` rows (`created_by` NULL).
6. **Percentages:** session % = (present + late) / enrolled; student class % = (present + late) / finished sessions, cancelled excluded, no row = absent (lecturer sitemap notes; the docs ask to confirm "late counts as attended", so confirm).
7. **Time zone:** schema stores `DATE`/`TIME` with no zone. Pick one institution zone (Australia/Melbourne per the PRD letterhead) and put it in one constant and one DB setting.

### Open questions for the user (answer before the named phase)

- Phase 8: who shows the rotating room QR? Lecturer wireframes say lecturers need no QR screen "unless the app will show the room QR". Proposed: an admin-only full-screen "Room QR display" page projected in the room.
- (Resolved) Attendance history: approved; `attendance_audit` is in the schema. The ERD drawio and Data_Dictionary.xlsx still need the three schema changes added by hand.
- Phase 6: the PRD lists "check-in devices" and the sitemap lists Frequencies and Sessions/Enrollments as admin CRUD; confirm Frequencies are in scope (plan assumes yes).

---

## Phase 1: /find-skills for all development tools

**How this serves the primary goal:** The remaining phases span six unfamiliar toolchains (Expo, NativeWind, TanStack Query, Supabase, Netlify, BLE/NFC); installing vetted skills first gives every later session accurate, current guidance and avoids invented APIs.

**Testable product:** `docs/SKILLS.md` listing each tool, the skill chosen (or "none found"), source, install count, and the installed path; skills load in a new Claude Code session.

### What to implement

1. Invoke the `find-skills` skill (`C:\Users\user\.claude\skills\find-skills\SKILL.md`). Follow its steps: check https://skills.sh/ leaderboard first, then `npx skills find <query>` for each query below.
2. Queries: `expo`, `expo router`, `react native`, `nativewind`, `tailwind`, `tanstack query`, `react query`, `supabase`, `supabase postgres rls`, `postgres`, `netlify`, `typescript`, `react native testing`, `jest expo`, `playwright`, `maestro e2e`, `eas build`, `react native nfc`, `react native bluetooth ble`, `accessibility mobile`.
3. Vet each candidate per the skill: prefer 1K+ installs, official sources (`expo`, `supabase`, `netlify`, `vercel-labs`, `anthropics`, `microsoft`), repo stars above 100. Do not install anything under 100 installs without asking the user.
4. Present the shortlist to the user and **wait for approval**, then install with `npx skills add <owner/repo@skill> -g -y`.
5. Already present (do not reinstall): `21st-registry`, `find-skills`, three `firebase-*` skills (irrelevant here; do not use). Supabase MCP tools are already connected.
6. Also install and check CLIs (user approval for each): `supabase` CLI, `netlify-cli`, `eas-cli` (`npx` is acceptable instead of global installs).
7. Write `docs/SKILLS.md`. Where no skill exists, write "none found; use official docs at <URL>" using the Phase 0 table.

### Documentation references

- `C:\Users\user\.claude\skills\find-skills\SKILL.md` (steps 1-6, quality-check rules).
- Commands that exist per that file: `npx skills find`, `npx skills add`, `npx skills update`, `npx skills init`. Do not use other subcommands without checking `npx skills --help`.

### Verification checklist

- [ ] `docs/SKILLS.md` has a row for every tool in the stack.
- [ ] Each installed skill appears under `C:\Users\user\.claude\skills\` or `C:\Users\user\.agents\skills\`.
- [ ] Start a new Claude session and confirm the new skills appear in the available-skills list.
- [ ] `supabase --version`, `netlify --version`, `eas --version` (or `npx` equivalents) print versions.

### Anti-patterns

- Installing skills on search results alone, without the install-count and source check.
- Installing globally without user approval.

---

## Phase 2: Walking skeleton (Expo app on web, deployed to Netlify)

**How this serves the primary goal:** Proves the full pipeline (Expo Router, NativeWind, TanStack Query, Supabase, Netlify) end to end on day one, so every later phase ships as a click on a real URL.

**Testable product:** A Netlify URL showing a tab shell (Home, Classes, Calendar, Profile) with placeholder screens that reads one row from Supabase; the same app running on an iOS or Android dev build.

### What to implement

1. Create the project in `C:\Users\user\Documents\attendanceSas` (code at repo root, docs stay in `docs/`): `npx create-expo-app@latest` with the TypeScript template using Expo Router; remove demo content. Pin the Expo SDK that the template installs; record it in `docs/SKILLS.md`.
2. Add NativeWind exactly as in Phase 0 (copy the 9 steps from nativewind.dev installation: packages, `tailwind.config.js` with `presets: [require("nativewind/preset")]` and a `content` glob covering `app/**` and `src/**`, `global.css`, `babel.config.js`, `metro.config.js`, `import "./global.css"` in the root layout, `nativewind-env.d.ts`, `web.bundler: "metro"`).
3. Add `@tanstack/react-query` v5; create `src/lib/query-client.ts` and wrap the root layout in `QueryClientProvider`. Wire `focusManager` (skip on web) and `onlineManager` as in the TanStack RN page.
4. Add `@supabase/supabase-js`; create `src/lib/supabase.ts` using `EXPO_PUBLIC_SUPABASE_URL` and the publishable (anon) key. Session storage: AsyncStorage on native, default on web.
5. Create the Supabase project/branch for dev (use `list_projects` / `create_project`; creating a project can cost money, so ask the user first via `get_cost` / `confirm_cost`).
6. Set `expo.web.output` to `"static"` in `app.json`; add `netlify.toml` with `build.command = "npx expo export --platform web"` and `publish = "dist"`. Connect the repo to Netlify (user approval) and set the two `EXPO_PUBLIC_*` variables.
7. Create the UI primitives folder `src/components/ui/` with `Screen`, `Card`, `Button`, `Text` (layout-only classes).
8. Add test tooling: `jest-expo`, `@testing-library/react-native`, ESLint, `tsc --noEmit` script; one smoke test.

### Documentation references

- Phase 0 table rows: NativeWind, Expo web output, TanStack Query RN, Expo Router guards.
- Note: Expo static output is not a SPA, so Netlify needs no SPA redirect rule; dynamic routes need `generateStaticParams` (Expo static-rendering page). Decide per route in later phases, or use `web.output: "single"` if the static rule blocks dynamic routes. Check the Expo docs page for `single` before using it (the fetched page did not confirm it).

### Verification checklist

- [ ] `npx tsc --noEmit` and `npm test` pass.
- [ ] `npx expo export --platform web` creates `dist/`; `npx serve dist` renders the shell with NativeWind classes applied.
- [ ] Netlify deploy URL loads; the Home placeholder shows a row/count from Supabase.
- [ ] App opens on iOS or Android via dev build with the same screens.
- [ ] `grep -r "service_role\|SERVICE_ROLE" src app` returns nothing.

### Anti-patterns

- Using Tailwind v4 with NativeWind v4 (docs pin Tailwind `^3.4.17`).
- Hard-coded colors in screens.
- Putting secrets in `EXPO_PUBLIC_*`.

### Phase 2 implementation notes (what was actually built)

- **Expo SDK 58** (React Native 0.88, React 19.3, TypeScript 6). Code lives in `src/` (`src/app`, `src/components/ui`, `src/lib`, `src/providers`), `@/*` maps to `src/*`. The template's `AGENTS.md` is kept: it says to read versioned Expo docs before touching Expo APIs.
- **NativeWind 4.2.7 + Tailwind 3.4 works on SDK 58 for web** (static export builds, tokens render). Also confirmed on a physical Android phone in Expo Go. iOS is untested (see the Phase 2 closing note below).
- Design tokens are CSS variables in `src/global.css`, mapped to semantic Tailwind colors in `tailwind.config.js` (`surface`, `content`, `primary`, `danger`, ...). Primitives in `src/components/ui/`.
- Env var names: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (the new publishable key, `sb_publishable_...`). `src/lib/supabase.ts` exports `null` until both are set.
- `web.output` is `"static"` (the template default was `"server"`). Build: `npm run build:web` to `dist/`. **Deployed to Netlify: https://attendacely.netlify.app** (auto-deploys from `main`; build settings come from `netlify.toml`; env vars `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` are set in the Netlify UI, not marked secret; the Backend card shows "Connected"). Supabase Auth Site URL / Redirect URLs must point at this address (Authentication > URL Configuration). **Phase 2 closed 2026-10-27:** verified on web (local, Netlify) and on a physical Android phone in Expo Go (loads, tabs work, Backend card shows "Connected"). iOS device not tested: Expo Go for SDK 55+ is not on the iOS App Store per Expo's docs, so iPhone testing uses the Netlify site in Safari until a development build exists.
- Tests: `npm test` (Jest + RNTL v14, `--forceExit` because a worker keeps a handle open), `npm run typecheck`, `npx expo lint`, `npx expo-doctor` (20/20).
- `npm audit` reports 5 high issues, all inside Expo's own CLI tooling (`@expo/cli`, `node-forge`, `zod`), not the app bundle. `npm audit fix --force` would downgrade Expo to SDK 44: do not run it. Re-check after each SDK upgrade.
- `expo-camera` was installed during setup and removed again; it returns in Phase 8.

---

## Phase 3: Database, security rules and seed data

**How this serves the primary goal:** The schema enforces the rules that make attendance trustworthy (no double-booked rooms, no impossible check-ins), and RLS makes sure a student can only ever see their own data.

**Testable product:** A Supabase database matching `docs/schema.sql` with RLS, a permission catalogue, and demo data (1 admin, 2 lecturers, 10 students, 1 active period, 4 classes, sessions, a few attendance rows), plus passing SQL tests.

### What to implement

1. Copy `docs/schema.sql` into `supabase/migrations/<timestamp>_init_schema.sql` unchanged (it already wraps in `BEGIN/COMMIT`; keep `CREATE EXTENSION btree_gist`). Apply with `apply_migration` (name in snake_case).
2. No separate auth-link migration is needed: `auth_user_id`, the removal of `auth_tokens`, and `attendance_audit` with its triggers are already in `docs/schema.sql`. Verify the first migration applies cleanly on Supabase (it references `auth.users`, which only exists there). Seed users must create the `auth.users` row first.
3. Third migration: permission catalogue seed. Keys are named in the docs: `attendance.view_own`, `attendance.view_all`, `attendance.edit` (own sessions), `attendance.edit_all`, `classes.view_own`, `sessions.start_finish_own`, and admin permissions: manage periods, classes and schedules, users, roles and permissions, locations and equipment, email formats (6 admin items in the Roles wireframe). Roles: `student`, `lecturer`, `admin` with `role_permission` rows. Use a `slug.verb` naming style consistently.
4. Custom Access Token Hook: copy the PL/pgSQL pattern from the Supabase RBAC page, but compute the effective permission array = role permissions + `user_permission` grants − denies (docs: "deny overrides grant"), and add claims `app_user_id` (`users.id`), `app_role` and `permissions` (text[]). Enable it in Auth Hooks (dashboard step; tell the user).
5. **Supabase project settings (chosen by the user at creation): Data API on, "Automatically expose new tables and functions" OFF, "Automatic RLS" on.** Because auto-expose is off, every migration must `GRANT` explicitly (Supabase docs, "Securing your API"): table privileges to `authenticated` only (never `anon`), `EXECUTE` on functions only to the roles that need them (`anon` gets `EXECUTE` on `is_allowed_email(text)` alone, for the pre-login domain check), and `service_role` as needed by Edge Functions. Bundle grants with RLS and policies in the same migration. A missing grant shows up as Postgres error `42501`.
6. RLS on **every** table (`ENABLE ROW LEVEL SECURITY`). Write policies using `(SELECT authorize('perm'))` and `auth.jwt()`:
   - students: read own `users` row, own `enrollment`, `attendance` where `student_id = app_user_id`, sessions/schedules of enrolled schedules;
   - lecturers: schedules where `lecturer_id = app_user_id`, sessions of those, attendance for those sessions, enrolled students' basic user fields;
   - `*.view_all` / admin permissions: wide read and write on the relevant tables;
   - `location.qr_secret_seed` and `nfc_tags.payload_token` must not be readable by `authenticated`: use column privileges (`REVOKE SELECT (qr_secret_seed)`) or a view; Edge Functions use the secret key.
7. SQL views/functions (separate migration) for derived data, never joining attendance into list queries: `session_attendance_summary(session_id)`, `student_class_attendance(student_id, class_schedule_id)`, `class_attendance_summary(schedule_id)`.
8. `seed.sql` demo data as above (create matching `auth.users` through the dashboard or an Edge Function; seed files cannot create them portably). Record demo logins in `supabase/seed-README.md` (the dev seed uses `@mailinator.com` addresses); do not commit real personal addresses.
9. Run `get_advisors` (security and performance) and fix findings. Run `generate_typescript_types` into `src/types/database.ts`.
10. SQL tests (pgTAP or plain assertions run through `execute_sql` on a branch): overlapping location slot raises `23P01`; overlapping lecturer slot raises `23P01`; `end_time <= start_time` raises `23514`; absent row with `checked_in_at` set raises `23514`; student A cannot select student B's attendance (set `request.jwt.claims` as in the Supabase docs "Testing your policies" pattern); deny override beats role grant.

### Documentation references

- `docs/schema.sql` (all constraints; exclusion constraints lines 213-214; `chk_attendance_check_in` line 274).
- `docs/Data_Dictionary.xlsx` sheet "Relationships" for ON DELETE/UPDATE behavior; sheet "Enums".
- Supabase RBAC page (hook, `authorize` function with `security definer set search_path = ''`).
- drawio page 8 note: "Permission = role_permission plus user_permission (deny overrides grant). Admins: attendance.edit_all".

### Verification checklist

- [ ] `list_tables` shows 17 tables with RLS enabled on all (including `attendance_audit`: readable with `attendance.view_all` or by the owning lecturer, never writable by clients).
- [ ] Updating an attendance row adds exactly one `attendance_audit` row with old/new values and `changed_by`; `UPDATE`/`DELETE` on `attendance_audit` raises an error.
- [ ] `get_advisors` shows no "RLS disabled" or exposed-secret findings.
- [ ] All SQL tests above pass.
- [ ] `src/types/database.ts` generated and `tsc --noEmit` passes.
- [ ] As the anon key with no session, `select * from users` returns zero rows.

### Anti-patterns

- Editing the schema silently: every deviation from `docs/schema.sql` (permissions seed, views, RLS) lives in its own migration with a comment.
- Policies that call `auth.uid()` per row without `(SELECT ...)` wrapping (performance advisor will flag it).

### Phase 3 implementation notes (what was actually built, 2026-10-27)

- Project `wsxziqkmnxtspydhanbd` (region **ap-southeast-1, Singapore**; Sydney was not chosen at creation, so expect extra latency for Melbourne users, relevant to NFR-05; moving regions means a new project). 6 migrations applied: see `supabase/migrations/README.md`. Seed: `supabase/seed.sql` (loaded). Tests: `supabase/tests/rls_and_constraints.sql` (**49/49 pass**). Types: `src/types/database.ts`, wired into `src/lib/supabase.ts`.
- **Permission catalogue is 15 keys** (not the 12 in the Roles wireframe): added `attendance.check_in`, `classes.view_all`, `admin.access` and split the Admin group per entity. Role grants: student 3, lecturer 4, admin 10.
- **Helpers live in schema `private`** (not exposed through the Data API). RLS uses the JWT claims `app_user_id`, `app_role`, `permissions[]` added by `private.custom_access_token_hook`.
- **Hook is NOT enabled yet: dashboard step required** (Authentication > Hooks > Custom Access Token > Postgres > `private.custom_access_token_hook`). Until then JWTs have no claims and every signed-in user sees nothing.
- Clients **cannot write `attendance` or `attendance_audit`**; Phase 8/9 add the Edge Functions/RPCs. `qr_secret_seed` and `nfc_tags.payload_token` have no client privileges (column-level grants). The Admin "QR on/off" flag, "regenerate" actions and NFC tag creation therefore need Edge Functions/RPCs in Phase 6.
- Students cannot yet see classmates' names (wireframe "Session attendees"); Phase 7 adds a narrow RPC that returns names and IDs only.
- Supabase's default ACL grants TRUNCATE/REFERENCES/TRIGGER to `anon` and `authenticated`; migration 5 revokes them. Re-check this after creating the production project.
- Advisors: security leaves 2 WARNs by design (`is_allowed_email` is callable by `anon` for the pre-login check and returns only true/false; leaked-password protection is irrelevant because sign-in is passwordless). Performance leaves INFO only (audit-column FKs deliberately unindexed; "unused index" on an empty database).
- **Seed users use the `@mailinator.com` email format** (admin: `sg@mailinator.com`; others `<id>@mailinator.com`), so every demo account can receive its sign-in email at mailinator.com. **Mailinator inboxes are public: anyone who knows an address can sign in as that user.** Fine for throw-away dev data; replace or delete these users before real data goes in, and never seed production (`supabase/seed-README.md`).
- **Verified live (2026-10-27):** the access-token hook is enabled; a real sign-in as `sg@mailinator.com` returned a JWT with `app_role=admin`, `app_user_id=A1000001` and the 10 admin permissions. The project's email delivered to a non-team address. The email is currently the default **magic-link** template (link to `http://localhost:3000`), not a 6-digit code; the first link was already invalid when used (probably fetched by a mail scanner), so Phase 4's code-entry flow (template with `{{ .Token }}`) also avoids scanner-consumed links. Supabase's built-in email sender is rate limited (a second request within the cooldown returned `over_email_send_rate_limit`), so Phase 4 should plan custom SMTP before real users sign in (check current limits in the Supabase docs first).
- Site URL / redirect URLs are still the default `http://localhost:3000`: set them to the Netlify URL and the app scheme `attendancesas://` when those exist.

---

## Phase 4: Passwordless sign-in and role-aware shell

**How this serves the primary goal:** Nobody can use the system until they prove who they are by email, and each role lands on screens built for them, which is the base for every check-in and every edit.

**Testable product:** On web and a dev build: enter institutional email, receive a code, land in the right tabs (student/lecturer: Home, Classes, Calendar, Profile; admin adds Admin), sign out. Wrong email domain and expired code show the documented messages.

### What to implement

1. Sign-in screen per drawio page 2: email field, "Send code". Validate the email domain against `email_parm.format` (read through a public RPC that returns only a boolean `is_allowed_email(text)`), message "Use your institutional email". Call `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`; always show the same "Check your email" message whether or not the account exists (flow page 2). Code entry screen calls `verifyOtp({ email, token, type: 'email' })`; "Link expired, tap Resend" path.
2. Email template: switch the Magic Link template to include `{{ .Token }}` (6-digit code). Document the dashboard step for the user. Native deep-link login is out of this phase; the code flow works identically on web and native.
3. Because `shouldCreateUser: false` requires an existing `auth.users` row, create `supabase/functions/admin-create-user` (Edge Function, secret key, checks `users.manage` permission in the caller's JWT): inserts `users` + `auth.admin.createUser({ email, email_confirm: true })` and links `auth_user_id`. Admin UI for it comes in Phase 5; here, use it to create the seed users.
4. Auth context (`src/providers/auth.tsx`): `onAuthStateChange`, decode the access token for `permissions`, `app_role`, `app_user_id` (claims from Phase 3); expose `can(permissionKey)`.
5. Routing: `app/_layout.tsx` with `Stack.Protected guard={isSignedIn}` around `(app)` and `Stack.Protected guard={!isSignedIn}` around `(auth)`; `(app)/(tabs)/_layout.tsx` with `Tabs.Protected guard={can('admin.access')}` for the Admin tab. Use the exact `guard` API from Phase 0.
6. Profile screen per wireframes (read-only personal info, Role, Sign out with confirm dialog per drawio page 5). Device permissions screen on first launch: native student only (drawio page 2); lecturers get none.
7. Sign-out clears session and TanStack Query cache (`queryClient.clear()`).

### Documentation references

- Supabase passwordless page; drawio pages 1, 2, 5, 7, 9; Profile wireframes (student, lecturer, admin).
- Expo Router protected routes page.

### Verification checklist

- [ ] Sign in as seeded student, lecturer, admin: tabs match the wireframes.
- [ ] Unknown email and wrong-domain email show the same generic/or documented message, no account leakage.
- [ ] Code reuse and expired code are rejected.
- [ ] A student session cannot open an admin route by URL on web (redirect).
- [ ] Jest tests for `can()` with grant/deny override fixtures.

### Anti-patterns

- Storing the token or role in plain component state without `onAuthStateChange`.
- Role checks by name instead of permission keys.

### Phase 4 implementation notes (interim magic-link flow, 2026-10-28)

- **No custom SMTP yet, so the email template cannot be changed to a 6-digit code.** Phase 4 is built on the default **magic link** instead. The sign-in screen sends the link (`signInWithOtp` with `emailRedirectTo`), the web build lets supabase-js read the tokens from the URL (`detectSessionInUrl` on web only), and native reads the deep link in `src/app/auth-callback.tsx` (`setSession`). Code entry (`verifyOtp`) is **deferred** until SMTP exists and the template has `{{ .Token }}`; then add a code field to the "Check your email" screen. Magic links can be consumed by mail scanners (seen once in Phase 3), so the code flow remains the better end state.
- **Dashboard prerequisites for the link flow:** Authentication > URL Configuration: Site URL `https://attendacely.netlify.app`; Redirect URLs `https://attendacely.netlify.app/**`, `http://localhost:8081/**`, `attendancesas://**`, and `exp://**` while testing in Expo Go (remove `exp://**` once dev builds replace Expo Go). Also turn off "Allow new users to sign up".
- The domain check uses `is_allowed_email`; an allowed domain always shows "Check your email" (an unknown account returns 422 from Supabase and is shown as sent). Resend has a 60 second cooldown in the UI; Supabase's own email rate limit still applies.
- Routing: `src/app/_layout.tsx` guards `(auth)` with `!signedIn` and `(app)` with `signedIn` (`Stack.Protected`). `(app)/(tabs)` adds the Admin tab with `Tabs.Protected guard={can('admin.access')}`. A student opening `/admin` by URL is redirected.
- `can()` reads the `permissions` claim. The hook already applies deny-over-grant, so the client only checks membership. Claims refresh with the token, so a changed permission shows up after the next refresh or sign-in.
- Device permissions screen is shown once on native to anyone with `attendance.check_in` (not by role name). It is information only; real Bluetooth/NFC/camera requests arrive with Phases 8, 11 and 12.
- `supabase/functions/admin-create-user` is written but **not deployed**; deploying needs the user's go-ahead. Tailwind `darkMode: 'class'` was set because NativeWind web threw "Cannot manually set color scheme" (covering the page) when a second route chunk loaded in dev.

---

## Phase 5: Admin CRUD part 1 (reference data and people)

**How this serves the primary goal:** Administrators can create the people, roles and calendar structure that attendance depends on, so a real institution (not just seed data) can be loaded.

**Testable product:** Admin tab with working list, filter, details, create, edit and delete for Periods, Classes, Frequencies, Email formats, Roles (with permission checklist), Permissions, and Users (with permission overrides).

### What to implement

1. Build the **generic CRUD kit** once, from the Admin sitemap's "CRUD pattern used by every entity" (drawio page 9): `EntityList` (search + filter + `+ Add`), `EntityDetails` (all attributes, audit fields read-only, related lists), `EntityForm`, delete with confirm. Desktop shows a side details panel (wireframe); mobile uses full screens.
2. Build the **CRUD error component** exactly as specified in the Admin wireframes ("Component: CRUD error"): map Postgres codes `23505` unique_violation, `23P01` exclusion_violation, `23503` foreign_key_violation, `23514` check_violation, other to the titles in that table; constraint name to form fields; raw errors logged, never shown; form values kept on failure. Build the lookup as a data table `src/lib/db-errors.ts` so new constraints are one line.
3. Entities in order (rules from drawio page 9): Periods (finish > start; delete blocked while schedules exist; status planning/active/finished); Classes; Frequencies (`interval_days > 0`); Email formats; Permissions (delete cascades, confirm first); Roles (checklist grouped Attendance / Classes and sessions / Admin; "N users have this role" notice); Users (ID `S|L|A` + 1-7 digits, email must match chosen `email_parm.format`, creation through the `admin-create-user` Edge Function, permission overrides grant/deny list).
4. All lists use `useQuery({ queryKey, queryFn })`; mutations `useMutation` with `invalidateQueries`.
5. Gate every screen with `can(...)` and rely on RLS as the real enforcement.

### Documentation references

- Admin wireframes: Periods list/details, Roles add/edit, CRUD error component; drawio page 9 entity blocks; `schema.sql` constraints for each entity.
- TanStack Query v5 `useMutation` + `invalidateQueries` (official docs).

### Verification checklist

- [ ] Create, edit, delete each entity as admin; all succeed and show in lists after refetch.
- [ ] Duplicate role name shows "Role already exists" with "Open existing role" action (wireframe).
- [ ] Deleting a period that has schedules shows "still in use" and keeps form state.
- [ ] A lecturer opening any Admin URL is redirected; direct API write as lecturer is rejected by RLS (SQL test).
- [ ] Jest tests for `db-errors.ts` mapping and the permission checklist select-all logic.

### Anti-patterns

- Per-entity copy-pasted screens (use the kit).
- Showing raw Postgres messages.

### Phase 5 implementation notes (2026-10-28)

- **Data-driven kit, no per-entity screens:** `src/features/admin/entities.ts` defines Periods, Classes, Frequencies, Email formats, Permissions, Roles and Users; four generic routes under `admin/[entity]` (list, new, details/edit/delete) render them. Adding an entity is one entry. Roles add the permission checklist (`permission-groups.ts`) and Users add the overrides editor as special field types.
- **CRUD error component** (`crud-error.tsx`) with the lookup tables in `src/lib/db-errors.ts` (code table plus a constraint-name table that marks form fields). Raw errors go to `console.warn` only.
- **Deviations from the plan:** details open as full screens on every screen size (no desktop side panel yet; layout pass later). Users have no Delete: the database grants clients no DELETE on `users` and each user is tied to a sign-in account. Frequencies are gated by `classes.manage` and Permissions by `roles.manage`, matching the RLS policies from Phase 3.
- **Users:** editing changes first name, last name, role and overrides only (ID, email and email format are fixed at creation; the column grant allows just those three). **Creating a user needs the `admin-create-user` Edge Function deployed, which has not been done.** The function now answers with `{ error, code, message }` so the app shows the standard "already exists" message.
- **Not verified in a browser:** the Supabase email limit (2 per hour) blocked a sign-in during development, and the database connector refused the SQL error probes. Verified: typecheck, lint, 30 Jest tests (error mapping, checklist select-all, form validation), static export builds the routes. Still to check by hand with the admin account: create/edit/delete each entity, duplicate role message, period-in-use message, lecturer redirected from `/admin`.
- Dev-only: the Expo router typegen lists `supabase/functions/.../index` as a route in `.expo/types`; it is not bundled.

---

## Phase 6: Admin CRUD part 2 (rooms, devices, timetable, enrolment)

**How this serves the primary goal:** Check-in only works when a room has a way to confirm presence and a class has a time, a lecturer and enrolled students; this phase lets admins set that up.

**Testable product:** Admin can create Locations, Beacons, NFC tags, Schedules (with a live room-availability picker), generate and reschedule/cancel Sessions, and enrol students; an overlapping schedule is rejected with the documented message.

### What to implement

1. Locations: list/details/form; "QR check-in on/off" derived from `qr_secret_seed IS NOT NULL`; **Regenerate QR seed** and **Enable QR** call an Edge Function `location-qr-seed` (16-64 random bytes, `crypto.getRandomValues`, never returned to client); detail page shows beacons, NFC tags, schedules using it; delete blocked while schedules use it (beacons/tags become unassigned).
2. Equipment: Beacons (uuid, major/minor 0-65535, `rssi_calibrated` -127..0, one location only; "Move beacon" confirm per wireframe) and NFC tags (UID uppercased 8/14/20 hex; `payload_token` generated server-side and hidden; "regenerate").
3. Schedules form per wireframe: class, lecturer (users with L role), period, frequency, weekday chips, start/end, **Location list with Free / Booked: <class>** computed by an RPC `locations_availability(period_id, week_day, start, end)` that mirrors the exclusion constraint; "Show free locations only" toggle. The DB constraint remains the source of truth and surfaces "Location already booked" through the CRUD error component, including "Conflicts with" lookup.
4. Sessions: Edge Function or RPC `generate_sessions(schedule_id)` that inserts `class_session` rows for each occurrence between period `start_date` and `finish_date` stepping by `frequency.interval_days` on the schedule's `week_day`; session screen supports reschedule (`override_*`, status `rescheduled`) and cancel; unique `(class_schedule_id, session_date)` respected.
5. Enrolments inside schedule details: add student (users with S prefix), remove.
6. Create a seeded "week of demo data" script for testing if not already complete.

### Documentation references

- drawio page 9 (Locations, Equipment, Schedules, Sessions, Enrollments blocks); Schedules and Beacon wireframes (availability picker, Move beacon); `schema.sql` lines 146-216; ISO weekday note (`week_day` 1=Mon..7=Sun).

### Verification checklist

- [ ] Creating a schedule in an occupied room is blocked in UI and by the DB (`23P01`).
- [ ] Generating sessions for a weekly schedule over a 10-week period yields 10 rows; fortnightly yields 5.
- [ ] Rescheduling sets `rescheduled` and override fields; cancel sets `cancelled`.
- [ ] Moving a beacon between rooms updates both rooms' lists.
- [ ] QR seed and NFC token never appear in any API response to a non-admin (network inspection test).

### Anti-patterns

- Computing session dates in the client; generate them in SQL/Edge Function so there is one definition.
- Returning `qr_secret_seed` to the browser.

---

## Phase 7: Schedules and class views for every role

**How this serves the primary goal:** Students need to find the live session to check in to, and lecturers and admins need to see what is happening now; this delivers the screens that lead to the check-in button.

**Testable product:** Student, lecturer and admin Home (today sessions with Live/Upcoming/Finished/Rescheduled/Cancelled badges), Classes (current vs previous period), Class details, Calendar (week picker), Session details (read-only status), per wireframes.

### What to implement

1. Queries behind each tab, copied from the Admin sitemap SQL (drawio page 9 "Queries behind the three tabs") as Postgres views/RPCs: use `COALESCE(cs.override_start_time, s.start_time)` and `COALESCE(cs.override_location_id, s.location_id)`, `SELECT DISTINCT`, percentages via separate `GROUP BY` queries.
2. Student: Home (Today sessions, Upcoming sessions), Classes (Current / Previous tabs, "My attendance NN%"), Class details (term, day+time, frequency, location, lecturer, my attendance summary 10 present / 1 late / 2 absent, Upcoming/Previous session lists), Calendar week picker, Session details (details block, lecturer, attendees preview "Show all"). Check In button rendered **disabled with the correct state label** ("Opens at 9:50", "Closed", "Not available") from the Check-in UI states diagram; it stays inert until Phase 8.
3. Lecturer: same screens driven by `class_schedule.lecturer_id`; Home cards with "Open live attendance / View session / View attendance"; Classes with "N below 75%"; no check-in.
4. Admin: Today dashboard counts (Sessions today, Live now, Upcoming, Finished, Rescheduled or cancelled), filters (Class, Lecturer, Location, Status), calendar with session counts per day.
5. Status-badge component mapping `session_status` to UI label (scheduled/rescheduled to Upcoming with new time, started to Live, finished, cancelled), per state diagram A.
6. Session status transitions: `scheduled → started` at start time, `started → finished` at end time. Implement as a `pg_cron` job (confirm the extension is available on the Supabase plan with `list_extensions`) running every minute, or compute the effective status in the views as fallback. Lecturer manual start/finish comes in Phase 9.

### Documentation references

- Student wireframes (all pages), lecturer wireframes (Home, Classes, Calendar, Class details), admin wireframes (Today, Calendar, Classes); drawio pages 1, 3, 6, 7.

### Verification checklist

- [ ] Seeded student sees only sessions of enrolled schedules; a student not enrolled in a schedule sees none of its sessions.
- [ ] Rescheduled and cancelled sessions render per wireframes; cancelled excluded from percentages.
- [ ] Admin dashboard counts equal row counts from `execute_sql`.
- [ ] Web, iOS and Android render the same routes (smoke test on each).

### Anti-patterns

- Showing a session twice because of a join with enrolled students (the admin wireframe says "Each listed once").

---

## Phase 8: Check-in v1: QR code (end to end) and the check-in orchestrator

**How this serves the primary goal:** Delivers the first real check-in: a student on any platform, including web, proves they are in the room and gets recorded present or late in under 5 seconds.

**Testable product:** A student scans the room's rotating QR (displayed on another screen) and the Session screen flips to "Checked in" with status, time and method. Absent rows appear at session end.

### What to implement

1. **Rotating QR scheme** (decide and document in `docs/check-in-protocol.md`): payload `v1.<locationId>.<step>.<mac>` where `step = floor(unixSeconds / 30)` and `mac` = first 16 hex chars of HMAC-SHA256(`qr_secret_seed`, `"<locationId>.<step>"`). Server accepts the current step ±1.
2. Edge Function `check-in` (secret key; verifies caller JWT): input `{ sessionId, method, evidence }`. Steps from drawio page 4: enrolled? window open (10 min before start to end)? existing attendance row? evidence valid for the **session's effective location** (override or schedule)? then `INSERT attendance (status = present|late, checked_in_at = now(), check_in_method)`. Returns 409 if already checked in. Response includes the stored row for the "You're checked in" screen.
3. Edge Function `room-qr` (admin-only, permission `locations.manage`): returns the current QR payload for a location; the Admin "Room QR display" page (open question 1) refreshes it every 25 s.
4. Client orchestrator `src/features/check-in/orchestrator.ts`: ordered list of `CheckInMethod` adapters `{ id, isAvailable(): Promise<boolean>, run(session): Promise<Evidence> }`, UI states from state diagram C (not open, available, checking, manual needed, checked in, closed, not available). Order is beacon, NFC, QR; only the **QR adapter** exists now (uses `CameraView` + `useCameraPermissions`, `barcodeTypes: ['qr']`); beacon/NFC adapters are stubs returning `isAvailable() = false` so the "fallback" UI already works.
5. Check-in dialog per student wireframes: method list with per-method status, "Skip to QR code", "Can't check in? Ask your lecturer to check you in manually", success screen.
6. Absent job (`pg_cron` or the Phase 7 job): at session end insert `absent` rows for enrolled students with no row (`created_by` NULL).
7. Performance logging: client timing from tap to success; NFR-05 target < 5 s.

### Documentation references

- drawio page 4 (check-in flow), page 6 state diagrams A-C; student wireframes "Check in" dialogs; `schema.sql` `check_in_method`, `chk_attendance_check_in`; `expo-camera` docs from Phase 0.

### Verification checklist

- [ ] E2E (web, Playwright with a fake camera or the manual-entry fallback of the payload in a dev-only field): valid QR returns present before start and late after start.
- [ ] Rejected: expired step (> ±1), wrong location, non-enrolled student, window closed, cancelled session, second check-in (409).
- [ ] Hand-forged payload without the seed is rejected (unit test for the MAC).
- [ ] After a finished session, absent rows exist for the no-shows and satisfy `chk_attendance_check_in`.
- [ ] Tap-to-success under 5 s on a dev build over mobile data (measure, record in `docs/perf.md`).

### Anti-patterns

- Verifying the QR on the client; the seed never leaves the server.
- Using `Date.now()` from the client as the check-in time (use server `now()`).

---

## Phase 9: Lecturer attendance: live view, history, manual check-in and corrections

**How this serves the primary goal:** Lecturers see who is present as it happens and fix anything wrong (including students who cannot check in), which keeps records trustworthy.

**Testable product:** Lecturer opens a live session and sees counts and attendees updating, opens any student's record, changes status with a required reason, and checks a student in manually; student's app reflects the change.

### What to implement

1. Session attendance screen (Live / Upcoming "Not open yet" / Finished variants): KPI tiles (Checked in, Enrolled, Session attendance %, Late), search, status filter, attendee table (name, ID, status, time, method, "View record"). Live updates via `supabase.channel().on('postgres_changes', ...)` on `attendance` filtered by `session_id`, with polling (`refetchInterval: 10000`) as fallback.
2. Attendance record screen and **Change attendance** flow per drawio page 8: status chooser, reason required, method fixed to `manual`, `checked_in_at` default = session start (or keep existing time when changing status only; `NULL` both when set to absent), two-step "Save this change?" confirmation, upsert on `(student_id, session_id)` with `updated_by`. Only for `started`/`finished` sessions, only own schedules unless `attendance.edit_all`.
3. Server enforcement: Edge Function `change-attendance` (or RPC with `security definer` and the permission checks): own schedule or `edit_all`, session state, reason non-empty (stored in `attendance.comments`) and `updated_by` set. The audit row is written by trigger `trg_attendance_audit`, not by the function. Add a "History" list on the attendance record screen reading `attendance_audit`.
4. Student attendance history and shared classes (lecturer sitemap page 7): student detail screen, per-class %, session list with filters, empty-state screens (0 students enrolled, no sessions held).
5. Optional: lecturer **Start session / End session** buttons (state diagram A: "start time reached or lecturer starts") if the team confirms.

### Documentation references

- Lecturer wireframes: Live/Upcoming/Finished session, Attendance record, Change attendance (both dialogs), student history; drawio pages 7-8; PRD FR-05, FR-06, FR-07.

### Verification checklist

- [ ] Student checks in via QR on device A; lecturer screen on device B updates within 10 s.
- [ ] Change absent to present: row has `check_in_method = manual`, `updated_by = lecturer id`, reason saved; session % and class % recalculate.
- [ ] Changing to absent nulls time and method (no constraint violation).
- [ ] A lecturer cannot edit another lecturer's session (RLS/Edge test); admin can.
- [ ] Missing reason blocks Save.

### Anti-patterns

- Client-side permission checks as the only guard.
- Updating the row without recording who and why.

---

## Phase 10: Admin attendance oversight and reports

**How this serves the primary goal:** Administrators see attendance for every class, lecturer and student across the institution and can correct any record, so management has one trustworthy place.

**Testable product:** Admin can open any session or class and see enrolled students, attendance rates, "below 75%" lists, filter and export a report; admin can edit any record.

### What to implement

1. Admin Classes screen (period filter default active): Enrolled, Class average, Below 75% columns; Class details with Students and Sessions tabs, "Manage enrolment" link to Phase 6.
2. Admin Session screen (Started variant): same as lecturer view without lecturer filtering; note `attendance.edit_all` shown in the wireframe.
3. Reports page (new, derived from PRD "view attendance reports of all students and all lectures"): by student (all classes, % per class), by lecturer (sessions taught, average attendance), by class; filters: period, class, lecturer, status; CSV download via the browser on web and the share sheet on native (confirm the CSV need; it is not in the docs).
4. Reuse Phase 9 components with `view_all`; keep RLS-driven.

### Documentation references

- Admin wireframes: Classes, Class details, Session (Started); drawio page 9 query notes; PRD Target Users and FR-05/06.

### Verification checklist

- [ ] Numbers on the Admin Classes screen match independent SQL via `execute_sql`.
- [ ] Admin edits a lecturer's session record; `updated_by` is the admin.
- [ ] Report with 10k generated attendance rows loads in under 3 s (generate with SQL).

### Anti-patterns

- Percentages computed in the client from raw attendance rows.

---

## Phase 11: Check-in v2: NFC (native only)

**How this serves the primary goal:** Adds the second check-in method so a tap on the tag at the door records attendance when Bluetooth is off or unreliable.

**Testable product:** On a physical phone with an NFC tag programmed by the admin, tapping the tag checks the student in; the orchestrator falls back to QR on devices without NFC.

### What to implement

1. Add `react-native-nfc-manager` and `expo-dev-client`; add the plugin to `app.json`; follow `docs/guide/expo.md` and `docs/guide/ios.md` in that repo for the iOS entitlement and usage description (read both first; the main README did not list the options). Build with EAS or `npx expo run:android --device`. Update Phase 2's CI note: Expo Go is no longer sufficient.
2. `NfcAdapter implements CheckInMethod` using `NfcManager.start()`, `requestTechnology(NfcTech.Ndef)`, `getTag()`, parse `ndefMessage` for the `payload_token`, always `cancelTechnologyRequest()` in `finally`. File layout: `nfc-adapter.native.ts` plus `nfc-adapter.web.ts` stub returning unavailable.
3. Server: Edge Function `check-in` accepts `{ method: 'nfc', evidence: { payloadToken } }` and validates against `nfc_tags.payload_token` where `location_id` = the session's effective location. (The Student wireframes mention the tag's token validation only; the UID is not trusted on its own.)
4. Admin "Write tag" helper (native admin build): writes the NDEF text record with `payload_token` to a blank tag and saves `nfc_uid`. Confirm in the library docs that UID is readable on both platforms before relying on it; if not, key on `payload_token` only.
5. `isAvailable()` = NFC supported AND enabled AND location has an `nfc_tags` row (flow page 4).

### Documentation references

- `react-native-nfc-manager` README and `docs/guide/*`; drawio page 4; wireframes "Check in" states.

### Verification checklist

- [ ] Physical test on one Android and one iOS device: tap succeeds and stores `check_in_method = 'nfc'`.
- [ ] Wrong-room tag rejected; disabled NFC falls back to QR with the "NFC is off" message.
- [ ] Web build contains no import of the native module (build passes, `expo export` log clean).
- [ ] Fake-adapter unit tests cover the orchestrator order and fallback.

### Anti-patterns

- Trusting `nfc_uid` alone (cloneable); the server-validated token is the proof.
- Leaving the NFC session open (always cancel in `finally`).

---

## Phase 12: Check-in v3: Bluetooth beacon (native only)

**How this serves the primary goal:** Bluetooth is the first method tried, so students are checked in automatically just by being in the room, the experience the PRD pitches.

**Testable product:** On physical iOS and Android phones near a configured iBeacon, Check in finds the beacon and records `check_in_method = 'beacon'`; moving away or turning Bluetooth off falls through to NFC/QR.

### What to implement

1. **Spike first (time-boxed to 1 day, output `docs/beacon-spike.md`):** choose an iBeacon approach compatible with the current Expo SDK and a dev build. Candidates to evaluate by reading their current docs and repos (none is verified): a maintained iBeacon/region-ranging module, `react-native-ble-plx` for Android scanning plus a CoreLocation-based module for iOS, or a small local Expo Module (Swift CoreLocation ranging, Kotlin BLE scan) following the Expo Modules API docs. Record install counts, last release date, SDK compatibility, and a working "detect my beacon" demo on one iOS and one Android phone. If no option works, fall back and tell the user: Bluetooth would be deferred and NFC + QR remain.
2. `BeaconAdapter implements CheckInMethod`: `isAvailable()` = Bluetooth on AND location permission granted AND the session's location has a `beacon` row; `run()` ranges for up to ~5 s and returns `{ uuid, major, minor, rssi }` once uuid/major/minor match a beacon of the session location and RSSI is closer than a threshold derived from `beacon.rssi_calibrated` (documented in the protocol doc; calibrate threshold on site).
3. Server: `check-in` re-validates uuid/major/minor against `beacon` rows for the session's effective location. Be explicit in `docs/check-in-protocol.md` that a client-reported beacon sighting is weaker evidence than a signed QR (a student could replay beacon identifiers, which are public); mitigate with rate limits, optional minor/major rotation, and showing method in all reports. Raise the residual risk with the team lead.
4. Permissions: Bluetooth/location/nearby-devices prompts in the first-launch screen; "Denied permissions only remove that check-in method" (drawio page 2).

### Documentation references

- Phase 0 Beacons row (weak; spike must replace it with verified docs); `schema.sql` `beacon` table; drawio pages 2 and 4; Expo Modules API docs (if a custom module is needed).

### Verification checklist

- [ ] Spike doc exists with a working demo before any adapter code is written.
- [ ] Physical tests: in-room success, out-of-room (different beacon) rejected, Bluetooth off falls back to NFC then QR.
- [ ] Orchestrator order beacon, NFC, QR verified by unit tests with three fake adapters.
- [ ] iOS and Android background/permission edge cases noted in the doc.

### Anti-patterns

- Choosing a library from a single search result.
- Treating a beacon sighting as unforgeable.

---

## Phase 13: Hardening against the non-functional requirements

**How this serves the primary goal:** Makes the check-in fast, safe, private and reliable enough to use in a real lecture with a hundred phones at once.

**Testable product:** A checklist report in `docs/nfr-report.md` with measured results.

### What to implement

1. NFR-02 Security: run `get_advisors`; review every RLS policy against the matrix of roles; confirm HTTPS only; rate-limit `signInWithOtp` and `check-in`; secrets only in Edge Function env.
2. NFR-05 Performance: load test the `check-in` function (for example 100 concurrent check-ins on one session) and add indexes where `get_advisors` or `EXPLAIN` show scans (`attendance(session_id)`, `class_session(session_date)`, `enrollment(user_id)`).
3. NFR-06 Privacy (Australian Privacy Principles): inventory personal data fields, retention policy proposal, no PII in logs, account/data access path for a user; location permission only requested when needed. Flag items needing a legal or policy review.
4. NFR-01 Availability: uptime monitoring on the Netlify URL and Supabase health; offline/slow-network states on check-in (TanStack `onlineManager` already wired); user-friendly error screens.
5. NFR-03/04: demonstrate adding a new role and permission via Admin only (e.g. `accounting`), with no code change; keep feature code under `src/features/<module>` so grading/document modules can be added later.
6. Accessibility pass: labels on all controls, focus order, error component announces its title (wireframe behaviour), color not the only status signal.

### Documentation references

- PRD NFR-01..06; Supabase production checklist (`search_docs`); the Admin "CRUD error" component behaviour notes.

### Verification checklist

- [ ] New role created in Admin gets its own tabs/permissions with no deploy.
- [ ] p95 check-in latency recorded and under 5 s.
- [ ] No advisor errors; no secret in a client bundle (`grep` the `dist/` output for `service_role`/secret key prefix).

### Anti-patterns

- Claiming compliance with the Australian Privacy Principles from a checklist alone; this phase produces findings for a human review.

---

## Phase 14: Release and handover

**How this serves the primary goal:** Puts the app in front of real users on all three platforms and gives the team a way to keep shipping.

**Testable product:** Production web URL on Netlify, an iOS TestFlight build and an Android internal build, connected to the production Supabase project; a README anyone can follow.

### What to implement

1. Separate Supabase projects/branches for dev and prod; migrations applied in order; secrets set; Auth redirect URLs and Site URL updated for the Netlify domain.
2. Netlify production deploy from `main`, preview deploys for PRs, environment variables per context.
3. EAS Build profiles (`development`, `preview`, `production`); TestFlight and Play internal track submissions (the user's accounts and approval needed; never submit without explicit approval).
4. Docs: `README.md` (setup, env vars, scripts), `docs/runbook.md` (create admin, rotate QR seed, replace beacon/tag, restore from backup), `docs/check-in-protocol.md` finalised.
5. Seed a production admin through the Edge Function with a real email supplied by the user.

### Verification checklist

- [ ] Fresh clone follows README to a running dev app in under 30 minutes.
- [ ] Production smoke test: sign in, view schedule, check in by QR, lecturer sees it, admin report shows it.

---

## Final Phase: Verification

**How this serves the primary goal:** Confirms the finished product actually delivers the promised outcome and nothing was built on invented APIs.

1. Requirement trace: write `docs/traceability.md` mapping FR-01..FR-09 and NFR-01..06 to screens, functions and tests; every row has a passing test or a manual-test note.
2. Role walk-through on web and on physical devices: student (sign in, schedule, current and previous classes, records, check in by each method), lecturer (schedule, live attendance, history, manual check-in, corrections), admin (CRUD for users, roles, permissions, classes, schedules, periods, locations, devices; all-sessions view; reports).
3. Anti-pattern greps (must return nothing): `grep -rn "auth.signIn(" src app`, `grep -rnE "role === ['\"]admin" src app`, `grep -rn "useQuery(\[" src app`, `grep -rnE "EXPO_PUBLIC_.*(SECRET|SERVICE)" .`, `grep -rn "qr_secret_seed\|payload_token" src app` (only the admin forms may match).
4. Run `tsc --noEmit`, `npm test`, the Playwright web suite, SQL tests, `get_advisors`.
5. Diff the finished schema against `docs/schema.sql`; list every deviation (expected: only seeds, views and RLS; the schema itself already matches the user-approved changes).

---

## Deferred (not in this plan)

Visual design and design system (hooks exist: tokens plus `components/ui`), LMS integrations (Canvas, Moodle), grading and document records, buying/installing room equipment, push notifications, offline check-in queue, CSV import of users and enrolments, analytics dashboards beyond Phase 10, multi-institution tenancy.
