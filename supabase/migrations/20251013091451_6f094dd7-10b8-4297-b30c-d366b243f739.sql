-- Create rack_inventory table
CREATE TABLE public.rack_inventory (
  id SERIAL PRIMARY KEY,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(part_no, rack_location)
);

-- Create kanban_master table
CREATE TABLE public.kanban_master (
  id SERIAL PRIMARY KEY,
  kanban_code TEXT NOT NULL UNIQUE,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1
);

-- Create transaction_log table
CREATE TABLE public.transaction_log (
  id SERIAL PRIMARY KEY,
  process_type TEXT NOT NULL CHECK (process_type IN ('SUPPLY', 'PICKING', 'KOBETSU')),
  part_no TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  qty INTEGER NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_sec INTEGER,
  is_error BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  user_id UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.rack_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_log ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view inventory" ON public.rack_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update inventory" ON public.rack_inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can view kanban master" ON public.kanban_master
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage kanban master" ON public.kanban_master
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can view transaction logs" ON public.transaction_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create transaction logs" ON public.transaction_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_rack_inventory_part ON public.rack_inventory(part_no);
CREATE INDEX idx_rack_inventory_location ON public.rack_inventory(rack_location);
CREATE INDEX idx_kanban_code ON public.kanban_master(kanban_code);
CREATE INDEX idx_transaction_log_date ON public.transaction_log(start_time DESC);
CREATE INDEX idx_transaction_log_type ON public.transaction_log(process_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rack_inventory
CREATE TRIGGER update_rack_inventory_updated_at
  BEFORE UPDATE ON public.rack_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.rack_inventory (part_no, part_name, rack_location, qty) VALUES
  ('P001', 'Engine Component A', 'EA-1-1', 100),
  ('P002', 'Brake Pad Set', 'EA-1-2', 50),
  ('P003', 'Oil Filter', 'EA-2-1', 200),
  ('P004', 'Air Filter', 'EA-2-2', 75),
  ('P005', 'Spark Plug', 'EA-3-1', 150);

INSERT INTO public.kanban_master (kanban_code, part_no, part_name, rack_location, qty) VALUES
  ('KB001', 'P001', 'Engine Component A', 'EA-1-1', 10),
  ('KB002', 'P002', 'Brake Pad Set', 'EA-1-2', 5),
  ('KB003', 'P003', 'Oil Filter', 'EA-2-1', 20),
  ('KB004', 'P004', 'Air Filter', 'EA-2-2', 8),
  ('KB005', 'P005', 'Spark Plug', 'EA-3-1', 15);