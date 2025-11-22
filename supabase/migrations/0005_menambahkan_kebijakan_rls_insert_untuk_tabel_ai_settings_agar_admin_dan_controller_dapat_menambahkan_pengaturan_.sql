CREATE POLICY "Admins and Controllers can insert settings" ON public.ai_settings
FOR INSERT TO authenticated
WITH CHECK (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'controller'::app_role])))));