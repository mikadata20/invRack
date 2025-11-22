ALTER TABLE public.bom_master
ALTER COLUMN bom TYPE INTEGER USING bom::integer;