-- Phase 6: QR on/off flag, room availability and session generation.

-- Clients cannot read qr_secret_seed. This generated flag lets the Admin screens show "QR check-in on/off"
-- without exposing any part of the secret.
ALTER TABLE public.location
  ADD COLUMN qr_enabled boolean GENERATED ALWAYS AS (qr_secret_seed IS NOT NULL) STORED;
GRANT SELECT (qr_enabled) ON public.location TO authenticated;

-- Which locations are free or booked for a slot. Mirrors the uq_schedule_location_slot exclusion constraint
-- (same location, period and weekday, overlapping time range). The constraint stays the source of truth.
-- SECURITY INVOKER: row level security decides what the caller can see.
CREATE FUNCTION public.locations_availability(
  p_period_id integer,
  p_week_day smallint,
  p_start time,
  p_end time,
  p_exclude_schedule_id integer DEFAULT NULL
) RETURNS TABLE (location_id integer, location_name text, booked_schedule_id integer, booked_class text)
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT l.id, l.name::text, b.schedule_id, b.class_name
  FROM public.location l
  LEFT JOIN LATERAL (
    SELECT cs.id AS schedule_id, c.name::text AS class_name
    FROM public.class_schedule cs
    JOIN public.class c ON c.id = cs.class_id
    WHERE cs.location_id = l.id
      AND cs.academic_period_id = p_period_id
      AND cs.week_day = p_week_day
      AND (p_exclude_schedule_id IS NULL OR cs.id <> p_exclude_schedule_id)
      AND tsrange('2000-01-01'::date + cs.start_time, '2000-01-01'::date + cs.end_time)
          && tsrange('2000-01-01'::date + p_start, '2000-01-01'::date + p_end)
    ORDER BY cs.id
    LIMIT 1
  ) b ON true
  ORDER BY l.name
$$;

-- Creates the class_session rows for one schedule: from the period start to its finish, on the schedule's
-- weekday (ISO, 1 = Monday), stepping by the frequency's interval_days. Safe to run again: existing dates
-- are skipped. Returns how many rows were added. SECURITY INVOKER, so only people who may insert sessions can use it.
CREATE FUNCTION public.generate_sessions(p_schedule_id integer) RETURNS integer
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
BEGIN
  WITH s AS (
    SELECT cs.id, cs.week_day, p.start_date, p.finish_date, f.interval_days,
           p.start_date + ((cs.week_day - extract(isodow FROM p.start_date)::integer + 7) % 7) AS first_date
    FROM public.class_schedule cs
    JOIN public.academic_period p ON p.id = cs.academic_period_id
    JOIN public.frequency f ON f.id = cs.frequency_id
    WHERE cs.id = p_schedule_id
  ), ins AS (
    INSERT INTO public.class_session (class_schedule_id, session_date)
    SELECT s.id, d::date
    FROM s, generate_series(s.first_date::timestamp, s.finish_date::timestamp, make_interval(days => s.interval_days)) d
    ON CONFLICT (class_schedule_id, session_date) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;
  RETURN v_inserted;
END
$$;

REVOKE ALL ON FUNCTION public.locations_availability(integer, smallint, time, time, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_sessions(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.locations_availability(integer, smallint, time, time, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_sessions(integer) TO authenticated;
