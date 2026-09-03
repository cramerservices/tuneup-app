ALTER TABLE public.inspection_items
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE public.inspection_items
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL
  AND photo_url <> ''
  AND cardinality(photo_urls) = 0;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view inspection photos" ON storage.objects;
CREATE POLICY "Public can view inspection photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "Authenticated users can upload inspection photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload inspection photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "Authenticated users can update inspection photos" ON storage.objects;
CREATE POLICY "Authenticated users can update inspection photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inspection-photos')
  WITH CHECK (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "Authenticated users can delete inspection photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete inspection photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspection-photos');
