-- Create 'evidence' bucket for Screenshots and Videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads (or public for now since worker is backend)
-- NOTE: If you have strict RLS, you might need to adjust this.
-- For now, enabling public access for simplicity in this dev environment.

CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'evidence' );

CREATE POLICY "Public Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'evidence' );

CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'evidence' );
