-- Phase 7 step 7b: numbers for lecturer and admin screens. All SECURITY INVOKER, so row level security decides
-- what each caller can see (a lecturer sees their own classes, an admin everything; a student only themselves).

-- Every enrolled student's attendance in one class (class details). Sessions count as finished by the clock;
-- cancelled sessions are left out, as everywhere else.
CREATE FUNCTION public.class_student_attendance(p_schedule_id integer)
RETURNS TABLE (student_id text, first_name text, last_name text, finished_sessions bigint, present bigint, late bigint,
               absent bigint, attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH fs AS (
    SELECT session_id FROM public.session_overview WHERE schedule_id = p_schedule_id AND status = 'finished'),
  n AS (SELECT count(*) AS n FROM fs)
  SELECT u.id::text, u.first_name::text, u.last_name::text, n.n,
         count(a.student_id) FILTER (WHERE a.status = 'present'),
         count(a.student_id) FILTER (WHERE a.status = 'late'),
         n.n - count(a.student_id) FILTER (WHERE a.status IN ('present', 'late')),
         CASE WHEN n.n = 0 THEN NULL
              ELSE round(100.0 * count(a.student_id) FILTER (WHERE a.status IN ('present', 'late')) / n.n, 1) END
  FROM public.enrollment e
  JOIN public.users u ON u.id = e.user_id
  CROSS JOIN n
  LEFT JOIN public.attendance a ON a.student_id = e.user_id AND a.session_id IN (SELECT session_id FROM fs)
  WHERE e.class_schedule_id = p_schedule_id
  GROUP BY u.id, u.first_name, u.last_name, n.n
  ORDER BY u.last_name, u.first_name
$$;

-- One session: every enrolled student with their attendance row, if any (session details).
CREATE FUNCTION public.session_attendance_list(p_session_id integer)
RETURNS TABLE (student_id text, first_name text, last_name text, status text, checked_in_at timestamptz, check_in_method text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT u.id::text, u.first_name::text, u.last_name::text, a.status::text, a.checked_in_at, a.check_in_method::text
  FROM public.class_session cs
  JOIN public.enrollment e ON e.class_schedule_id = cs.class_schedule_id
  JOIN public.users u ON u.id = e.user_id
  LEFT JOIN public.attendance a ON a.session_id = cs.id AND a.student_id = e.user_id
  WHERE cs.id = p_session_id
  ORDER BY u.last_name, u.first_name
$$;

-- Enrolled / present / late for every session in a date range, in one call (the "18/24 . 75%" on lists).
-- One row per session, so a session is listed once however many students are enrolled.
CREATE FUNCTION public.session_attendance_counts(p_from date, p_to date)
RETURNS TABLE (session_id integer, enrolled bigint, present bigint, late bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT so.session_id,
         (SELECT count(*) FROM public.enrollment e WHERE e.class_schedule_id = so.schedule_id),
         count(a.student_id) FILTER (WHERE a.status = 'present'),
         count(a.student_id) FILTER (WHERE a.status = 'late')
  FROM public.session_overview so
  LEFT JOIN public.attendance a ON a.session_id = so.session_id
  WHERE so.session_date BETWEEN p_from AND p_to
  GROUP BY so.session_id, so.schedule_id
$$;

REVOKE ALL ON FUNCTION public.class_student_attendance(integer), public.session_attendance_list(integer),
  public.session_attendance_counts(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.class_student_attendance(integer), public.session_attendance_list(integer),
  public.session_attendance_counts(date, date) TO authenticated;
