
-- Files are keyed as "<business_id>/<...>"; first path segment is the business id.

CREATE POLICY "source-uploads: members read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'source-uploads'
  AND public.is_business_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "source-uploads: sales+ upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'source-uploads'
  AND (
    public.can_write_sales((storage.foldername(name))[1]::uuid)
    OR public.can_write_inventory((storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "source-uploads: sales+ update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'source-uploads'
  AND (
    public.can_write_sales((storage.foldername(name))[1]::uuid)
    OR public.can_write_inventory((storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "source-uploads: managers delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'source-uploads'
  AND public.can_write_business((storage.foldername(name))[1]::uuid)
);
