-- Demo data for DEVELOPMENT ONLY (never run against production).
-- Users get @mailinator.com addresses (sg@mailinator.com is the admin). Mailinator inboxes are PUBLIC: anyone who knows an address can read its mail,
-- so use this seed on development projects only (see supabase/seed-README.md).
DO $seed$
DECLARE
  tz constant text := 'Australia/Melbourne';
  today date := (now() AT TIME ZONE 'Australia/Melbourne')::date;
  r record;
  v_uid uuid;
  v_email text;
  v_role int;
  v_parm int;
  p4 int; p3 int; p1 int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.users) THEN
    RAISE EXCEPTION 'seed.sql: users already exist, refusing to seed twice';
  END IF;

  INSERT INTO public.email_parm (institution, format) VALUES ('Demo Institution (Mailinator)', '@mailinator.com') RETURNING id INTO v_parm;

  -- People: 1 admin, 2 lecturers, 10 students. Auth identity first, then the application user.
  FOR r IN SELECT * FROM (VALUES
    ('A1000001', 'Admin', 'Alex', 'admin'),
    ('L1000001', 'Lee', 'Lena', 'lecturer'),
    ('L1000002', 'Park', 'Omar', 'lecturer'),
    ('S1000001', 'Nguyen', 'Mia', 'student'), ('S1000002', 'Santos', 'Leo', 'student'),
    ('S1000003', 'Khan', 'Aisha', 'student'), ('S1000004', 'Brown', 'Noah', 'student'),
    ('S1000005', 'Tanaka', 'Yuki', 'student'), ('S1000006', 'Costa', 'Ana', 'student'),
    ('S1000007', 'Smith', 'Jack', 'student'), ('S1000008', 'Ali', 'Sara', 'student'),
    ('S1000009', 'Wong', 'Ethan', 'student'), ('S1000010', 'Rossi', 'Giulia', 'student')
  ) AS t(id, last_name, first_name, role_name) LOOP
    v_uid := gen_random_uuid();
    v_email := CASE WHEN r.id = 'A1000001' THEN 'sg@mailinator.com' ELSE lower(r.id) || '@mailinator.com' END;
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now());
    SELECT id INTO v_role FROM public.role WHERE name = r.role_name;
    INSERT INTO public.users (id, auth_user_id, email_parm_id, role_id, last_name, first_name, email)
    VALUES (r.id, v_uid, v_parm, v_role, r.last_name, r.first_name, v_email);
  END LOOP;

  INSERT INTO public.academic_period (name, start_date, finish_date, status) VALUES
    ('2026 Term 3', '2026-07-13', '2026-09-25', 'finished'),
    ('2026 Term 4', '2026-10-05', '2026-12-18', 'active'),
    ('2027 Term 1', '2027-02-01', '2027-04-10', 'planning');
  SELECT id INTO p3 FROM public.academic_period WHERE name = '2026 Term 3';
  SELECT id INTO p4 FROM public.academic_period WHERE name = '2026 Term 4';

  INSERT INTO public.class (name, description) VALUES
    ('Introduction to Programming', 'Core programming concepts using TypeScript.'),
    ('Database Systems', 'Relational modelling, SQL and PostgreSQL.'),
    ('Web Development', 'Building responsive web and mobile apps.'),
    ('Cultural Studies', 'Intercultural communication and community practice.');

  INSERT INTO public.location (name, qr_secret_seed) VALUES
    ('Room 1.01', extensions.gen_random_bytes(32)),
    ('Room 1.02', NULL),
    ('Room 2.05', NULL);
  INSERT INTO public.beacon (location_id, uuid, major, minor, rssi_calibrated)
    SELECT id, 'f7826da6-4fa2-4e98-8024-bc5b71e0893e', 1, 101, -59 FROM public.location WHERE name = 'Room 1.01';
  INSERT INTO public.nfc_tags (nfc_uid, location_id, payload_token)
    SELECT 'A1B2C3D4', id, encode(extensions.gen_random_bytes(16), 'hex') FROM public.location WHERE name = 'Room 1.01';

  -- Timetable. week_day: 1 = Monday ... 7 = Sunday. Frequency 1 = weekly.
  INSERT INTO public.class_schedule (class_id, academic_period_id, frequency_id, lecturer_id, location_id, start_time, end_time, week_day)
  SELECT c.id, per.id, (SELECT id FROM public.frequency WHERE name = 'weekly'), v.lecturer, l.id, v.st::time, v.et::time, v.wd
  FROM (VALUES
    ('Introduction to Programming', '2026 Term 3', 'L1000001', 'Room 1.01', '09:00', '11:00', 1),
    ('Introduction to Programming', '2026 Term 4', 'L1000001', 'Room 1.01', '09:00', '11:00', 1),
    ('Database Systems',            '2026 Term 4', 'L1000001', 'Room 2.05', '13:00', '15:00', 3),
    ('Web Development',             '2026 Term 4', 'L1000002', 'Room 1.02', '10:00', '12:00', 2),
    ('Cultural Studies',            '2026 Term 4', 'L1000002', 'Room 1.01', '09:00', '11:00', 5)
  ) AS v(cls, period, lecturer, loc, st, et, wd)
  JOIN public.class c ON c.name = v.cls
  JOIN public.academic_period per ON per.name = v.period
  JOIN public.location l ON l.name = v.loc;

  -- Enrolments (student number i = 1..10)
  INSERT INTO public.enrollment (user_id, class_schedule_id)
  SELECT u.id, s.id
  FROM public.users u
  JOIN public.class_schedule s ON true
  JOIN public.class c ON c.id = s.class_id
  JOIN public.academic_period per ON per.id = s.academic_period_id
  WHERE u.id LIKE 'S%'
    AND CASE
      WHEN per.name = '2026 Term 3' THEN right(u.id, 2)::int <= 6
      WHEN c.name = 'Introduction to Programming' THEN true
      WHEN c.name = 'Database Systems' THEN right(u.id, 2)::int <= 7
      WHEN c.name = 'Web Development' THEN right(u.id, 2)::int >= 4
      WHEN c.name = 'Cultural Studies' THEN right(u.id, 2)::int % 2 = 1
    END;

  -- Sessions: one per occurrence between period start and finish. Past dates are finished, others scheduled.
  INSERT INTO public.class_session (class_schedule_id, session_date, status)
  SELECT s.id, d::date, CASE WHEN d::date < today THEN 'finished'::public.session_status ELSE 'scheduled'::public.session_status END
  FROM public.class_schedule s
  JOIN public.academic_period per ON per.id = s.academic_period_id
  JOIN public.frequency f ON f.id = s.frequency_id
  CROSS JOIN LATERAL generate_series(
    (per.start_date + ((s.week_day - extract(isodow FROM per.start_date)::int + 7) % 7))::timestamp,
    per.finish_date::timestamp, f.interval_days * interval '1 day') AS d;

  -- Attendance for finished sessions (~70% present, 15% late, 15% absent), deterministic per student and session.
  INSERT INTO public.attendance (student_id, session_id, status, checked_in_at, check_in_method)
  SELECT x.student_id, x.session_id, x.st,
    CASE x.st WHEN 'absent' THEN NULL
      ELSE ((x.session_date + x.start_time) AT TIME ZONE tz)
           + CASE x.st WHEN 'present' THEN make_interval(mins => -(1 + x.h % 8)) ELSE make_interval(mins => 5 + x.h % 15) END
    END,
    CASE x.st WHEN 'absent' THEN NULL ELSE (ARRAY['beacon', 'nfc', 'qr'])[1 + x.h % 3]::public.check_in_method END
  FROM (
    SELECT e.user_id AS student_id, cs.id AS session_id, cs.session_date, s.start_time,
      abs(hashtext(e.user_id || cs.id::text)) % 100 AS h,
      CASE WHEN abs(hashtext(e.user_id || cs.id::text)) % 100 < 70 THEN 'present'
           WHEN abs(hashtext(e.user_id || cs.id::text)) % 100 < 85 THEN 'late'
           ELSE 'absent' END::public.attendance_status AS st
    FROM public.class_session cs
    JOIN public.class_schedule s ON s.id = cs.class_schedule_id
    JOIN public.enrollment e ON e.class_schedule_id = s.id
    WHERE cs.status = 'finished'
  ) x;

  -- One lecturer correction, so attendance_audit has a real "changed" entry.
  UPDATE public.attendance SET status = 'present', checked_in_at = checked_in_at,
    check_in_method = 'manual', comments = 'Marked present after the lecturer confirmed arrival', updated_by = 'L1000001'
  WHERE (student_id, session_id) = (SELECT a.student_id, a.session_id FROM public.attendance a WHERE a.status = 'late' ORDER BY a.session_id, a.student_id LIMIT 1);
END
$seed$;
