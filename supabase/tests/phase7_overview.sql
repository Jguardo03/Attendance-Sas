-- Phase 7 checks: effective status, what each role sees, attendance numbers, attendee names, admin counts.
-- Read-only; it ends with an exception that carries the results so nothing is kept. Compare each line with its
-- "expected" text (the numbers depend on the seed and today's date). Run with execute_sql as the postgres role.
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
create or replace function pg_temp.p7() returns void language plpgsql as $$
declare out text := ''; r text;
begin
  out := out || E'\nnow_local=' || public.app_now();
  out := out || E'\nstatus counts (admin view): ' || (select string_agg(status || '=' || n, ', ' order by status) from (select status, count(*) n from public.session_overview group by status) x);
  out := out || E'\nstored scheduled but past (should show finished): ' || (select count(*) from public.class_session cs join public.session_overview so on so.session_id = cs.id where cs.status = 'scheduled' and so.status = 'finished');
  r := pg_temp.try('S1000001', 'select count(*) from public.session_overview');
  out := out || E'\nS1000001 sees ' || r || ' sessions; expected ' || (select count(*) from public.class_session where class_schedule_id in (select class_schedule_id from public.enrollment where user_id = 'S1000001'));
  r := pg_temp.try('S1000007', 'select count(*) from public.session_overview where schedule_id = 1');
  out := out || E'\nS1000007 (not in schedule 1) sees ' || r || ' of its sessions (expect 0)';
  r := pg_temp.try('S1000001', 'select count(*) from (select distinct session_id from public.session_overview) x');
  out := out || E'\nS1000001 distinct sessions ' || r || ' (equals the total above: each listed once)';
  r := pg_temp.try('S1000001', $q$ select attendance_pct::text || ' / ' || present || 'p ' || late || 'l ' || absent || 'a of ' || finished_sessions from public.student_attendance_overview('S1000001') where schedule_id = 1 $q$);
  out := out || E'\nS1000001 schedule 1 overview: ' || r;
  r := pg_temp.try('S1000001', $q$ select attendance_pct::text || ' / ' || present || 'p ' || late || 'l ' || absent || 'a of ' || finished_sessions from public.student_class_attendance('S1000001', 1) $q$);
  out := out || E'\nS1000001 schedule 1 single (must equal the line above): ' || r;
  r := pg_temp.try('S1000001', 'select count(*) from public.session_attendees((select min(session_id) from public.session_overview where schedule_id = 1))');
  out := out || E'\nattendee names for an enrolled student: ' || r || ' (expect ' || (select count(*) from public.enrollment where class_schedule_id = 1) || ')';
  r := pg_temp.try('S1000007', 'select count(*) from public.session_attendees((select min(id) from public.class_session where class_schedule_id = 1))');
  out := out || E'\nattendee names for a student not in the class: ' || r || ' (expect 0)';
  r := pg_temp.try('L1000001', 'select count(*) from public.session_overview');
  out := out || E'\nL1000001 (lecturer) sees ' || r || ' sessions; expected ' || (select count(*) from public.class_session cs join public.class_schedule s on s.id = cs.class_schedule_id where s.lecturer_id = 'L1000001');
  r := pg_temp.try('A1000001', 'select concat_ws('' '', sessions_today, live_now, upcoming, finished, rescheduled_or_cancelled) from public.admin_today_counts()');
  out := out || E'\nadmin_today_counts (today live upcoming finished resch/canc): ' || r;
  out := out || E'\nraw today count (must equal the first number): ' || (select count(*) from public.class_session where session_date = public.app_now()::date);
  raise exception 'RESULTS%', out;
end $$;
select pg_temp.p7();
