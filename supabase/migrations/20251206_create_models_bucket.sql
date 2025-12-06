-- Create a new private bucket 'models'
INSERT INTO storage.buckets (id, name, public) VALUES ('models', 'models', true);

-- Policy to allow anyone to read (SELECT) models
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'models' );

-- Policy to allow authenticated users to upload (INSERT) models
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'models' AND auth.role() = 'authenticated' );
