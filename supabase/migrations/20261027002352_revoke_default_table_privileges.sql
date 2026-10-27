-- Supabase's default ACL still hands TRUNCATE / REFERENCES / TRIGGER (and MAINTAIN) to anon and authenticated.
-- TRUNCATE is not subject to RLS, so remove them from every Data API role except service_role.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon, authenticated;
