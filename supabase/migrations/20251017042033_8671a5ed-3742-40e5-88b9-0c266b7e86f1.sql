-- Create stock transaction table for traceability
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('SUPPLY', 'PICKING', 'KOBETSU')),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  rack_location TEXT NOT NULL,
  source_location TEXT,
  document_ref TEXT,
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for viewing transactions
CREATE POLICY "Users can view stock transactions"
ON public.stock_transactions
FOR SELECT
USING (true);

-- Policy for inserting transactions
CREATE POLICY "Users can create stock transactions"
ON public.stock_transactions
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_stock_transactions_type ON public.stock_transactions(transaction_type);
CREATE INDEX idx_stock_transactions_item ON public.stock_transactions(item_code);
CREATE INDEX idx_stock_transactions_timestamp ON public.stock_transactions(timestamp DESC);

-- Add qty_bom column to bom_master if not exists (for Revisi 2)
ALTER TABLE public.bom_master 
ADD COLUMN IF NOT EXISTS qty_bom INTEGER DEFAULT 1;

COMMENT ON COLUMN public.bom_master.qty_bom IS 'Quantity per BOM unit for calculating pick up quantity';
COMMENT ON TABLE public.stock_transactions IS 'Records all IN/OUT transactions for material traceability';