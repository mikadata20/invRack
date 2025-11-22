-- Hapus kebijakan SELECT yang ada
DROP POLICY IF EXISTS "Admins and Controllers can read settings" ON public.ai_settings;

-- Buat kebijakan SELECT baru yang memungkinkan pengguna terautentikasi (termasuk fungsi Edge dengan service role key) untuk membaca pengaturan.
CREATE POLICY "Allow authenticated read for ai_settings" ON public.ai_settings
FOR SELECT TO authenticated
USING (true);