-- Reference data: roles, permission catalogue, role grants, frequencies
INSERT INTO role (name, description) VALUES
  ('student', 'Checks in to classes and views their own schedule and attendance.'),
  ('lecturer', 'Teaches classes, views their sessions and corrects attendance.'),
  ('admin', 'Manages the institution (people, roles, timetable, rooms, devices) and sees all attendance.');

INSERT INTO permissions (name, description) VALUES
  ('attendance.view_own', 'View attendance: your own record (student) or the sessions you teach (lecturer)'),
  ('attendance.view_all', 'View attendance of every class and session'),
  ('attendance.edit', 'Change attendance records for sessions you teach'),
  ('attendance.edit_all', 'Change any attendance record'),
  ('attendance.check_in', 'Check in to a session you are enrolled in'),
  ('classes.view_own', 'View the classes and sessions you are enrolled in or teach'),
  ('classes.view_all', 'View every class, schedule and session'),
  ('sessions.manage_own', 'Start or finish sessions you teach'),
  ('admin.access', 'See the Admin section'),
  ('periods.manage', 'Create, edit and delete academic periods'),
  ('classes.manage', 'Create, edit and delete classes, schedules, sessions, frequencies and enrolments'),
  ('users.manage', 'Create, edit and delete users and their permission overrides'),
  ('roles.manage', 'Create, edit and delete roles and permissions'),
  ('locations.manage', 'Create, edit and delete locations, beacons and NFC tags'),
  ('email_formats.manage', 'Create, edit and delete allowed email formats');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('student', 'attendance.view_own'), ('student', 'attendance.check_in'), ('student', 'classes.view_own'),
  ('lecturer', 'attendance.view_own'), ('lecturer', 'attendance.edit'), ('lecturer', 'classes.view_own'), ('lecturer', 'sessions.manage_own'),
  ('admin', 'attendance.view_all'), ('admin', 'attendance.edit_all'), ('admin', 'classes.view_all'), ('admin', 'admin.access'),
  ('admin', 'periods.manage'), ('admin', 'classes.manage'), ('admin', 'users.manage'), ('admin', 'roles.manage'),
  ('admin', 'locations.manage'), ('admin', 'email_formats.manage')
) AS v(role_name, perm_name)
JOIN role r ON r.name = v.role_name
JOIN permissions p ON p.name = v.perm_name;

INSERT INTO frequency (name, interval_days) VALUES ('weekly', 7), ('fortnightly', 14);

-- Private schema: helper functions that must not be reachable through the Data API
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Claims added to the JWT by the custom access token hook
CREATE FUNCTION private.app_user_id() RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT nullif(auth.jwt() ->> 'app_user_id', '') $$;

CREATE FUNCTION private.has_permission(p_permission text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT coalesce((auth.jwt() -> 'permissions') ? p_permission, false) $$;

-- Effective permissions = role permissions + user grants - user denies (deny always wins)
CREATE FUNCTION private.effective_permissions(p_user_id text) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT s.name ORDER BY s.name), '{}')
  FROM (
    SELECT p.name
    FROM public.users u
    JOIN public.role_permission rp ON rp.role_id = u.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.user_permission up
        WHERE up.user_id = u.id AND up.permission_id = p.id AND up.modifier_type = 'deny')
    UNION
    SELECT p.name
    FROM public.user_permission up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id AND up.modifier_type = 'grant'
  ) s
$$;

CREATE FUNCTION private.custom_access_token_hook(event jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  claims jsonb := event -> 'claims';
  u record;
BEGIN
  SELECT usr.id, r.name AS role_name INTO u
  FROM public.users usr
  JOIN public.role r ON r.id = usr.role_id
  WHERE usr.auth_user_id = (event ->> 'user_id')::uuid;

  IF FOUND THEN
    claims := jsonb_set(claims, '{app_user_id}', to_jsonb(u.id));
    claims := jsonb_set(claims, '{app_role}', to_jsonb(u.role_name));
    claims := jsonb_set(claims, '{permissions}', to_jsonb(private.effective_permissions(u.id)));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
GRANT EXECUTE ON FUNCTION private.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Ownership helpers used by RLS policies. SECURITY DEFINER so the lookups do not re-enter RLS (no recursion).
CREATE FUNCTION private.teaches_schedule(p_schedule_id integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.class_schedule s WHERE s.id = p_schedule_id AND s.lecturer_id = private.app_user_id()) $$;

CREATE FUNCTION private.enrolled_in_schedule(p_schedule_id integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.enrollment e WHERE e.class_schedule_id = p_schedule_id AND e.user_id = private.app_user_id()) $$;

CREATE FUNCTION private.teaches_session(p_session_id integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.class_session cs JOIN public.class_schedule s ON s.id = cs.class_schedule_id
  WHERE cs.id = p_session_id AND s.lecturer_id = private.app_user_id()) $$;

CREATE FUNCTION private.can_see_class(p_class_id integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.class_schedule s
  WHERE s.class_id = p_class_id
    AND (s.lecturer_id = private.app_user_id()
         OR EXISTS (SELECT 1 FROM public.enrollment e WHERE e.class_schedule_id = s.id AND e.user_id = private.app_user_id()))) $$;

-- A lecturer may see the students enrolled in their schedules; a student may see their own lecturers.
CREATE FUNCTION private.teaches_student(p_user_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.enrollment e JOIN public.class_schedule s ON s.id = e.class_schedule_id
  WHERE e.user_id = p_user_id AND s.lecturer_id = private.app_user_id()) $$;

CREATE FUNCTION private.is_my_lecturer(p_user_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.class_schedule s JOIN public.enrollment e ON e.class_schedule_id = s.id
  WHERE s.lecturer_id = p_user_id AND e.user_id = private.app_user_id()) $$;

GRANT EXECUTE ON FUNCTION private.app_user_id(), private.has_permission(text),
  private.teaches_schedule(integer), private.enrolled_in_schedule(integer), private.teaches_session(integer),
  private.can_see_class(integer), private.teaches_student(text), private.is_my_lecturer(text) TO authenticated;

-- Stamp created_by / updated_by from the signed-in user so the history cannot be spoofed by clients.
CREATE FUNCTION private.set_audit_user() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE me text := private.app_user_id();
BEGIN
  IF me IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN NEW.created_by := me; END IF;
    NEW.updated_by := me;
  END IF;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION private.set_audit_user() TO authenticated;
CREATE TRIGGER trg_user_permission_audit_user BEFORE INSERT OR UPDATE ON user_permission FOR EACH ROW EXECUTE FUNCTION private.set_audit_user();
CREATE TRIGGER trg_role_permission_audit_user BEFORE INSERT OR UPDATE ON role_permission FOR EACH ROW EXECUTE FUNCTION private.set_audit_user();
CREATE TRIGGER trg_class_schedule_audit_user BEFORE INSERT OR UPDATE ON class_schedule FOR EACH ROW EXECUTE FUNCTION private.set_audit_user();
CREATE TRIGGER trg_class_session_audit_user BEFORE INSERT OR UPDATE ON class_session FOR EACH ROW EXECUTE FUNCTION private.set_audit_user();
CREATE TRIGGER trg_enrollment_audit_user BEFORE INSERT OR UPDATE ON enrollment FOR EACH ROW EXECUTE FUNCTION private.set_audit_user();
CREATE TRIGGER trg_attendance_audit_user BEFORE INSERT OR UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION private.set_audit_user();
