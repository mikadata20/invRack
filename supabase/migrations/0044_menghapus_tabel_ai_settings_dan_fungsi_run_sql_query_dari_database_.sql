-- Drop policies first
DROP POLICY IF EXISTS "Allow admin and controller to read AI settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Allow admin and controller to insert AI settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Allow admin and controller to update AI settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Allow admin to delete AI settings" ON public.ai_settings;

-- Drop the ai_settings table
DROP TABLE IF EXISTS public.ai_settings;

-- Drop the run_sql_query function
DROP FUNCTION IF EXISTS public.run_sql_query(TEXT);