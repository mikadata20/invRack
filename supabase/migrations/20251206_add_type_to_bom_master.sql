-- Add type column to bom_master
ALTER TABLE public.bom_master 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('Big', 'Small'));

COMMENT ON COLUMN public.bom_master.type IS 'Type of the part (Big/Small) for classification purposes';
