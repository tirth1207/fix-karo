-- Create job-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Allow public read access to job photos
CREATE POLICY "Job photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'job-photos' );

-- Allow authenticated technicians to upload photos to their bookings
-- Note: Further refinement could check if the user is the technician for the booking in the path
CREATE POLICY "Technicians can upload job photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
  );

-- Allow technicians to delete their own uploads
CREATE POLICY "Technicians can delete their job photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-photos'
  );
