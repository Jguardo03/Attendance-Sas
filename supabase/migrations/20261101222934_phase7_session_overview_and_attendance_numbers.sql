-- Phase 7: what a session is right now, one row per session for every screen, attendance numbers that use it.

-- "Now" in the institution's time zone (decided in the plan). Session dates and times are local wall-clock values.
CREATE FUNCTION public.app_now() RETURNS timestamp
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT date_trunc('second', now() AT TIME ZONE 'Australia/Melbourne') $$;
GRANT EXECUTE ON FUNCTION public.app_now() TO authenticated;
REVOKE ALL ON FUNCTION public.app_now() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_now() TO authenticated;

-- One row per session, with overrides applied and the status worked out from the clock:
--   cancelled stays cancelled; after the end time it is finished; after the start time it is started (live);
--   before that it keeps its stored status (scheduled or rescheduled).
-- SECURITY INVOKER: row level security decides which sessions each person sees (a student sees only enrolled classes).
CREATE VIEW public.session_overview WITH (security_invoker = true) AS
SELECT
  cs.id AS session_id,
  cs.class_schedule_id AS schedule_id,
  cs.session_date,
  s.class_id,
  c.name AS class_name,
  c.description AS class_description,
  s.academic_period_id,
  p.name AS period_name,
  p.status AS period_status,
  f.name AS frequency_name,
  s.lecturer_id,
  l.first_name AS lecturer_first_name,
  l.last_name AS lecturer_last_name,
  l.email AS lecturer_email,
  coalesce(cs.override_location_id, s.location_id) AS location_id,
  loc.name AS location_name,
  s.week_day,
  coalesce(cs.override_start_time, s.start_time) AS start_time,
  coalesce(cs.override_end_time, s.end_time) AS end_time,
  cs.status AS stored_status,
  CASE
    WHEN cs.status = 'cancelled' THEN 'cancelled'
    WHEN cs.session_date + coalesce(cs.override_end_time, s.end_time) <= public.app_now() THEN 'finished'
    WHEN cs.session_date + coalesce(cs.override_start_time, s.start_time) <= public.app_now() THEN 'started'
    ELSE cs.status::text
  END AS status,
  cs.session_date + coalesce(cs.override_start_time, s.start_time) AS starts_at,
  cs.session_date + coalesce(cs.override_end_time, s.end_time) AS ends_at,
  -- check-in opens 10 minutes before the start; present until the start, late after it
  cs.session_date + coalesce(cs.override_start_time, s.start_time) - interval '10 minutes' AS check_in_opens_at,
  public.app_now() AS now_local
FROM public.class_session cs
JOIN public.class_schedule s ON s.id = cs.class_schedule_id
JOIN public.class c ON c.id = s.class_id
JOIN public.academic_period p ON p.id = s.academic_period_id
JOIN public.frequency f ON f.id = s.frequency_id
LEFT JOIN public.users l ON l.id = s.lecturer_id
LEFT JOIN public.location loc ON loc.id = coalesce(cs.override_location_id, s.location_id);

-- One row per scheduled class (the "Classes" lists and Class details).
CREATE VIEW public.schedule_overview WITH (security_invoker = true) AS
SELECT
  s.id AS schedule_id,
  s.class_id,
  c.name AS class_name,
  c.description AS class_description,
  s.academic_period_id,
  p.name AS period_name,
  p.status AS period_status,
  p.start_date AS period_start,
  p.finish_date AS period_finish,
  f.name AS frequency_name,
  s.lecturer_id,
  l.first_name AS lecturer_first_name,
  l.last_name AS lecturer_last_name,
  l.email AS lecturer_email,
  s.location_id,
  loc.name AS location_name,
  s.week_day,
  s.start_time,
  s.end_time
FROM public.class_schedule s
JOIN public.class c ON c.id = s.class_id
JOIN public.academic_period p ON p.id = s.academic_period_id
JOIN public.frequency f ON f.id = s.frequency_id
LEFT JOIN public.users l ON l.id = s.lecturer_id
LEFT JOIN public.location loc ON loc.id = s.location_id;

REVOKE ALL ON public.session_overview, public.schedule_overview FROM PUBLIC, anon;
GRANT SELECT ON public.session_overview, public.schedule_overview TO authenticated;

