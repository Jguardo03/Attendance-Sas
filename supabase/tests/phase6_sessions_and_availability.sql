-- Phase 6 check. Runs inside a function that always raises at the end, so nothing is kept.
-- The "error" it ends with carries the results. Expected:
--   weekly=10 rerun=0 fortnightly=5 overlap=tmp-class adjacent=FREE otherday=FREE firstdate=2027-02-01 dow 1
create or replace function pg_temp.phase6_check() returns void language plpgsql as $$
declare
  p int; c int; fw int; ff int; loc int; sw int; sf int;
  weekly int; again int; fortnight int; booked text; adjacent text; other_day text;
begin
  -- A period of exactly 10 weeks starting on a Monday
  insert into academic_period(name,start_date,finish_date) values ('tmp-10w','2027-02-01','2027-04-11') returning id into p;
  insert into class(name) values ('tmp-class') returning id into c;
  insert into frequency(name,interval_days) values ('tmp-weekly',7) returning id into fw;
  insert into frequency(name,interval_days) values ('tmp-fortnight',14) returning id into ff;
  insert into location(name) values ('tmp-room') returning id into loc;
  insert into class_schedule(class_id,academic_period_id,frequency_id,lecturer_id,location_id,start_time,end_time,week_day)
    values (c,p,fw,'L1000001',loc,'09:00','11:00',1) returning id into sw;
  insert into class_schedule(class_id,academic_period_id,frequency_id,lecturer_id,location_id,start_time,end_time,week_day)
    values (c,p,ff,'L1000001',loc,'09:00','11:00',2) returning id into sf;
  weekly := generate_sessions(sw);
  again := generate_sessions(sw);
  fortnight := generate_sessions(sf);
  select coalesce(booked_class,'FREE') into booked from locations_availability(p,1::smallint,'10:00','12:00') where location_id=loc;
  select coalesce(booked_class,'FREE') into adjacent from locations_availability(p,1::smallint,'11:00','12:00') where location_id=loc;
  select coalesce(booked_class,'FREE') into other_day from locations_availability(p,3::smallint,'09:00','11:00') where location_id=loc;
  raise exception 'RESULT weekly=% rerun=% fortnightly=% overlap=% adjacent=% otherday=% firstdate=%',
    weekly, again, fortnight, booked, adjacent, other_day,
    (select min(session_date)::text || ' dow ' || extract(isodow from min(session_date)) from class_session where class_schedule_id=sw);
end $$;
select pg_temp.phase6_check();
