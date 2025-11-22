-- Create ai_settings table
CREATE TABLE public.ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT UNIQUE NOT NULL DEFAULT 'default_ai_config', -- Allows for multiple configs if needed, but one for now
  api_key TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
  temperature NUMERIC DEFAULT 0.0,
  max_tokens INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy for admin/controller to read settings
CREATE POLICY "Allow admin and controller to read AI settings" ON public.ai_settings
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'controller')));

-- Policy for admin/controller to insert settings (only if no default exists)
CREATE POLICY "Allow admin and controller to insert AI settings" ON public.ai_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'controller')));

-- Policy for admin/controller to update settings
CREATE POLICY "Allow admin and controller to update AI settings" ON public.ai_settings
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'controller')));

-- Policy for admin to delete settings
CREATE POLICY "Allow admin to delete AI settings" ON public.ai_settings
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));