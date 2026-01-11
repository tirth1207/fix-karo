-- 022_advanced_availability_sync.sql
-- Fulfills requirement to automatically generate service_city_availability entries 
-- based on technician location and coverage radius.

-- 1. Ensure geolocation columns exist in profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 2. Create a reference table for serviceable cities if it doesn't exist
-- This table will be used to match coordinates against technician coverage
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state)
);

-- Index for spatial queries (B-Tree on lat/long is okay for small sets, 
-- but we use the existing calculate_gps_distance function)
CREATE INDEX IF NOT EXISTS idx_cities_coords ON public.cities(latitude, longitude);

-- 3. Trigger function to compute and insert availability
CREATE OR REPLACE FUNCTION public.sync_service_availability_by_radius()
RETURNS TRIGGER AS $$
DECLARE
  tech_lat DECIMAL;
  tech_lon DECIMAL;
  radius_meters DECIMAL;
BEGIN
  -- We only proceed if the service is active and approved
  IF (NEW.is_active = TRUE AND NEW.approval_status = 'approved') THEN
    
    -- Fetch technician coordinates from profile
    SELECT latitude, longitude INTO tech_lat, tech_lon
    FROM public.profiles
    WHERE id = NEW.technician_id;

    -- If coordinates are missing, we cannot compute radius-based availability
    IF tech_lat IS NULL OR tech_lon IS NULL THEN
      RETURN NEW;
    END IF;

    radius_meters := NEW.coverage_radius_km * 1000;

    -- Upsert availability for all cities within range
    -- We use the pre-existing calculate_gps_distance function (from 007_job_photos_and_gps.sql)
    INSERT INTO public.service_city_availability (
      service_id,
      city,
      state,
      is_enabled
    )
    SELECT 
      NEW.service_id,
      c.name,
      c.state,
      TRUE
    FROM public.cities c
    WHERE calculate_gps_distance(tech_lat, tech_lon, c.latitude, c.longitude) <= radius_meters
    ON CONFLICT (service_id, city, state) 
    DO UPDATE SET is_enabled = TRUE, created_at = NOW();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply the trigger to technician_services
DROP TRIGGER IF EXISTS trigger_sync_availability ON public.technician_services;
CREATE TRIGGER trigger_sync_availability
  AFTER INSERT OR UPDATE ON public.technician_services
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_service_availability_by_radius();

COMMENT ON FUNCTION public.sync_service_availability_by_radius() IS 'Automatically populates service_city_availability based on technician coverage radius and geolocated cities.';
