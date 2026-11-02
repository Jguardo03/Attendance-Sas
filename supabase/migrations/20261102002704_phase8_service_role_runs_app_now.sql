-- session_overview calls app_now() for its status and now_local columns, so the server role needs to run it too.
GRANT EXECUTE ON FUNCTION public.app_now() TO service_role;
