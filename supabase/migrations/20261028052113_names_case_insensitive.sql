-- Names are unique ignoring case and surrounding spaces ("Maths" = "maths "), as already done for location names.
ALTER TABLE public.role DROP CONSTRAINT uq_role_name;
CREATE UNIQUE INDEX uq_role_name_ci ON public.role (lower(btrim(name)));

ALTER TABLE public.permissions DROP CONSTRAINT uq_permissions_name;
CREATE UNIQUE INDEX uq_permissions_name_ci ON public.permissions (lower(btrim(name)));

ALTER TABLE public.class DROP CONSTRAINT uq_class_name;
CREATE UNIQUE INDEX uq_class_name_ci ON public.class (lower(btrim(name)));

ALTER TABLE public.academic_period DROP CONSTRAINT uq_academic_period_name;
CREATE UNIQUE INDEX uq_academic_period_name_ci ON public.academic_period (lower(btrim(name)));

ALTER TABLE public.frequency DROP CONSTRAINT uq_frequency_name;
CREATE UNIQUE INDEX uq_frequency_name_ci ON public.frequency (lower(btrim(name)));
