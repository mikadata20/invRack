DROP POLICY IF EXISTS "Admins and Controllers can update settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Admins and Controllers can insert settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Allow authenticated read for ai_settings" ON public.ai_settings;