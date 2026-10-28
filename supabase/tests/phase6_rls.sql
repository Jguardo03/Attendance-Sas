-- Phase 6 access checks as admin, student, lecturer and anon, using the real access-token hook.
-- Runs inside one function that always raises at the end, so nothing is kept; the "error" text carries the
-- results. Expect every line to read PASS.
create or replace function pg_temp.claims_for(uid text) returns text language sql as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', u.auth_user_id::text, 'claims', jsonb_build_object('role','authenticated','sub',u.auth_user_id::text))) -> 'claims')::text
  from public.users u where u.id = uid $$;
create or replace function pg_temp.try(uid text, q text) returns text language plpgsql as $$
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
create or replace function pg_temp.phase6_rls() returns void language plpgsql as $$
declare out text := ''; sid int; r text;
begin
  select min(id) into sid from public.class_schedule;
  -- admin
  r := pg_temp.try('A1000001', 'select count(*) from (select id, name, qr_enabled, created_at, updated_at from public.location) x');
  out := out || E'\n' || case when r like 'OK:%' then 'PASS' else 'FAIL' end || ' admin reads location without the secret: ' || r;
  r := pg_temp.try('A1000001', 'select count(*) from (select * from public.location) x');
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' select * on location is refused (why the app lists columns): ' || r;
  r := pg_temp.try('A1000001', $q$ with i as (insert into public.location(name) values ('tmp-p6') returning 1) select count(*) from i $q$);
  out := out || E'\n' || case when r = 'OK:1' then 'PASS' else 'FAIL' end || ' admin creates a location: ' || r;
  r := pg_temp.try('A1000001', $q$ with i as (insert into public.beacon(uuid, major, minor, rssi_calibrated) values (gen_random_uuid(), 1, 1, -59) returning 1) select count(*) from i $q$);
  out := out || E'\n' || case when r = 'OK:1' then 'PASS' else 'FAIL' end || ' admin creates an unassigned beacon: ' || r;
  r := pg_temp.try('A1000001', $q$ with u as (update public.nfc_tags set location_id = location_id returning 1) select count(*) from u $q$);
  out := out || E'\n' || case when r like 'OK:%' then 'PASS' else 'FAIL' end || ' admin updates a tag location: ' || r;
  r := pg_temp.try('A1000001', format('select public.generate_sessions(%s)::text', sid));
  out := out || E'\n' || case when r like 'OK:%' then 'PASS' else 'FAIL' end || ' admin generates sessions: ' || r;
  r := pg_temp.try('A1000001', 'select count(*) from public.locations_availability(1, 1::smallint, ''09:00'', ''10:00'')');
  out := out || E'\n' || case when r = 'OK:3' then 'PASS' else 'FAIL' end || ' admin sees every location in availability: ' || r;
  r := pg_temp.try('A1000001', $q$ with u as (update public.class_session set status = status where id = (select min(id) from public.class_session) returning 1) select count(*) from u $q$);
  out := out || E'\n' || case when r = 'OK:1' then 'PASS' else 'FAIL' end || ' admin can reschedule or cancel a session: ' || r;
  -- student
  r := pg_temp.try('S1000001', format('select public.generate_sessions(%s)::text', sid));
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' student cannot generate sessions: ' || r;
  r := pg_temp.try('S1000001', $q$ with u as (update public.class_session set status = 'cancelled' returning 1) select count(*) from u $q$);
  out := out || E'\n' || case when r = 'OK:0' then 'PASS' else 'FAIL' end || ' student cannot cancel a session (row security filters every row): ' || r;
  r := pg_temp.try('S1000001', $q$ with u as (update public.location set name = name returning 1) select count(*) from u $q$);
  out := out || E'\n' || case when r = 'OK:0' then 'PASS' else 'FAIL' end || ' student cannot edit a location (row security filters every row): ' || r;
  r := pg_temp.try('S1000001', $q$ with i as (insert into public.beacon(uuid, major, minor, rssi_calibrated) values (gen_random_uuid(), 1, 2, -59) returning 1) select count(*) from i $q$);
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' student cannot add a beacon: ' || r;
  r := pg_temp.try('S1000001', $q$ with i as (insert into public.enrollment(user_id, class_schedule_id) values ('S1000001', (select min(id) from public.class_schedule)) returning 1) select count(*) from i $q$);
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' student cannot enrol themselves: ' || r;
  r := pg_temp.try('S1000001', 'select qr_secret_seed::text from public.location limit 1');
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' student cannot read the QR secret: ' || r;
  -- lecturer
  r := pg_temp.try('L1000001', format('select public.generate_sessions(%s)::text', sid));
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' lecturer cannot generate sessions: ' || r;
  -- anon
  r := pg_temp.try('anon', 'select count(*) from public.locations_availability(1, 1::smallint, ''09:00'', ''10:00'')');
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' anon cannot call availability: ' || r;
  r := pg_temp.try('anon', 'select public.generate_sessions(1)::text');
  out := out || E'\n' || case when r = 'ERR:42501' then 'PASS' else 'FAIL' end || ' anon cannot call generate_sessions: ' || r;
  raise exception 'RESULTS%', out;
end $$;
select pg_temp.phase6_rls();
