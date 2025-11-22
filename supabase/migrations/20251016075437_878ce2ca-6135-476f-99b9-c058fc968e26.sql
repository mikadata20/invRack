-- Add qty_per_set field to bom_master for quantity calculations
ALTER TABLE public.bom_master
ADD COLUMN qty_per_set integer DEFAULT 1 NOT NULL;

COMMENT ON COLUMN public.bom_master.qty_per_set IS 'Base quantity per set/box for picking calculations';