-- Attendance numbers now count a session as finished by the clock (not by a stored flag nothing updates).
-- Cancelled sessions are never finished, so they are left out of every percentage.
CREATE OR REPLACE FUNCTION public.student_class_attendance(p_student_id text, p_schedule_id integer)
RETURNS TABLE (finished_sessions bigint, present bigint, late bigint, absent bigint, attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH fs AS (
    SELECT session_id AS id FROM public.session_overview WHERE schedule_id = p_schedule_id AND status = 'finished'),
  a AS (
    SELECT count(*) FILTER (WHERE at.status = 'present') AS present,
           count(*) FILTER (WHERE at.status = 'late') AS late
    FROM public.attendance at JOIN fs ON fs.id = at.session_id
    WHERE at.student_id = p_student_id)
  SELECT (SELECT count(*) FROM fs), a.present, a.late,
         (SELECT count(*) FROM fs) - a.present - a.late,
         CASE WHEN (SELECT count(*) FROM fs) = 0 THEN NULL
              ELSE round(100.0 * (a.present + a.late) / (SELECT count(*) FROM fs), 1) END
  FROM a
$$;

CREATE OR REPLACE FUNCTION public.class_attendance_summary(p_schedule_id integer)
RETURNS TABLE (enrolled bigint, finished_sessions bigint, class_average_pct numeric, students_below_75 bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH fs AS (
    SELECT session_id AS id FROM public.session_overview WHERE schedule_id = p_schedule_id AND status = 'finished'),
  nfs AS (SELECT count(*) AS n FROM fs),
  per AS (
    SELECT en.user_id,
           count(at.student_id) FILTER (WHERE at.status IN ('present', 'late')) AS attended
    FROM public.enrollment en
    LEFT JOIN public.attendance at ON at.student_id = en.user_id AND at.session_id IN (SELECT id FROM fs)
    WHERE en.class_schedule_id = p_schedule_id
    GROUP BY en.user_id)
  SELECT (SELECT count(*) FROM per), nfs.n,
         CASE WHEN nfs.n = 0 THEN NULL ELSE round(avg(100.0 * per.attended / nfs.n), 1) END,
         CASE WHEN nfs.n = 0 THEN 0 ELSE count(*) FILTER (WHERE 100.0 * per.attended / nfs.n < 75) END
  FROM nfs LEFT JOIN per ON true
  GROUP BY nfs.n
$$;

-- A student's numbers for every class they are enrolled in, in one call (the Classes lists).
CREATE FUNCTION public.student_attendance_overview(p_student_id text)
RETURNS TABLE (schedule_id integer, finished_sessions bigint, present bigint, late bigint, absent bigint, attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH mine AS (
    SELECT en.class_schedule_id AS schedule_id FROM public.enrollment en WHERE en.user_id = p_student_id),
  fs AS (
    SELECT so.session_id, so.schedule_id
    FROM public.session_overview so JOIN mine ON mine.schedule_id = so.schedule_id
    WHERE so.status = 'finished'),
  agg AS (
    SELECT fs.schedule_id, count(*) AS finished,
           count(*) FILTER (WHERE at.status = 'present') AS present,
           count(*) FILTER (WHERE at.status = 'late') AS late
    FROM fs LEFT JOIN public.attendance at ON at.session_id = fs.session_id AND at.student_id = p_student_id
    GROUP BY fs.schedule_id)
  SELECT mine.schedule_id,
         coalesce(agg.finished, 0),
         coalesce(agg.present, 0),
         coalesce(agg.late, 0),
         coalesce(agg.finished, 0) - coalesce(agg.present, 0) - coalesce(agg.late, 0),
         CASE WHEN coalesce(agg.finished, 0) = 0 THEN NULL
              ELSE round(100.0 * (coalesce(agg.present, 0) + coalesce(agg.late, 0)) / agg.finished, 1) END
  FROM mine LEFT JOIN agg ON agg.schedule_id = mine.schedule_id
$$;

-- Names (only names) of the students in a session's class, for "Session attendees". Students cannot read other
-- students' rows, so the lookup runs as the function owner after checking that the caller belongs to the class.
CREATE FUNCTION private.session_attendee_names(p_session_id integer)
RETURNS TABLE (first_name text, last_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.first_name::text, u.last_name::text
  FROM public.class_session cs
  JOIN public.enrollment e ON e.class_schedule_id = cs.class_schedule_id
  JOIN public.users u ON u.id = e.user_id
  WHERE cs.id = p_session_id
    AND (private.enrolled_in_schedule(cs.class_schedule_id)
         OR private.teaches_schedule(cs.class_schedule_id)
         OR private.has_permission('classes.view_all')
         OR private.has_permission('attendance.view_all'))
  ORDER BY u.last_name, u.first_name
$$;
GRANT EXECUTE ON FUNCTION private.session_attendee_names(integer) TO authenticated;

CREATE FUNCTION public.session_attendees(p_session_id integer)
RETURNS TABLE (first_name text, last_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.session_attendee_names(p_session_id) $$;

-- Admin Today dashboard: sessions today by what they are right now. "Rescheduled or cancelled" is how many were
-- moved or called off, so it can overlap the other columns.
CREATE FUNCTION public.admin_today_counts()
RETURNS TABLE (sessions_today bigint, live_now bigint, upcoming bigint, finished bigint, rescheduled_or_cancelled bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT count(*),
         count(*) FILTER (WHERE status = 'started'),
         count(*) FILTER (WHERE status IN ('scheduled', 'rescheduled')),
         count(*) FILTER (WHERE status = 'finished'),
         count(*) FILTER (WHERE stored_status = 'rescheduled' OR status = 'cancelled')
  FROM public.session_overview
  WHERE session_date = public.app_now()::date
$$;

-- Sessions per day for the calendar.
CREATE FUNCTION public.session_day_counts(p_from date, p_to date)
RETURNS TABLE (session_date date, sessions bigint, cancelled bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT so.session_date, count(*), count(*) FILTER (WHERE so.status = 'cancelled')
  FROM public.session_overview so
  WHERE so.session_date BETWEEN p_from AND p_to
  GROUP BY so.session_date
  ORDER BY so.session_date
$$;

REVOKE ALL ON FUNCTION public.student_attendance_overview(text), public.session_attendees(integer),
  public.admin_today_counts(), public.session_day_counts(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_attendance_overview(text), public.session_attendees(integer),
  public.admin_today_counts(), public.session_day_counts(date, date) TO authenticated;
