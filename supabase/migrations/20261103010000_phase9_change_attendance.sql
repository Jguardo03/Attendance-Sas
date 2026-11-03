-- Phase 9: lecturers and admins change attendance (including checking a student in by hand), the record's history,
-- and live updates for the attendance screens.

-- Changes one student's attendance for one session, or creates the record when there is none (manual check in).
-- The rules live here, in one place, using the database clock. Who may do it: attendance.edit_all, or attendance.edit
-- for a session of a schedule the caller teaches. The session must be live or finished and not cancelled, the student
-- must be enrolled, and a reason is required. The method is always manual. Time: kept when only the status changes,
-- the session start when there was none, null for absent; a time given must fall between check in opening and the end.
-- The audit row is written by the trigger on attendance, and created_by / updated_by by the stamping trigger.
-- SECURITY DEFINER because clients have no write access to attendance; every check is in the function body.
CREATE FUNCTION public.change_attendance(
  p_student_id text, p_session_id integer, p_status public.attendance_status, p_time time, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  me text := private.app_user_id();
  s record;
  existing record;
  v_found boolean;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_at timestamptz;
  v_method public.check_in_method;
BEGIN
  IF me IS NULL OR NOT (
       private.has_permission('attendance.edit_all')
       OR (private.has_permission('attendance.edit') AND private.teaches_session(p_session_id))) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_allowed');
  END IF;

  SELECT so.schedule_id, so.status, so.session_date, so.starts_at, so.ends_at, so.check_in_opens_at
    INTO s FROM public.session_overview so WHERE so.session_id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;
  IF s.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cancelled');
  END IF;
  IF s.status NOT IN ('started', 'finished') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_editable');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enrollment e WHERE e.user_id = p_student_id AND e.class_schedule_id = s.schedule_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_enrolled');
  END IF;
  IF v_reason = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'reason_required');
  END IF;
  IF char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'reason_too_long');
  END IF;

  SELECT a.status, a.checked_in_at, a.check_in_method INTO existing
    FROM public.attendance a WHERE a.student_id = p_student_id AND a.session_id = p_session_id;
  v_found := FOUND;

  IF p_status = 'absent' THEN
    v_at := NULL;
    v_method := NULL;
  ELSE
    v_method := 'manual';
    IF p_time IS NOT NULL THEN
      IF s.session_date + p_time < s.check_in_opens_at OR s.session_date + p_time >= s.ends_at THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_time');
      END IF;
      v_at := (s.session_date + p_time) AT TIME ZONE 'Australia/Melbourne';
    ELSIF v_found AND existing.status <> 'absent' THEN
      v_at := existing.checked_in_at;
    ELSE
      v_at := s.starts_at AT TIME ZONE 'Australia/Melbourne';
    END IF;
  END IF;

  -- Nothing would change: same status and, for present or late, the same minute.
  IF v_found AND existing.status = p_status
     AND (p_status = 'absent' OR p_time IS NULL
          OR to_char(existing.checked_in_at AT TIME ZONE 'Australia/Melbourne', 'HH24:MI') = to_char(p_time, 'HH24:MI')) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_change');
  END IF;

  INSERT INTO public.attendance (student_id, session_id, status, checked_in_at, check_in_method, comments, created_by, updated_by)
  VALUES (p_student_id, p_session_id, p_status, v_at, v_method, v_reason, me, me)
  ON CONFLICT (student_id, session_id) DO UPDATE
    SET status = EXCLUDED.status, checked_in_at = EXCLUDED.checked_in_at, check_in_method = EXCLUDED.check_in_method,
        comments = EXCLUDED.comments, updated_by = me;

  RETURN jsonb_build_object('ok', true, 'student_id', p_student_id, 'session_id', p_session_id, 'status', p_status,
    'checked_in_at', v_at, 'method', v_method, 'previous_status', CASE WHEN v_found THEN existing.status::text END);
END
$$;
REVOKE ALL ON FUNCTION public.change_attendance(text, integer, public.attendance_status, time, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_attendance(text, integer, public.attendance_status, time, text) TO authenticated;

-- The history of one record, newest first, with the name of whoever made each change (no name = the system).
-- Same visibility as the attendance_audit policy: attendance.view_all, or a lecturer of that session. SECURITY DEFINER
-- only so the lecturer's name can be read for rows made by other people.
CREATE FUNCTION public.attendance_history(p_student_id text, p_session_id integer)
RETURNS TABLE (changed_at timestamptz, old_status text, new_status text, old_checked_in_at timestamptz,
               new_checked_in_at timestamptz, new_check_in_method text, reason text, changed_by text, changed_by_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT au.changed_at, au.old_status::text, au.new_status::text, au.old_checked_in_at, au.new_checked_in_at,
         au.new_check_in_method::text, au.reason::text, au.changed_by::text,
         nullif(btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')
  FROM public.attendance_audit au
  LEFT JOIN public.users u ON u.id = au.changed_by
  WHERE au.student_id = p_student_id AND au.session_id = p_session_id
    AND (private.has_permission('attendance.view_all')
         OR (private.has_permission('attendance.view_own') AND private.teaches_session(p_session_id)))
  ORDER BY au.changed_at DESC, au.id DESC
$$;
REVOKE ALL ON FUNCTION public.attendance_history(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_history(text, integer) TO authenticated;

-- Live updates: the attendance screens listen for changes. Realtime only delivers rows the listener may read
-- (the attendance_select policy), so a student hears about their own rows and a lecturer about their sessions.
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
