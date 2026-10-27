-- Row Level Security on every table
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_parm ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequency ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE class ENABLE ROW LEVEL SECURITY;
ALTER TABLE location ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit ENABLE ROW LEVEL SECURITY;

-- Admin-style write (and read) access: one "<table>_manage" policy per table, keyed by permission
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('role', 'roles.manage'), ('permissions', 'roles.manage'), ('role_permission', 'roles.manage'),
    ('email_parm', 'email_formats.manage'), ('user_permission', 'users.manage'),
    ('frequency', 'classes.manage'), ('academic_period', 'periods.manage'), ('class', 'classes.manage'),
    ('location', 'locations.manage'), ('beacon', 'locations.manage'), ('nfc_tags', 'locations.manage'),
    ('class_schedule', 'classes.manage'), ('class_session', 'classes.manage'), ('enrollment', 'classes.manage')
  ) AS t(tbl, perm) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT private.has_permission(%L))) WITH CHECK ((SELECT private.has_permission(%L)))',
      r.tbl || '_manage', r.tbl, r.perm, r.perm);
  END LOOP;
END $$;

-- Read policies (permissive; combined with the manage policies above)
CREATE POLICY role_select ON role FOR SELECT TO authenticated USING (true);
CREATE POLICY frequency_select ON frequency FOR SELECT TO authenticated USING (true);
CREATE POLICY academic_period_select ON academic_period FOR SELECT TO authenticated USING (true);
CREATE POLICY location_select ON location FOR SELECT TO authenticated USING (true);

CREATE POLICY email_parm_select ON email_parm FOR SELECT TO authenticated
  USING ((SELECT private.has_permission('users.manage')));

CREATE POLICY users_select ON users FOR SELECT TO authenticated
  USING (
    id = (SELECT private.app_user_id())
    OR (SELECT private.has_permission('users.manage'))
    OR (SELECT private.has_permission('attendance.view_all'))
    OR (SELECT private.has_permission('classes.view_all'))
    OR (SELECT private.teaches_student(id))
    OR (SELECT private.is_my_lecturer(id))
  );
CREATE POLICY users_update ON users FOR UPDATE TO authenticated
  USING ((SELECT private.has_permission('users.manage')))
  WITH CHECK ((SELECT private.has_permission('users.manage')));

CREATE POLICY class_select ON class FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('classes.view_all'))
    OR (SELECT private.has_permission('classes.manage'))
    OR ((SELECT private.has_permission('classes.view_own')) AND (SELECT private.can_see_class(id)))
  );

CREATE POLICY class_schedule_select ON class_schedule FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('classes.view_all'))
    OR (SELECT private.has_permission('classes.manage'))
    OR ((SELECT private.has_permission('classes.view_own'))
        AND (lecturer_id = (SELECT private.app_user_id()) OR (SELECT private.enrolled_in_schedule(id))))
  );

CREATE POLICY class_session_select ON class_session FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('classes.view_all'))
    OR (SELECT private.has_permission('classes.manage'))
    OR ((SELECT private.has_permission('classes.view_own'))
        AND ((SELECT private.teaches_schedule(class_schedule_id)) OR (SELECT private.enrolled_in_schedule(class_schedule_id))))
  );

CREATE POLICY enrollment_select ON enrollment FOR SELECT TO authenticated
  USING (
    user_id = (SELECT private.app_user_id())
    OR (SELECT private.has_permission('classes.view_all'))
    OR (SELECT private.has_permission('classes.manage'))
    OR ((SELECT private.has_permission('classes.view_own')) AND (SELECT private.teaches_schedule(class_schedule_id)))
  );

CREATE POLICY attendance_select ON attendance FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('attendance.view_all'))
    OR ((SELECT private.has_permission('attendance.view_own'))
        AND (student_id = (SELECT private.app_user_id()) OR (SELECT private.teaches_session(session_id))))
  );

CREATE POLICY attendance_audit_select ON attendance_audit FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('attendance.view_all'))
    OR ((SELECT private.has_permission('attendance.view_own')) AND (SELECT private.teaches_session(session_id)))
  );

-- Grants (the project does not auto-expose new tables). anon gets nothing on tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON role, permissions, email_parm, frequency, academic_period, class,
  beacon, class_schedule, class_session, user_permission TO authenticated;
GRANT SELECT, INSERT, DELETE ON role_permission, enrollment TO authenticated;
GRANT SELECT ON users, attendance, attendance_audit TO authenticated;
GRANT UPDATE (first_name, last_name, role_id) ON users TO authenticated;
-- location: the QR secret seed is never readable or writable by clients
GRANT SELECT (id, name, created_at, updated_at), INSERT (name), UPDATE (name) ON location TO authenticated;
GRANT DELETE ON location TO authenticated;
-- nfc_tags: the payload token is never readable by clients; tags are registered through an Edge Function
GRANT SELECT (nfc_uid, location_id, created_at, updated_at), UPDATE (location_id) ON nfc_tags TO authenticated;
GRANT DELETE ON nfc_tags TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Pre-login check used by the sign-in screen. Returns only true/false.
CREATE FUNCTION public.is_allowed_email(p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.email_parm ep
  WHERE position('@' IN p_email) > 1
    AND right(lower(p_email), length(ep.format)) = lower(ep.format)) $$;
REVOKE EXECUTE ON FUNCTION public.is_allowed_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_allowed_email(text) TO anon, authenticated;

-- Derived numbers (SECURITY INVOKER: callers only count rows RLS lets them see).
-- "Attended" = present + late. Percentages are rounded to 1 decimal; NULL when there is nothing to divide by.
CREATE FUNCTION public.session_attendance_summary(p_session_id integer)
RETURNS TABLE (enrolled bigint, present bigint, late bigint, checked_in bigint, attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH e AS (
    SELECT count(*) AS n FROM public.enrollment en
    JOIN public.class_session cs ON cs.class_schedule_id = en.class_schedule_id
    WHERE cs.id = p_session_id),
  a AS (
    SELECT count(*) FILTER (WHERE status = 'present') AS present,
           count(*) FILTER (WHERE status = 'late') AS late
    FROM public.attendance WHERE session_id = p_session_id)
  SELECT e.n, a.present, a.late, a.present + a.late,
         CASE WHEN e.n = 0 THEN NULL ELSE round(100.0 * (a.present + a.late) / e.n, 1) END
  FROM e, a
$$;

CREATE FUNCTION public.student_class_attendance(p_student_id text, p_schedule_id integer)
RETURNS TABLE (finished_sessions bigint, present bigint, late bigint, absent bigint, attendance_pct numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH fs AS (
    SELECT id FROM public.class_session WHERE class_schedule_id = p_schedule_id AND status = 'finished'),
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

CREATE FUNCTION public.class_attendance_summary(p_schedule_id integer)
RETURNS TABLE (enrolled bigint, finished_sessions bigint, class_average_pct numeric, students_below_75 bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH fs AS (
    SELECT id FROM public.class_session WHERE class_schedule_id = p_schedule_id AND status = 'finished'),
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
REVOKE EXECUTE ON FUNCTION public.session_attendance_summary(integer), public.student_class_attendance(text, integer),
  public.class_attendance_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_attendance_summary(integer), public.student_class_attendance(text, integer),
  public.class_attendance_summary(integer) TO authenticated;
