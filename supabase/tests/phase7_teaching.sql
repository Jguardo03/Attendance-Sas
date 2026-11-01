-- Phase 7 step 7b checks: the lecturer and admin attendance functions, per role. Read-only; the run ends with an
-- exception that carries the results. Expect every line to read PASS.
create or replace function pg_temp.claims_for(uid text) returns text language sql as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', u.auth_user_id::text, 'claims', jsonb_build_object('role','authenticated','sub',u.auth_user_id::text))) -> 'claims')::text
  from public.users u where u.id = uid $$;
create or replace function pg_temp.try(uid text, q text) returns text language plpgsql as $$
declare res text;
begin
  begin
    perform set_config('request.jwt.claims', coalesce(pg_temp.claims_for(uid), ''), true);
    set local role authenticated;
    execute q into res;
    reset role;
    return coalesce(res, 'null');
  exception when others then
    reset role;
    return 'ERR:' || sqlstate || ' ' || left(sqlerrm, 80);
  end;
end $$;
create or replace function pg_temp.p7b() returns void language plpgsql as $$
declare out text := ''; r text; e text; sid int;
begin
  select min(session_id) into sid from public.session_overview where schedule_id = 1 and status = 'finished';
  r := pg_temp.try('A1000001', 'select count(*) from public.class_student_attendance(1)');
  e := (select count(*) from public.enrollment where class_schedule_id = 1);
  out := out || E'\n' || case when r = e then 'PASS' else 'FAIL' end || ' admin: every enrolled student listed: ' || r || ' (expect ' || e || ')';
  r := pg_temp.try('A1000001', $q$ select attendance_pct || '/' || present || 'p' || late || 'l' || absent || 'a of ' || finished_sessions from public.class_student_attendance(1) where student_id = 'S1000001' $q$);
  out := out || E'\n' || case when r = '81.8/7p2l2a of 11' then 'PASS' else 'FAIL' end || ' admin: S1000001 numbers match the single-student function: ' || r;
  r := pg_temp.try('L1000001', 'select count(*) from public.class_student_attendance(1)');
  out := out || E'\n' || case when r = e then 'PASS' else 'FAIL' end || ' lecturer who teaches it sees all: ' || r;
  r := pg_temp.try('L1000002', 'select count(*) from public.class_student_attendance(1)');
  out := out || E'\n' || case when r = '0' then 'PASS' else 'FAIL' end || ' another lecturer sees none of it: ' || r;
  r := pg_temp.try('S1000001', 'select count(*) from public.class_student_attendance(1)');
  out := out || E'\n' || case when r = '1' then 'PASS' else 'FAIL' end || ' a student sees only themselves: ' || r;
  r := pg_temp.try('L1000001', format('select count(*) from public.session_attendance_list(%s)', sid));
  out := out || E'\n' || case when r = e then 'PASS' else 'FAIL' end || ' session list has every enrolled student: ' || r;
  r := pg_temp.try('L1000001', format('select count(*) from public.session_attendance_list(%s) where status in (''present'',''late'')', sid));
  out := out || E'\n' || case when r = (select count(*) from public.attendance where session_id = sid and status in ('present','late'))::text then 'PASS' else 'FAIL' end || ' session list attended count equals the attendance table: ' || r;
  r := pg_temp.try('L1000002', format('select count(*) from public.session_attendance_list(%s)', sid));
  out := out || E'\n' || case when r = '0' then 'PASS' else 'FAIL' end || ' another lecturer gets an empty session list: ' || r;
  r := pg_temp.try('A1000001', 'select count(*) from public.session_attendance_counts(public.app_now()::date, public.app_now()::date)');
  out := out || E'\n' || case when r = (select count(*) from public.class_session where session_date = public.app_now()::date)::text then 'PASS' else 'FAIL' end || ' counts: one row per session today: ' || r;
  r := pg_temp.try('A1000001', format('select enrolled || ''/'' || present || ''/'' || late from public.session_attendance_counts((select session_date from public.class_session where id = %s), (select session_date from public.class_session where id = %s)) where session_id = %s', sid, sid, sid));
  out := out || E'\n' || case when r = (select (select count(*) from public.enrollment where class_schedule_id = 1) || '/' || count(*) filter (where status = 'present') || '/' || count(*) filter (where status = 'late') from public.attendance where session_id = sid) then 'PASS' else 'FAIL' end || ' counts for a finished session equal the table: ' || r;
  r := pg_temp.try('L1000002', 'select count(*) from public.session_attendance_counts(''2026-07-01'', ''2026-12-31'') where session_id in (select id from public.class_session where class_schedule_id = 1)');
  out := out || E'\n' || case when r = '0' then 'PASS' else 'FAIL' end || ' another lecturer sees no counts for it: ' || r;
  raise exception 'RESULTS%', out;
end $$;
select pg_temp.p7b();
