-- The Edge Functions read session_overview with the server (service_role) key. Views created after the first migration
-- do not get the table grants it made, so give the server role read access to the two Phase 7 views.
GRANT SELECT ON public.session_overview, public.schedule_overview TO service_role;
