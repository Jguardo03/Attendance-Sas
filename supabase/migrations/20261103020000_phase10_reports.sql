-- Phase 10: attendance reports. All SECURITY INVOKER, so row level security decides what each caller sees (an admin
-- with attendance.view_all sees everything, a lecturer only their own classes). Every number is worked out here, never
-- in the app. Only finished sessions count (by the clock, as everywhere else), cancelled sessions are left out, and a
-- student with no attendance row for a finished session counts as absent. All filters are optional.

-- One row per student per class: finished sessions, present, late, absent and the percentage attended.
-- attendance_pct is null until the class has a finished session.
CREATE FUNCTION public.report_student_classes(
  p_period_id integer DEFAULT NULL, p_class_id integer DEFAULT NULL, p_lecturer_id text DEFAULT NULL)
RETURNS TABLE (student_id text, first_name text, last_name text, schedule_id integer, class_name text, period_name text,
               lecturer_id text, lecturer_name text, finished_sessions bigint, present bigint, late bigint, absent bigint,
               attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH sch AS (
    SELECT sc.schedule_id, sc.class_name::text AS class_name, sc.period_name::text AS period_name,
           sc.lecturer_id::text AS lecturer_id,
           btrim(coalesce(sc.lecturer_first_name, '') || ' ' || coalesce(sc.lecturer_last_name, '')) AS lecturer_name
    FROM public.schedule_overview sc
    WHERE (p_period_id IS NULL OR sc.academic_period_id = p_period_id)
      AND (p_class_id IS NULL OR sc.class_id = p_class_id)
      AND (p_lecturer_id IS NULL OR sc.lecturer_id = p_lecturer_id)),
  fs AS (
    SELECT so.session_id, so.schedule_id
    FROM public.session_overview so JOIN sch ON sch.schedule_id = so.schedule_id
    WHERE so.status = 'finished'),
  n AS (SELECT fs.schedule_id, count(*) AS n FROM fs GROUP BY fs.schedule_id),
  per AS (
    SELECT e.user_id, e.class_schedule_id AS schedule_id,
           count(a.student_id) FILTER (WHERE a.status = 'present') AS present,
           count(a.student_id) FILTER (WHERE a.status = 'late') AS late
    FROM public.enrollment e
    JOIN sch ON sch.schedule_id = e.class_schedule_id
    LEFT JOIN fs ON fs.schedule_id = e.class_schedule_id
    LEFT JOIN public.attendance a ON a.session_id = fs.session_id AND a.student_id = e.user_id
    GROUP BY e.user_id, e.class_schedule_id)
  SELECT u.id::text, u.first_name::text, u.last_name::text, sch.schedule_id, sch.class_name, sch.period_name,
         sch.lecturer_id, sch.lecturer_name, coalesce(n.n, 0), per.present, per.late,
         coalesce(n.n, 0) - per.present - per.late,
         CASE WHEN coalesce(n.n, 0) = 0 THEN NULL ELSE round(100.0 * (per.present + per.late) / n.n, 1) END
  FROM per
  JOIN sch ON sch.schedule_id = per.schedule_id
  JOIN public.users u ON u.id = per.user_id
  LEFT JOIN n ON n.schedule_id = per.schedule_id
  ORDER BY u.last_name, u.first_name, sch.class_name
$$;

-- One row per class: enrolment, finished sessions, the class average (mean of its students' percentages) and how many
-- students are below 75%. Classes with no students or no finished sessions are still listed.
CREATE FUNCTION public.report_classes(
  p_period_id integer DEFAULT NULL, p_class_id integer DEFAULT NULL, p_lecturer_id text DEFAULT NULL)
RETURNS TABLE (schedule_id integer, class_name text, period_name text, lecturer_id text, lecturer_name text,
               enrolled bigint, finished_sessions bigint, class_average_pct numeric, students_below_75 bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH rs AS (SELECT * FROM public.report_student_classes(p_period_id, p_class_id, p_lecturer_id)),
  sch AS (
    SELECT sc.schedule_id, sc.class_name::text AS class_name, sc.period_name::text AS period_name,
           sc.lecturer_id::text AS lecturer_id,
           btrim(coalesce(sc.lecturer_first_name, '') || ' ' || coalesce(sc.lecturer_last_name, '')) AS lecturer_name
    FROM public.schedule_overview sc
    WHERE (p_period_id IS NULL OR sc.academic_period_id = p_period_id)
      AND (p_class_id IS NULL OR sc.class_id = p_class_id)
      AND (p_lecturer_id IS NULL OR sc.lecturer_id = p_lecturer_id))
  SELECT sch.schedule_id, sch.class_name, sch.period_name, sch.lecturer_id, sch.lecturer_name,
         count(rs.student_id),
         (SELECT count(*) FROM public.session_overview so WHERE so.schedule_id = sch.schedule_id AND so.status = 'finished'),
         round(avg(rs.attendance_pct), 1),
         count(rs.student_id) FILTER (WHERE rs.attendance_pct < 75)
  FROM sch LEFT JOIN rs ON rs.schedule_id = sch.schedule_id
  GROUP BY sch.schedule_id, sch.class_name, sch.period_name, sch.lecturer_id, sch.lecturer_name
  ORDER BY sch.class_name, sch.schedule_id
$$;

-- One row per lecturer: classes taught, finished sessions held and the average attendance across those sessions
-- (students who attended out of students enrolled, summed over the sessions).
CREATE FUNCTION public.report_lecturers(
  p_period_id integer DEFAULT NULL, p_class_id integer DEFAULT NULL, p_lecturer_id text DEFAULT NULL)
RETURNS TABLE (lecturer_id text, lecturer_name text, classes bigint, sessions_held bigint, average_attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH sch AS (
    SELECT sc.schedule_id, sc.lecturer_id::text AS lecturer_id,
           btrim(coalesce(sc.lecturer_first_name, '') || ' ' || coalesce(sc.lecturer_last_name, '')) AS lecturer_name
    FROM public.schedule_overview sc
    WHERE (p_period_id IS NULL OR sc.academic_period_id = p_period_id)
      AND (p_class_id IS NULL OR sc.class_id = p_class_id)
      AND (p_lecturer_id IS NULL OR sc.lecturer_id = p_lecturer_id)),
  en AS (SELECT e.class_schedule_id AS schedule_id, count(*) AS enrolled FROM public.enrollment e GROUP BY e.class_schedule_id),
  per_session AS (
    SELECT so.session_id, so.schedule_id, coalesce(en.enrolled, 0) AS enrolled,
           count(a.student_id) FILTER (WHERE a.status IN ('present', 'late')) AS attended
    FROM public.session_overview so
    JOIN sch ON sch.schedule_id = so.schedule_id
    LEFT JOIN en ON en.schedule_id = so.schedule_id
    LEFT JOIN public.attendance a ON a.session_id = so.session_id
    WHERE so.status = 'finished'
    GROUP BY so.session_id, so.schedule_id, en.enrolled)
  SELECT sch.lecturer_id, sch.lecturer_name, count(DISTINCT sch.schedule_id), count(ps.session_id),
         CASE WHEN coalesce(sum(ps.enrolled), 0) = 0 THEN NULL ELSE round(100.0 * sum(ps.attended) / sum(ps.enrolled), 1) END
  FROM sch LEFT JOIN per_session ps ON ps.schedule_id = sch.schedule_id
  GROUP BY sch.lecturer_id, sch.lecturer_name
  ORDER BY sch.lecturer_name, sch.lecturer_id
$$;

REVOKE ALL ON FUNCTION public.report_student_classes(integer, integer, text), public.report_classes(integer, integer, text),
  public.report_lecturers(integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_student_classes(integer, integer, text), public.report_classes(integer, integer, text),
  public.report_lecturers(integer, integer, text) TO authenticated;
