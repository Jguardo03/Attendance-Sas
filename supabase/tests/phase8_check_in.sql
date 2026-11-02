-- Phase 8 checks: record_check_in (every rule) and the no-show function, on throwaway sessions that are rolled back.
-- Read-only in effect: the function always ends with an exception that carries the results. Expect every line PASS.
-- Needs the seed (S1000001 enrolled in schedules 1, 2, 3 and 5) and should not be run within 15 minutes of midnight.
create or replace function pg_temp.claims_for(uid text) returns text language sql as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', u.auth_user_id::text, 'claims', jsonb_build_object('role','authenticated','sub',u.auth_user_id::text))) -> 'claims')::text
  from public.users u where u.id = uid $$;
create or replace function pg_temp.p8() returns void language plpgsql as $$
declare
  out text := ''; now_l timestamp := public.app_now(); today date := public.app_now()::date;
  s_present int; s_late int; s_notopen int; s_closed int; s_cancel int; r jsonb; n int; enrolled int;
begin
  -- present: starts in 5 minutes, so check in opened 5 minutes ago and it is before the start
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (5, today, (now_l + interval '5 minutes')::time, (now_l + interval '65 minutes')::time) returning id into s_present;
  -- late: started 5 minutes ago
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (3, today, (now_l - interval '5 minutes')::time, (now_l + interval '55 minutes')::time) returning id into s_late;
  -- not open yet: starts in 30 minutes, opens in 20
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (1, today, (now_l + interval '30 minutes')::time, (now_l + interval '90 minutes')::time) returning id into s_notopen;
  -- closed: ended an hour ago, yesterday
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (5, today - 1, '08:00', '09:00') returning id into s_closed;
  -- cancelled
  insert into class_session(class_schedule_id, session_date, status) values (5, today + 1, 'cancelled') returning id into s_cancel;

  r := public.record_check_in('S1000001', s_present, 'qr');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and r ->> 'status' = 'present' then 'PASS' else 'FAIL' end || ' before the start: present: ' || r::text;
  out := out || E'\n' || case when (select created_by from attendance where student_id = 'S1000001' and session_id = s_present) = 'S1000001' and (select check_in_method from attendance where student_id = 'S1000001' and session_id = s_present) = 'qr' then 'PASS' else 'FAIL' end || ' row stores the student as creator and method qr';
  out := out || E'\n' || case when exists (select 1 from attendance_audit where student_id = 'S1000001' and session_id = s_present and new_status = 'present' and changed_by = 'S1000001') then 'PASS' else 'FAIL' end || ' the audit history recorded it';
  r := public.record_check_in('S1000001', s_present, 'qr');
  out := out || E'\n' || case when r ->> 'code' = 'already_checked_in' and r ->> 'status' = 'present' then 'PASS' else 'FAIL' end || ' second check in is refused: ' || (r ->> 'code');
  r := public.record_check_in('S1000001', s_late, 'qr');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and r ->> 'status' = 'late' then 'PASS' else 'FAIL' end || ' after the start: late: ' || (r ->> 'status');
  r := public.record_check_in('S1000001', s_notopen, 'qr');
  out := out || E'\n' || case when r ->> 'code' = 'not_open' and r ->> 'opens_at' is not null then 'PASS' else 'FAIL' end || ' too early: not_open, opens at ' || coalesce(r ->> 'opens_at', '?');
  r := public.record_check_in('S1000001', s_closed, 'qr');
  out := out || E'\n' || case when r ->> 'code' = 'closed' then 'PASS' else 'FAIL' end || ' after the end: closed';
  r := public.record_check_in('S1000001', s_cancel, 'qr');
  out := out || E'\n' || case when r ->> 'code' = 'cancelled' then 'PASS' else 'FAIL' end || ' cancelled session refused';
  r := public.record_check_in('S1000010', s_present, 'qr');
  out := out || E'\n' || case when r ->> 'code' = 'not_enrolled' then 'PASS' else 'FAIL' end || ' a student not in the class is refused';
  r := public.record_check_in('S1000001', 99999999, 'qr');
  out := out || E'\n' || case when r ->> 'code' = 'session_not_found' then 'PASS' else 'FAIL' end || ' unknown session';
  out := out || E'\n' || case when (select count(*) from attendance where session_id in (s_notopen, s_closed, s_cancel)) = 0 then 'PASS' else 'FAIL' end || ' refused attempts wrote nothing';

  -- no-shows
  enrolled := (select count(*) from enrollment where class_schedule_id = 5);
  n := private.mark_absent_for_finished_sessions();
  out := out || E'\n' || case when (select count(*) from attendance where session_id = s_closed and status = 'absent') = enrolled then 'PASS' else 'FAIL' end || ' finished session: every enrolled student without a row is absent (' || enrolled || ')';
  out := out || E'\n' || case when (select count(*) from attendance where session_id = s_closed and created_by is null) = enrolled then 'PASS' else 'FAIL' end || ' absent rows are made by the system (no creator)';
  out := out || E'\n' || case when (select count(*) from attendance where session_id in (s_present, s_late, s_notopen, s_cancel) and status = 'absent') = 0 then 'PASS' else 'FAIL' end || ' live, upcoming and cancelled sessions get no absent rows';
  out := out || E'\n' || case when private.mark_absent_for_finished_sessions() = 0 then 'PASS' else 'FAIL' end || ' running it again adds nothing';
  out := out || E'\n' || case when (select status from attendance where student_id = 'S1000001' and session_id = s_present) = 'present' then 'PASS' else 'FAIL' end || ' a real check in is never overwritten';
  out := out || E'\n' || case when (select count(*) from attendance where checked_in_at is not null and status = 'absent') = 0 then 'PASS' else 'FAIL' end || ' absent rows satisfy the check in rule';

  -- who may call it
  perform set_config('request.jwt.claims', pg_temp.claims_for('S1000001'), true);
  set local role authenticated;
  begin
    perform public.record_check_in('S1000001', s_present, 'qr');
    reset role;
    out := out || E'\nFAIL a signed-in student could call record_check_in';
  exception when insufficient_privilege then
    reset role;
    out := out || E'\nPASS a signed-in student cannot call record_check_in (server only)';
  end;
  raise exception 'RESULTS%', out;
end $$;
select pg_temp.p8();
