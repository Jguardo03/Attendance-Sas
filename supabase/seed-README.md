# Demo data (development only)

`supabase/seed.sql` loads: 1 admin, 2 lecturers, 10 students, 3 academic periods (2026 Term 3 finished, 2026 Term 4
active, 2027 Term 1 planning), 4 classes, 3 rooms (Room 1.01 has a QR secret, a beacon and an NFC tag), 5 schedules,
55 sessions (past ones finished), 35 enrolments, 163 attendance rows and one lecturer correction (visible in `attendance_audit`).
It refuses to run twice. The same data is already loaded in the dev project.

All users use the email format `@mailinator.com` (row in `email_parm`), so every account can receive its sign-in code
at https://www.mailinator.com (type the address into the inbox box).

| ID | Name | Role | Email |
|----|------|------|-------|
| A1000001 | Alex Admin | admin | sg@mailinator.com |
| L1000001 / L1000002 | Lena Lee / Omar Park | lecturer | l1000001@mailinator.com / l1000002@mailinator.com |
| S1000001 ... S1000010 | students | student | s1000001@mailinator.com ... s1000010@mailinator.com |

**Mailinator inboxes are public.** Anyone who knows or guesses an address can read its mail and therefore sign in as that
user. That is acceptable for throw-away demo data on a development project, and not acceptable for real data or for
production. Before real users or real records go into this project, change these emails (and the `email_parm` row) to
addresses you control, or delete the demo users. Never run this seed against production.

Tests: `supabase/tests/rls_and_constraints.sql` (expects this seed; 49 checks).
