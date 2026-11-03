-- Phase 10 checks: the report functions against independent SQL on the raw tables, who sees what, and speed on about
-- 10,000 generated attendance rows. Everything is rolled back: the function always ends with an exception that carries
-- the results. Expect every line PASS. Needs the seed data and should not be run within 15 minutes of midnight.
create or replace function pg_temp.claims_for(uid text) returns text language sql as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', u.auth_user_id::text, 'claims', jsonb_build_object('role','authenticated','sub',u.auth_user_id::text))) -> 'claims')::text
  from public.users u where u.id = uid $$;
create or replace function pg_temp.p10() returns void language plpgsql as $$
declare
  out text := ''; n int; bad int; rows_made int; t0 timestamptz; ms numeric; periods int; one_period int; one_lecturer text;
begin
  -- Independent numbers straight from the raw tables (no views): a session is finished when its end is past and it is
  -- not cancelled; no attendance row for a finished session means absent.
  create temp table raw_fs on commit drop as
    select cs.id as session_id, cs.class_schedule_id as schedule_id
    from class_session cs join class_schedule s on s.id = cs.class_schedule_id
    where cs.status <> 'cancelled' and cs.session_date + coalesce(cs.override_end_time, s.end_time) <= public.app_now();
  create temp table raw_student on commit drop as
    select e.user_id as student_id, e.class_schedule_id as schedule_id,
           (select count(*) from raw_fs f where f.schedule_id = e.class_schedule_id) as fin,
           (select count(*) from attendance a join raw_fs f on f.session_id = a.session_id where f.schedule_id = e.class_schedule_id and a.student_id = e.user_id and a.status = 'present') as present,
           (select count(*) from attendance a join raw_fs f on f.session_id = a.session_id where f.schedule_id = e.class_schedule_id and a.student_id = e.user_id and a.status = 'late') as late
    from enrollment e;

  -- as an admin
  perform set_config('request.jwt.claims', pg_temp.claims_for('A1000001'), true);
  set local role authenticated;
  create temp table rep_student on commit drop as select * from public.report_student_classes();
  create temp table rep_class on commit drop as select * from public.report_classes();
  create temp table rep_lect on commit drop as select * from public.report_lecturers();
  reset role;

  select count(*) into n from raw_student;
  out := out || E'\n' || case when (select count(*) from rep_student) = n then 'PASS' else 'FAIL' end || ' one row per enrolled student per class (' || n || ')';
  select count(*) into bad from rep_student r join raw_student w on w.student_id = r.student_id and w.schedule_id = r.schedule_id
    where r.finished_sessions <> w.fin or r.present <> w.present or r.late <> w.late or r.absent <> w.fin - w.present - w.late
       or r.attendance_pct is distinct from (case when w.fin = 0 then null else round(100.0 * (w.present + w.late) / w.fin, 1) end);
  out := out || E'\n' || case when bad = 0 then 'PASS' else 'FAIL' end || ' every student row matches the raw tables (' || bad || ' differ)';

  select count(*) into bad from rep_class c
    where c.enrolled <> (select count(*) from enrollment e where e.class_schedule_id = c.schedule_id)
       or c.finished_sessions <> (select count(*) from raw_fs f where f.schedule_id = c.schedule_id)
       or c.class_average_pct is distinct from (select round(avg(case when w.fin = 0 then null else 100.0 * (w.present + w.late) / w.fin end)::numeric, 1)
            from raw_student w where w.schedule_id = c.schedule_id)
       or c.students_below_75 <> (select count(*) from raw_student w where w.schedule_id = c.schedule_id and w.fin > 0 and 100.0 * (w.present + w.late) / w.fin < 75);
  out := out || E'\n' || case when bad = 0 then 'PASS' else 'FAIL' end || ' every class row matches (enrolled, sessions held, average, below 75%): ' || bad || ' differ';
  out := out || E'\n' || case when (select count(*) from rep_class) = (select count(*) from class_schedule) then 'PASS' else 'FAIL' end || ' every class is listed, even with no students';

  select count(*) into bad from rep_lect l
    where l.sessions_held <> (select count(*) from raw_fs f join class_schedule s on s.id = f.schedule_id where s.lecturer_id = l.lecturer_id)
       or l.classes <> (select count(*) from class_schedule s where s.lecturer_id = l.lecturer_id)
       or l.average_attendance_pct is distinct from (
            select case when sum(en.c) = 0 then null else round(100.0 * sum(att.c) / sum(en.c), 1) end
            from raw_fs f join class_schedule s on s.id = f.schedule_id
            cross join lateral (select count(*) c from enrollment e where e.class_schedule_id = f.schedule_id) en
            cross join lateral (select count(*) c from attendance a where a.session_id = f.session_id and a.status in ('present', 'late')) att
            where s.lecturer_id = l.lecturer_id);
  out := out || E'\n' || case when bad = 0 then 'PASS' else 'FAIL' end || ' every lecturer row matches (classes, sessions held, average): ' || bad || ' differ';

  -- filters
  select count(distinct academic_period_id) into periods from schedule_overview;
  select academic_period_id into one_period from schedule_overview group by 1 order by count(*) desc limit 1;
  select lecturer_id into one_lecturer from schedule_overview group by 1 order by 1 limit 1;
  perform set_config('request.jwt.claims', pg_temp.claims_for('A1000001'), true);
  set local role authenticated;
  select count(*) into n from public.report_classes(one_period);
  select count(*) into bad from public.report_classes(one_period) where period_name <> (select name from academic_period where id = one_period);
  reset role;
  out := out || E'\n' || case when n = (select count(*) from schedule_overview where academic_period_id = one_period) and bad = 0 then 'PASS' else 'FAIL' end || ' the period filter keeps only that period''s classes (' || n || ')';
  set local role authenticated;
  select count(*) into bad from public.report_student_classes(null, null, one_lecturer) where lecturer_id <> one_lecturer;
  select count(*) into n from public.report_lecturers(null, null, one_lecturer);
  reset role;
  out := out || E'\n' || case when bad = 0 and n = 1 then 'PASS' else 'FAIL' end || ' the lecturer filter keeps only that lecturer';

  -- who sees what: a lecturer only their own classes, a student only themselves, anon nothing
  perform set_config('request.jwt.claims', pg_temp.claims_for('L1000002'), true);
  set local role authenticated;
  select count(*) into bad from public.report_classes() where lecturer_id <> 'L1000002';
  select count(*) into n from public.report_classes();
  reset role;
  out := out || E'\n' || case when bad = 0 and n > 0 and n < (select count(*) from class_schedule) then 'PASS' else 'FAIL' end || ' a lecturer sees only their own classes (' || n || ')';
  perform set_config('request.jwt.claims', pg_temp.claims_for('S1000001'), true);
  set local role authenticated;
  select count(*) into bad from public.report_student_classes() where student_id <> 'S1000001';
  select count(*) into n from public.report_student_classes();
  reset role;
  out := out || E'\n' || case when bad = 0 and n > 0 then 'PASS' else 'FAIL' end || ' a student sees only their own rows (' || n || ')';
  begin
    set local role anon;
    perform public.report_classes();
    reset role;
    out := out || E'\nFAIL anon could call a report';
  exception when insufficient_privilege then
    reset role;
    out := out || E'\nPASS anon cannot call a report';
  end;

  -- speed: about 10,000 finished-session attendance rows on top of the seed, read as an admin (row level security on)
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    select s.id, current_date - 1000 - g, '08:00', '09:00' from class_schedule s cross join generate_series(1, 300) g;
  insert into attendance(student_id, session_id, status, checked_in_at, check_in_method)
    select e.user_id, cs.id, case when (cs.id + length(e.user_id) * 7 + e.id) % 5 = 0 then 'late'::attendance_status else 'present'::attendance_status end,
           (cs.session_date + time '08:05') at time zone 'Australia/Melbourne', 'qr'
    from class_session cs join enrollment e on e.class_schedule_id = cs.class_schedule_id
    where cs.session_date < current_date - 1000 and (cs.id + e.id) % 9 <> 0;
  get diagnostics rows_made = row_count;
  out := out || E'\nINFO generated ' || rows_made || ' attendance rows (' || (select count(*) from attendance) || ' in total)';

  perform set_config('request.jwt.claims', pg_temp.claims_for('A1000001'), true);
  set local role authenticated;
  t0 := clock_timestamp(); select count(*) into n from public.report_student_classes(); ms := extract(epoch from clock_timestamp() - t0) * 1000;
  out := out || E'\n' || case when ms < 3000 then 'PASS' else 'FAIL' end || ' by student: ' || n || ' rows in ' || round(ms) || ' ms (limit 3000)';
  t0 := clock_timestamp(); select count(*) into n from public.report_classes(); ms := extract(epoch from clock_timestamp() - t0) * 1000;
  out := out || E'\n' || case when ms < 3000 then 'PASS' else 'FAIL' end || ' by class: ' || n || ' rows in ' || round(ms) || ' ms (limit 3000)';
  t0 := clock_timestamp(); select count(*) into n from public.report_lecturers(); ms := extract(epoch from clock_timestamp() - t0) * 1000;
  out := out || E'\n' || case when ms < 3000 then 'PASS' else 'FAIL' end || ' by lecturer: ' || n || ' rows in ' || round(ms) || ' ms (limit 3000)';
  reset role;
  raise exception 'RESULTS%', out;
end $$;
select pg_temp.p10();
