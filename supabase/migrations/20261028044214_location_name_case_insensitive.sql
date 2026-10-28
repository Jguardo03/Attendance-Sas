-- Location names are unique ignoring case and surrounding spaces: "Room 1" and "room 1 " are the same room.
ALTER TABLE public.location DROP CONSTRAINT uq_location_name;
CREATE UNIQUE INDEX uq_location_name_ci ON public.location (lower(btrim(name)));
