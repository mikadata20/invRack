-- =================================================================
-- 1. RACK INVENTORY (Stores current stock levels)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.rack_inventory (
  id SERIAL PRIMARY KEY,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  qty INTEGER DEFAULT 0 NOT NULL,
  safety_stock INTEGER DEFAULT 0,
  last_supply TIMESTAMP WITH TIME ZONE,
  last_picking TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (part_no, rack_location)
);

-- Enable RLS
ALTER TABLE public.rack_inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Controller can manage (CRUD) all inventory
CREATE POLICY "Admin/Controller full access to inventory" ON public.rack_inventory
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'controller'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'controller'))
);

-- Policy: Operators can update qty (supply/picking/kobetsu)
CREATE POLICY "Operators can update inventory qty" ON public.rack_inventory
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
);

-- Policy: All authenticated users can read inventory
CREATE POLICY "Authenticated users can read inventory" ON public.rack_inventory
FOR SELECT TO authenticated USING (true);


-- =================================================================
-- 2. BOM MASTER (Bill of Materials)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.bom_master (
  id SERIAL PRIMARY KEY,
  unix_no TEXT NOT NULL,
  model TEXT NOT NULL,
  cyl TEXT,
  parent_part TEXT NOT NULL,
  child_part TEXT NOT NULL,
  part_name TEXT NOT NULL,
  bom TEXT,
  label_code TEXT,
  rack TEXT,
  location TEXT,
  kanban_code TEXT,
  sequence INTEGER,
  qty_per_set INTEGER DEFAULT 1 NOT NULL,
  qty_bom INTEGER,
  assy_line_no TEXT,
  source TEXT DEFAULT 'KYBJ',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (unix_no, child_part)
);

-- Enable RLS
ALTER TABLE public.bom_master ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Controller full access to BOM
CREATE POLICY "Admin/Controller full access to BOM" ON public.bom_master
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'controller'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'controller'))
);

-- Policy: All authenticated users can read BOM
CREATE POLICY "Authenticated users can read BOM" ON public.bom_master
FOR SELECT TO authenticated USING (true);


-- =================================================================
-- 3. TRANSACTION LOG (For process duration and error tracking)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.transaction_log (
  id SERIAL PRIMARY KEY,
  process_type TEXT NOT NULL, -- SUPPLY, PICKING, KOBETSU
  part_no TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  qty INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_sec INTEGER,
  is_error BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.transaction_log ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can insert transactions
CREATE POLICY "Authenticated users can insert transaction_log" ON public.transaction_log
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: All authenticated users can read transactions
CREATE POLICY "Authenticated users can read transaction_log" ON public.transaction_log
FOR SELECT TO authenticated USING (true);


-- =================================================================
-- 4. STOCK TRANSACTIONS (For detailed traceability)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL, -- SUPPLY, PICKING, KOBETSU
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty INTEGER NOT NULL, -- Positive for IN, Negative for OUT
  rack_location TEXT NOT NULL,
  source_location TEXT,
  document_ref TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can insert stock transactions
CREATE POLICY "Authenticated users can insert stock_transactions" ON public.stock_transactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: All authenticated users can read stock transactions
CREATE POLICY "Authenticated users can read stock_transactions" ON public.stock_transactions
FOR SELECT TO authenticated USING (true);


-- =================================================================
-- 5. ACTIVITY LOG (For system audit trail)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  action_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE, ADJUST_STOCK
  table_name TEXT NOT NULL,
  record_id TEXT,
  description TEXT,
  old_data JSONB,
  new_data JSONB
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can insert activity log
CREATE POLICY "Authenticated users can insert activity_log" ON public.activity_log
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: All authenticated users can read activity log
CREATE POLICY "Authenticated users can read activity_log" ON public.activity_log
FOR SELECT TO authenticated USING (true);


-- =================================================================
-- 6. STOCK ADJUSTMENTS (For manual stock corrections)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id SERIAL PRIMARY KEY,
  adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  adjusted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  adjust_qty INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Controller can insert stock adjustments
CREATE POLICY "Admin/Controller can insert stock_adjustments" ON public.stock_adjustments
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'controller'))
);

-- Policy: All authenticated users can read stock adjustments
CREATE POLICY "Authenticated users can read stock_adjustments" ON public.stock_adjustments
FOR SELECT TO authenticated USING (true);