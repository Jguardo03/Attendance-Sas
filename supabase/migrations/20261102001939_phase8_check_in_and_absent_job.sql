-- Phase 8: record a check in, and mark no-shows absent once a session has finished.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Records one student's check in. The rules are here, in one place, using the database clock: the session must exist
-- and not be cancelled, the student must be enrolled, must not already be checked in, and check in must be open
-- (10 minutes before the start until the end). Present before the start time, late from it. Returns a JSON answer
-- instead of raising, so the Edge Function can turn each case into a clear reply.
-- Only the server (service_role) may call it: the QR evidence is verified before it is called.
CREATE FUNCTION public.record_check_in(p_student_id text, p_session_id integer, p_method public.check_in_method)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  s record;
  existing record;
  v_status public.attendance_status;
  v_at timestamptz := now();
BEGIN
  SELECT so.schedule_id, so.status, so.starts_at, so.ends_at, so.check_in_opens_at, so.now_local
    INTO s FROM public.session_overview so WHERE so.session_id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enrollment e WHERE e.user_id = p_student_id AND e.class_schedule_id = s.schedule_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_enrolled');
  END IF;
  IF s.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cancelled');
  END IF;

  SELECT a.status, a.checked_in_at, a.check_in_method INTO existing
    FROM public.attendance a WHERE a.student_id = p_student_id AND a.session_id = p_session_id;
  IF FOUND AND existing.status <> 'absent' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_checked_in', 'status', existing.status,
      'checked_in_at', existing.checked_in_at, 'method', existing.check_in_method);
  END IF;

  IF s.now_local < s.check_in_opens_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_open', 'opens_at', to_char(s.check_in_opens_at, 'HH24:MI'));
  END IF;
  IF s.now_local >= s.ends_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'closed');
  END IF;

  v_status := CASE WHEN s.now_local < s.starts_at THEN 'present' ELSE 'late' END;
  BEGIN
    INSERT INTO public.attendance (student_id, session_id, status, checked_in_at, check_in_method, created_by)
    VALUES (p_student_id, p_session_id, v_status, v_at, p_method, p_student_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_checked_in');
  END;
  RETURN jsonb_build_object('ok', true, 'status', v_status, 'checked_in_at', v_at, 'method', p_method, 'session_id', p_session_id);
END
$$;
REVOKE ALL ON FUNCTION public.record_check_in(text, integer, public.check_in_method) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_check_in(text, integer, public.check_in_method) TO service_role;

-- No-shows: for every finished (by the clock) session that is not cancelled, an absent row for each enrolled student
-- who has no row. created_by stays empty (the system). Safe to run again; returns how many rows it added.
CREATE FUNCTION private.mark_absent_for_finished_sessions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_added integer;
BEGIN
  INSERT INTO public.attendance (student_id, session_id, status)
  SELECT e.user_id, so.session_id, 'absent'
  FROM public.session_overview so
  JOIN public.enrollment e ON e.class_schedule_id = so.schedule_id
  WHERE so.status = 'finished'
    AND NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.student_id = e.user_id AND a.session_id = so.session_id)
  ON CONFLICT (student_id, session_id) DO NOTHING;
  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN v_added;
END
$$;
REVOKE ALL ON FUNCTION private.mark_absent_for_finished_sessions() FROM PUBLIC, anon, authenticated;

-- Every minute, so a session's no-shows appear within a minute of it ending.
SELECT cron.schedule('mark-absent-after-sessions', '* * * * *', $job$ SELECT private.mark_absent_for_finished_sessions() $job$);
