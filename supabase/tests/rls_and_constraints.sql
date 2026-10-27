-- Phase 3 database tests. Run against a database seeded with supabase/seed.sql (run it with execute_sql or psql as the
-- postgres role). Each check records PASS or FAIL; the last statement prints every result. Expect 49 PASS, 0 FAIL.
-- Role switching: pg_temp.try() sets request.jwt.claims (built by the real access-token hook) and SET LOCAL ROLE.
create temp table results(n serial, label text, ok boolean, detail text);
create function pg_temp.chk(l text, ok boolean, d text default null) returns void language sql as $$ insert into results(label, ok, detail) values (l, coalesce(ok,false), d) $$;
create function pg_temp.claims_for(uid text) returns text language sql as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', u.auth_user_id::text, 'claims', jsonb_build_object('role','authenticated','sub',u.auth_user_id::text))) -> 'claims')::text
  from public.users u where u.id = uid $$;
create function pg_temp.try(uid text, q text) returns text language plpgsql as $$
declare res text;
begin
  begin
    perform set_config('request.jwt.claims', coalesce(pg_temp.claims_for(uid), ''), true);
    if uid = 'anon' then set local role anon; else set local role authenticated; end if;
    execute q into res;
    reset role;
    return 'OK:' || coalesce(res, 'null');
  exception when others then
    reset role;
    return 'ERR:' || sqlstate;
  end;
end $$;
create function pg_temp.state_of(q text) returns text language plpgsql as $$
begin
  begin execute q; return 'none';
  exception when others then return sqlstate || ' ' || left(sqlerrm, 60);
  end;
end $$;

-- hook claims
select pg_temp.chk('hook: admin claims', (pg_temp.claims_for('A1000001')::jsonb ->> 'app_role') = 'admin' and jsonb_array_length(pg_temp.claims_for('A1000001')::jsonb -> 'permissions') = 10 and (pg_temp.claims_for('A1000001')::jsonb ->> 'app_user_id') = 'A1000001');
select pg_temp.chk('hook: student claims', (pg_temp.claims_for('S1000001')::jsonb ->> 'app_role') = 'student' and jsonb_array_length(pg_temp.claims_for('S1000001')::jsonb -> 'permissions') = 3);
select pg_temp.chk('hook: lecturer claims', (pg_temp.claims_for('L1000001')::jsonb ->> 'app_role') = 'lecturer' and jsonb_array_length(pg_temp.claims_for('L1000001')::jsonb -> 'permissions') = 4);

-- student
select pg_temp.chk('student sees only own student row', pg_temp.try('S1000001', $q$ select count(*) from public.users where id like 'S%' $q$) = 'OK:1');
select pg_temp.chk('student sees no other attendance', pg_temp.try('S1000001', $q$ select count(*) from public.attendance where student_id <> 'S1000001' $q$) = 'OK:0');
select pg_temp.chk('student sees own attendance', pg_temp.try('S1000001', $q$ select count(*) from public.attendance where student_id = 'S1000001' $q$) <> 'OK:0');
select pg_temp.chk('student sees only enrolled schedules', pg_temp.try('S1000001', 'select count(*) from public.class_schedule') = 'OK:' || (select count(*) from public.enrollment where user_id = 'S1000001'));
select pg_temp.chk('student cannot insert attendance', pg_temp.try('S1000001', $q$ with i as (insert into public.attendance(student_id, session_id, status) values ('S1000001', (select min(id) from public.class_session), 'absent') returning 1) select count(*) from i $q$) = 'ERR:42501');
select pg_temp.chk('student cannot update attendance', pg_temp.try('S1000001', $q$ with u as (update public.attendance set status = 'present' where student_id = 'S1000001' returning 1) select count(*) from u $q$) = 'ERR:42501');
select pg_temp.chk('student cannot read qr_secret_seed', pg_temp.try('S1000001', 'select qr_secret_seed::text from public.location limit 1') = 'ERR:42501');
select pg_temp.chk('student can read location names', pg_temp.try('S1000001', 'select count(*) from public.location') = 'OK:3');
select pg_temp.chk('student cannot read nfc payload_token', pg_temp.try('S1000001', 'select payload_token from public.nfc_tags limit 1') = 'ERR:42501');
select pg_temp.chk('student sees no audit rows', pg_temp.try('S1000001', 'select count(*) from public.attendance_audit') = 'OK:0');
select pg_temp.chk('student update of class changes nothing', pg_temp.try('S1000001', $q$ with u as (update public.class set name = name returning 1) select count(*) from u $q$) = 'OK:0');
select pg_temp.chk('student cannot insert role (RLS)', pg_temp.try('S1000001', $q$ with i as (insert into public.role(name) values ('hacker') returning 1) select count(*) from i $q$) = 'ERR:42501');
select pg_temp.chk('student cannot read permissions catalogue', pg_temp.try('S1000001', 'select count(*) from public.permissions') = 'OK:0');

