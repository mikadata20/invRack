-- Create ai_settings table
CREATE TABLE public.ai_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and Controllers can read all settings
CREATE POLICY "Admins and Controllers can read settings" ON public.ai_settings 
FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'controller'::app_role]))));

-- Policy: Admins and Controllers can update settings
CREATE POLICY "Admins and Controllers can update settings" ON public.ai_settings 
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'controller'::app_role]))));