-- Create partner_rack table
CREATE TABLE IF NOT EXISTS public.partner_rack (
  id SERIAL PRIMARY KEY,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  qty_per_box INTEGER DEFAULT 0,
  type TEXT CHECK (type IN ('Big', 'Small')),
  rack_location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_rack ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.partner_rack
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.partner_rack
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.partner_rack
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.partner_rack
  FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_partner_rack_part_no ON public.partner_rack(part_no);
CREATE INDEX idx_partner_rack_location ON public.partner_rack(rack_location);