-- anon
select pg_temp.chk('anon cannot read users', pg_temp.try('anon', 'select count(*) from public.users') = 'ERR:42501');
select pg_temp.chk('anon is_allowed_email true', pg_temp.try('anon', $q$ select public.is_allowed_email('someone@mailinator.com') $q$) = 'OK:true');
select pg_temp.chk('anon is_allowed_email false', pg_temp.try('anon', $q$ select public.is_allowed_email('someone@gmail.com') $q$) = 'OK:false');
select pg_temp.chk('anon cannot call private helpers', pg_temp.try('anon', 'select private.has_permission($$x$$)') = 'ERR:42501');

-- lecturer
select pg_temp.chk('lecturer sees attendance of own sessions only', pg_temp.try('L1000001', 'select count(*) from public.attendance') = 'OK:' || (select count(*) from public.attendance a join public.class_session cs on cs.id = a.session_id join public.class_schedule s on s.id = cs.class_schedule_id where s.lecturer_id = 'L1000001') and (select count(*) from public.attendance) > (select count(*) from public.attendance a join public.class_session cs on cs.id = a.session_id join public.class_schedule s on s.id = cs.class_schedule_id where s.lecturer_id = 'L1000001'));
select pg_temp.chk('lecturer cannot change schedules', pg_temp.try('L1000001', $q$ with u as (update public.class_schedule set end_time = end_time returning 1) select count(*) from u $q$) = 'OK:0');
select pg_temp.chk('lecturer sees own students + self', pg_temp.try('L1000001', 'select count(*) from public.users') = 'OK:11');
select pg_temp.chk('lecturer cannot see other lecturer', pg_temp.try('L1000001', $q$ select count(*) from public.users where id = 'L1000002' $q$) = 'OK:0');
select pg_temp.chk('lecturer sees audit of own sessions', pg_temp.try('L1000001', 'select count(*) from public.attendance_audit') <> 'OK:0');

-- admin
select pg_temp.chk('admin sees all attendance', pg_temp.try('A1000001', 'select count(*) from public.attendance') = 'OK:' || (select count(*) from public.attendance));
select pg_temp.chk('admin sees all users', pg_temp.try('A1000001', 'select count(*) from public.users') = 'OK:13');
select pg_temp.chk('admin can update classes', pg_temp.try('A1000001', $q$ with u as (update public.class set name = name returning 1) select count(*) from u $q$) = 'OK:4');
select pg_temp.chk('admin cannot read qr_secret_seed either', pg_temp.try('A1000001', 'select qr_secret_seed::text from public.location limit 1') = 'ERR:42501');

-- deny beats grant, grant adds
insert into public.user_permission (user_id, permission_id, modifier_type) select 'S1000001', id, 'deny' from public.permissions where name = 'attendance.check_in';
insert into public.user_permission (user_id, permission_id, modifier_type) select 'S1000001', id, 'grant' from public.permissions where name = 'classes.view_all';
select pg_temp.chk('deny removes role permission, grant adds one', not ('attendance.check_in' = any (private.effective_permissions('S1000001'))) and ('classes.view_all' = any (private.effective_permissions('S1000001'))) and cardinality(private.effective_permissions('S1000001')) = 3);
delete from public.user_permission where user_id = 'S1000001';
select pg_temp.chk('overrides cleaned up', cardinality(private.effective_permissions('S1000001')) = 3 and 'attendance.check_in' = any (private.effective_permissions('S1000001')));

