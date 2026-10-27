-- Event-trigger helper created by the "automatic RLS" project option: nobody should call it through the API.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- The pre-login email check is only needed before sign-in.
REVOKE EXECUTE ON FUNCTION public.is_allowed_email(text) FROM authenticated;

-- One permissive SELECT policy per table: split the FOR ALL "<table>_manage" policies into
-- insert / update / delete policies where a dedicated SELECT policy already exists.
CREATE OR REPLACE FUNCTION pg_temp.split_manage(p_tbl text, p_perm text, p_ops text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE op text;
BEGIN
  EXECUTE format('DROP POLICY %I ON public.%I', p_tbl || '_manage', p_tbl);
  FOREACH op IN ARRAY p_ops LOOP
    IF op = 'insert' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_permission(%L)))', p_tbl || '_insert', p_tbl, p_perm);
    ELSIF op = 'update' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.has_permission(%L))) WITH CHECK ((SELECT private.has_permission(%L)))', p_tbl || '_update', p_tbl, p_perm, p_perm);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT private.has_permission(%L)))', p_tbl || '_delete', p_tbl, p_perm);
    END IF;
  END LOOP;
END $$;

SELECT pg_temp.split_manage('role', 'roles.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('email_parm', 'email_formats.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('frequency', 'classes.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('academic_period', 'periods.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('class', 'classes.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('location', 'locations.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('class_schedule', 'classes.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('class_session', 'classes.manage', ARRAY['insert','update','delete']);
SELECT pg_temp.split_manage('enrollment', 'classes.manage', ARRAY['insert','delete']);

-- email_parm SELECT must still cover the people who manage formats
DROP POLICY email_parm_select ON public.email_parm;
CREATE POLICY email_parm_select ON public.email_parm FOR SELECT TO authenticated
  USING ((SELECT private.has_permission('users.manage')) OR (SELECT private.has_permission('email_formats.manage')));
