-- Create job_photos table with GPS and hash enforcement
CREATE TABLE IF NOT EXISTS public.job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id),
  image_url TEXT NOT NULL,
  image_hash TEXT NOT NULL, -- SHA-256 hash
  gps_latitude DECIMAL(10, 8) NOT NULL,
  gps_longitude DECIMAL(11, 8) NOT NULL,
  gps_accuracy_meters DECIMAL(10, 2),
  taken_at TIMESTAMPTZ NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after', 'issue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_booking ON public.job_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_hash ON public.job_photos(image_hash);
CREATE INDEX IF NOT EXISTS idx_job_photos_technician ON public.job_photos(technician_id);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for job photos
CREATE POLICY "Technicians can insert their job photos" ON public.job_photos
  FOR INSERT WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Booking participants can view job photos" ON public.job_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = job_photos.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.technician_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all job photos" ON public.job_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Add service location GPS coordinates to bookings table
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS service_gps_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS service_gps_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS allowed_gps_radius_meters INTEGER DEFAULT 100;

-- Function to calculate GPS distance in meters
CREATE OR REPLACE FUNCTION calculate_gps_distance(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371000; -- meters
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate job completion requirements
CREATE OR REPLACE FUNCTION validate_job_completion()
RETURNS TRIGGER AS $$
DECLARE
  photo_count INTEGER;
  valid_gps_count INTEGER;
  service_lat DECIMAL;
  service_lon DECIMAL;
  allowed_radius INTEGER;
BEGIN
  -- Only validate when transitioning to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Get booking GPS coordinates
    SELECT service_gps_latitude, service_gps_longitude, allowed_gps_radius_meters
    INTO service_lat, service_lon, allowed_radius
    FROM public.bookings
    WHERE id = NEW.id;
    
    -- Check if at least one job photo exists
    SELECT COUNT(*)
    INTO photo_count
    FROM public.job_photos
    WHERE booking_id = NEW.id;
    
    IF photo_count = 0 THEN
      RAISE EXCEPTION 'Cannot complete booking: At least one job photo is required'
        USING HINT = 'Upload job photos before completing the booking';
    END IF;
    
    -- If GPS coordinates are set, validate photo locations
    IF service_lat IS NOT NULL AND service_lon IS NOT NULL THEN
      SELECT COUNT(*)
      INTO valid_gps_count
      FROM public.job_photos
      WHERE booking_id = NEW.id
        AND calculate_gps_distance(
          service_lat, service_lon,
          gps_latitude, gps_longitude
        ) <= allowed_radius;
      
      IF valid_gps_count = 0 THEN
        RAISE EXCEPTION 'Cannot complete booking: No photos taken within allowed GPS radius (% meters)', allowed_radius
          USING HINT = 'At least one photo must be taken at the service location';
      END IF;
    END IF;
    
    -- Validate timestamps
    IF EXISTS (
      SELECT 1 FROM public.job_photos
      WHERE booking_id = NEW.id
        AND (taken_at < NEW.actual_start_time OR taken_at > NOW())
    ) THEN
      RAISE EXCEPTION 'Cannot complete booking: Invalid photo timestamps'
        USING HINT = 'Photo timestamps must be between job start and completion';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply job completion validation trigger
DROP TRIGGER IF EXISTS enforce_job_completion_requirements ON public.bookings;
CREATE TRIGGER enforce_job_completion_requirements
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_completion();