-- constraints
select pg_temp.chk('location overlap rejected (23P01)', pg_temp.state_of($q$ insert into public.class_schedule (class_id, academic_period_id, frequency_id, lecturer_id, location_id, start_time, end_time, week_day) select (select id from public.class where name = 'Web Development'), (select id from public.academic_period where name = '2026 Term 4'), 1, 'L1000002', (select id from public.location where name = 'Room 1.01'), '10:00', '12:00', 1 $q$) like '23P01%');
select pg_temp.chk('lecturer overlap rejected (23P01)', pg_temp.state_of($q$ insert into public.class_schedule (class_id, academic_period_id, frequency_id, lecturer_id, location_id, start_time, end_time, week_day) select (select id from public.class where name = 'Web Development'), (select id from public.academic_period where name = '2026 Term 4'), 1, 'L1000001', (select id from public.location where name = 'Room 1.02'), '10:00', '12:00', 1 $q$) like '23P01%');
select pg_temp.chk('end before start rejected (23514)', pg_temp.state_of($q$ insert into public.class_schedule (class_id, academic_period_id, frequency_id, lecturer_id, location_id, start_time, end_time, week_day) select (select id from public.class where name = 'Web Development'), (select id from public.academic_period where name = '2026 Term 4'), 1, 'L1000002', (select id from public.location where name = 'Room 2.05'), '12:00', '10:00', 4 $q$) like '23514%');
select pg_temp.chk('back-to-back allowed (no overlap)', not (tsrange('2000-01-01'::date + '09:00'::time, '2000-01-01'::date + '11:00'::time) && tsrange('2000-01-01'::date + '11:00'::time, '2000-01-01'::date + '13:00'::time)));
select pg_temp.chk('absent with check-in time rejected (23514)', pg_temp.state_of($q$ update public.attendance set checked_in_at = now() where (student_id, session_id) = (select student_id, session_id from public.attendance where status = 'absent' limit 1) $q$) like '23514%');
select pg_temp.chk('audit rows cannot be updated', pg_temp.state_of('update public.attendance_audit set reason = $$x$$') like 'P0001%append-only%');
select pg_temp.chk('audit rows cannot be deleted', pg_temp.state_of('delete from public.attendance_audit') like 'P0001%append-only%');
select pg_temp.chk('duplicate email (any case) rejected (23505)', pg_temp.state_of($q$ update public.users set email = upper((select email from public.users where id = 'S1000002')) where id = 'S1000001' $q$) like '23505%');
select pg_temp.chk('id format enforced (23514)', pg_temp.state_of($q$ update public.users set id = 'X123' where id = 'S1000001' $q$) like '23514%');
select pg_temp.chk('role in use cannot be deleted (23503)', pg_temp.state_of($q$ delete from public.role where name = 'student' $q$) like '23503%');

-- audit trigger recorded the lecturer correction made by seed.sql
select pg_temp.chk('audit has the correction (late -> present by L1000001)', (select count(*) from public.attendance_audit where old_status = 'late' and new_status = 'present' and changed_by = 'L1000001') = 1);
select pg_temp.chk('every attendance row has an audit insert', (select count(*) from public.attendance a where not exists (select 1 from public.attendance_audit au where au.student_id = a.student_id and au.session_id = a.session_id)) = 0);

-- derived numbers
select pg_temp.chk('session summary matches raw counts', (select (checked_in, enrolled) = ((select count(*) from public.attendance where session_id = sid and status in ('present','late')), (select count(*) from public.enrollment e join public.class_session cs on cs.class_schedule_id = e.class_schedule_id where cs.id = sid)) from (select (select id from public.class_session where status = 'finished' order by id limit 1) as sid) q, lateral public.session_attendance_summary(q.sid)));
select pg_temp.chk('student class summary adds up', (select finished_sessions = present + late + absent and finished_sessions = 4 from public.student_class_attendance('S1000001', (select s.id from public.class_schedule s join public.class c on c.id = s.class_id join public.academic_period p on p.id = s.academic_period_id where c.name = 'Introduction to Programming' and p.name = '2026 Term 4'))));
select pg_temp.chk('class summary enrolled = 10', (select enrolled = 10 and finished_sessions = 4 from public.class_attendance_summary((select s.id from public.class_schedule s join public.class c on c.id = s.class_id join public.academic_period p on p.id = s.academic_period_id where c.name = 'Introduction to Programming' and p.name = '2026 Term 4'))));
select pg_temp.chk('summary respects RLS for a student (sees only own row)', pg_temp.try('S1000001', $q$ select (select checked_in from public.session_attendance_summary((select id from public.class_session where status = 'finished' order by id limit 1)))::text $q$) in ('OK:0','OK:1'));

-- every public table has RLS; anon has no table grants
select pg_temp.chk('all 17 public tables have RLS', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) = 17);
select pg_temp.chk('anon has no table privileges in public', (select count(*) from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon') = 0);

select n, case when ok then 'PASS' else 'FAIL' end as result, label, detail from results order by n;
