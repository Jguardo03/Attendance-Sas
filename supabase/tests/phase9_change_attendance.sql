-- Phase 9 checks: change_attendance (every rule), attendance_history and who may call them, on throwaway sessions that
-- are rolled back. The function always ends with an exception that carries the results. Expect every line PASS.
-- Needs the seed (schedule 5 is taught by L1000002 with S1000001 enrolled; schedule 1 by L1000001; S1000010 is not in
-- schedule 5) and should not be run within 15 minutes of midnight.
create or replace function pg_temp.claims_for(uid text) returns text language sql as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', u.auth_user_id::text, 'claims', jsonb_build_object('role','authenticated','sub',u.auth_user_id::text))) -> 'claims')::text
  from public.users u where u.id = uid $$;
create or replace function pg_temp.p9() returns void language plpgsql as $$
declare
  out text := ''; now_l timestamp := public.app_now(); today date := public.app_now()::date;
  s_fin int; s_live int; s_other int; s_future int; s_cancel int; r jsonb; before_n int; after_n int; n int; a record;
  live_time time := (public.app_now() - interval '3 minutes')::time;
begin
  -- finished (yesterday 08:00 to 09:00, schedule 5), live (started 5 minutes ago, schedule 5), another lecturer's live
  -- session (schedule 1), a future one and a cancelled one
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (5, today - 1, '08:00', '09:00') returning id into s_fin;
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (5, today, (now_l - interval '5 minutes')::time, (now_l + interval '55 minutes')::time) returning id into s_live;
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (1, today, (now_l - interval '5 minutes')::time, (now_l + interval '55 minutes')::time) returning id into s_other;
  insert into class_session(class_schedule_id, session_date, override_start_time, override_end_time)
    values (5, today + 1, '08:00', '09:00') returning id into s_future;
  insert into class_session(class_schedule_id, session_date, status) values (5, today + 2, 'cancelled') returning id into s_cancel;
  perform private.mark_absent_for_finished_sessions();

  -- the lecturer of schedule 5 changes absent to present on the finished session
  select present + late into before_n from public.student_class_attendance('S1000001', 5);
  perform set_config('request.jwt.claims', pg_temp.claims_for('L1000002'), true);
  r := public.change_attendance('S1000001', s_fin, 'present', null, 'Phone battery died');
  select * into a from attendance where student_id = 'S1000001' and session_id = s_fin;
  out := out || E'\n' || case when r ->> 'ok' = 'true' and a.status = 'present' and a.check_in_method = 'manual' and a.comments = 'Phone battery died' then 'PASS' else 'FAIL' end || ' absent to present: manual, reason saved: ' || r::text;
  out := out || E'\n' || case when a.updated_by = 'L1000002' then 'PASS' else 'FAIL' end || ' updated_by is the lecturer';
  out := out || E'\n' || case when (a.checked_in_at at time zone 'Australia/Melbourne')::time = '08:00' then 'PASS' else 'FAIL' end || ' time defaults to the session start';
  out := out || E'\n' || case when exists (select 1 from attendance_audit where student_id = 'S1000001' and session_id = s_fin and old_status = 'absent' and new_status = 'present' and changed_by = 'L1000002' and reason = 'Phone battery died') then 'PASS' else 'FAIL' end || ' the audit trigger recorded who, what and why';
  select present + late into after_n from public.student_class_attendance('S1000001', 5);
  out := out || E'\n' || case when after_n = before_n + 1 then 'PASS' else 'FAIL' end || ' the class percentage numbers recalculate (' || before_n || ' to ' || after_n || ' attended)';

  -- present to late keeps the existing time
  r := public.change_attendance('S1000001', s_fin, 'late', null, 'Arrived after the start');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and (select (checked_in_at at time zone 'Australia/Melbourne')::time from attendance where student_id = 'S1000001' and session_id = s_fin) = '08:00' then 'PASS' else 'FAIL' end || ' changing only the status keeps the time';
  r := public.change_attendance('S1000001', s_fin, 'late', null, 'Again');
  out := out || E'\n' || case when r ->> 'code' = 'no_change' then 'PASS' else 'FAIL' end || ' the same status again is refused as no_change';
  r := public.change_attendance('S1000001', s_fin, 'late', '08:20', 'Corrected the time');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and (select (checked_in_at at time zone 'Australia/Melbourne')::time from attendance where student_id = 'S1000001' and session_id = s_fin) = '08:20' then 'PASS' else 'FAIL' end || ' a given time is used';
  r := public.change_attendance('S1000001', s_fin, 'late', '09:30', 'Too late');
  out := out || E'\n' || case when r ->> 'code' = 'invalid_time' then 'PASS' else 'FAIL' end || ' a time after the end is refused';
  r := public.change_attendance('S1000001', s_fin, 'late', '07:00', 'Too early');
  out := out || E'\n' || case when r ->> 'code' = 'invalid_time' then 'PASS' else 'FAIL' end || ' a time before check in opened is refused';

  -- to absent nulls the time and method (no constraint violation)
  r := public.change_attendance('S1000001', s_fin, 'absent', null, 'Was not there');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and exists (select 1 from attendance where student_id = 'S1000001' and session_id = s_fin and status = 'absent' and checked_in_at is null and check_in_method is null) then 'PASS' else 'FAIL' end || ' changing to absent nulls the time and method';

  -- the reason is required
  r := public.change_attendance('S1000001', s_fin, 'present', null, '');
  out := out || E'\n' || case when r ->> 'code' = 'reason_required' then 'PASS' else 'FAIL' end || ' an empty reason is refused';
  r := public.change_attendance('S1000001', s_fin, 'present', null, '   ');
  out := out || E'\n' || case when r ->> 'code' = 'reason_required' then 'PASS' else 'FAIL' end || ' a blank reason is refused';
  r := public.change_attendance('S1000001', s_fin, 'present', null, repeat('x', 501));
  out := out || E'\n' || case when r ->> 'code' = 'reason_too_long' then 'PASS' else 'FAIL' end || ' a reason over 500 characters is refused';
  out := out || E'\n' || case when (select status from attendance where student_id = 'S1000001' and session_id = s_fin) = 'absent' then 'PASS' else 'FAIL' end || ' refused changes wrote nothing';

  -- manual check in on a live session with no row yet
  r := public.change_attendance('S1000001', s_live, 'present', live_time, 'Scanner would not read the code');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and r -> 'previous_status' = 'null'::jsonb and exists (select 1 from attendance where student_id = 'S1000001' and session_id = s_live and status = 'present' and check_in_method = 'manual' and created_by = 'L1000002' and updated_by = 'L1000002') then 'PASS' else 'FAIL' end || ' manual check in creates the row (creator and updater are the lecturer)';

  -- sessions that cannot be edited
  r := public.change_attendance('S1000001', s_future, 'present', null, 'Early');
  out := out || E'\n' || case when r ->> 'code' = 'not_editable' then 'PASS' else 'FAIL' end || ' an upcoming session is not editable';
  r := public.change_attendance('S1000001', s_cancel, 'present', null, 'Cancelled');
  out := out || E'\n' || case when r ->> 'code' = 'cancelled' then 'PASS' else 'FAIL' end || ' a cancelled session is refused';
  r := public.change_attendance('S1000010', s_live, 'present', null, 'Not in this class');
  out := out || E'\n' || case when r ->> 'code' = 'not_enrolled' then 'PASS' else 'FAIL' end || ' a student who is not enrolled is refused';
  r := public.change_attendance('S1000001', 99999999, 'present', null, 'Nothing here');
  out := out || E'\n' || case when r ->> 'code' = 'not_allowed' then 'PASS' else 'FAIL' end || ' an unknown session is not_allowed for a lecturer (existence is not revealed)';

  -- another lecturer's session
  r := public.change_attendance('S1000001', s_other, 'present', null, 'Not my class');
  out := out || E'\n' || case when r ->> 'code' = 'not_allowed' then 'PASS' else 'FAIL' end || ' a lecturer cannot edit another lecturer''s session';
  perform set_config('request.jwt.claims', pg_temp.claims_for('A1000001'), true);
  r := public.change_attendance('S1000001', s_other, 'present', null, 'Admin correction');
  out := out || E'\n' || case when r ->> 'ok' = 'true' and exists (select 1 from attendance where student_id = 'S1000001' and session_id = s_other and updated_by = 'A1000001') then 'PASS' else 'FAIL' end || ' an admin (attendance.edit_all) can edit any session';
  perform set_config('request.jwt.claims', pg_temp.claims_for('S1000001'), true);
  r := public.change_attendance('S1000001', s_live, 'late', null, 'Let me fix my own');
  out := out || E'\n' || case when r ->> 'code' = 'not_allowed' then 'PASS' else 'FAIL' end || ' a student cannot change attendance';

  -- history: visible to the session's lecturer and the admin, with names; nothing for another lecturer or a student
  perform set_config('request.jwt.claims', pg_temp.claims_for('L1000002'), true);
  select count(*) into n from public.attendance_history('S1000001', s_fin);
  out := out || E'\n' || case when n >= 4 and (select changed_by_name from public.attendance_history('S1000001', s_fin) limit 1) is not null then 'PASS' else 'FAIL' end || ' the lecturer sees the record''s history with names (' || n || ' rows)';
  out := out || E'\n' || case when (select count(*) from public.attendance_history('S1000001', s_fin) where changed_by is null) = 1 and (select changed_by_name is null from public.attendance_history('S1000001', s_fin) where changed_by is null) then 'PASS' else 'FAIL' end || ' the system''s absent row has no name';
  perform set_config('request.jwt.claims', pg_temp.claims_for('L1000001'), true);
  out := out || E'\n' || case when (select count(*) from public.attendance_history('S1000001', s_fin)) = 0 then 'PASS' else 'FAIL' end || ' another lecturer sees no history';
  perform set_config('request.jwt.claims', pg_temp.claims_for('S1000001'), true);
  out := out || E'\n' || case when (select count(*) from public.attendance_history('S1000001', s_fin)) = 0 then 'PASS' else 'FAIL' end || ' a student sees no history';

  -- who may call it at all
  begin
    set local role anon;
    perform public.change_attendance('S1000001', s_live, 'present', null, 'x');
    reset role;
    out := out || E'\nFAIL anon could call change_attendance';
  exception when insufficient_privilege then
    reset role;
    out := out || E'\nPASS anon cannot call change_attendance';
  end;
  raise exception 'RESULTS%', out;
end $$;
select pg_temp.p9();
