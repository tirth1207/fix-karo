-- Detect and flag duplicate photo hashes
CREATE OR REPLACE FUNCTION detect_duplicate_photo_fraud()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  other_booking_ids UUID[];
BEGIN
  -- Check if this photo hash has been used before by the same technician
  SELECT COUNT(*), ARRAY_AGG(DISTINCT booking_id)
  INTO duplicate_count, other_booking_ids
  FROM public.job_photos
  WHERE image_hash = NEW.image_hash
    AND technician_id = NEW.technician_id
    AND booking_id != NEW.booking_id;
  
  IF duplicate_count > 0 THEN
    -- Create fraud alert
    INSERT INTO public.fraud_alerts (
      user_id,
      alert_type,
      severity,
      description,
      status
    ) VALUES (
      NEW.technician_id,
      'duplicate_photo_hash',
      'high',
      format('Photo hash %s reused across %s bookings: %s', 
        LEFT(NEW.image_hash, 8), duplicate_count + 1, other_booking_ids::TEXT),
      'open'
    );
    
    -- Update fraud metrics
    INSERT INTO public.fraud_metrics (
      user_id,
      metric_type,
      metric_value,
      threshold_exceeded
    ) VALUES (
      NEW.technician_id,
      'duplicate_photo_usage',
      duplicate_count + 1,
      TRUE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_photo_fraud
  AFTER INSERT ON public.job_photos
  FOR EACH ROW
  EXECUTE FUNCTION detect_duplicate_photo_fraud();

-- Detect suspiciously fast job completions
CREATE OR REPLACE FUNCTION detect_rapid_completion_fraud()
RETURNS TRIGGER AS $$
DECLARE
  duration_minutes INTEGER;
  expected_duration INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate actual duration
    duration_minutes := EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 60;
    expected_duration := NEW.estimated_duration_minutes;
    
    -- Flag if completed in less than 30% of expected time (minimum 15 minutes)
    IF duration_minutes < GREATEST(expected_duration * 0.3, 15) THEN
      INSERT INTO public.fraud_alerts (
        user_id,
        alert_type,
        severity,
        description,
        status
      ) VALUES (
        NEW.technician_id,
        'rapid_job_completion',
        CASE 
          WHEN duration_minutes < 10 THEN 'critical'
          WHEN duration_minutes < 20 THEN 'high'
          ELSE 'medium'
        END,
        format('Job completed in %s minutes (expected %s minutes). Booking ID: %s',
          duration_minutes, expected_duration, NEW.id),
        'open'
      );
      
      INSERT INTO public.fraud_metrics (
        user_id,
        metric_type,
        metric_value,
        threshold_exceeded
      ) VALUES (
        NEW.technician_id,
        'rapid_completion_minutes',
        duration_minutes,
        TRUE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_rapid_completion
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION detect_rapid_completion_fraud();

-- Detect GPS location anomalies
CREATE OR REPLACE FUNCTION detect_gps_fraud()
RETURNS TRIGGER AS $$
DECLARE
  booking_gps_lat DECIMAL;
  booking_gps_lon DECIMAL;
  allowed_radius INTEGER;
  actual_distance DECIMAL;
BEGIN
  -- Get booking location
  SELECT service_gps_latitude, service_gps_longitude, allowed_gps_radius_meters
  INTO booking_gps_lat, booking_gps_lon, allowed_radius
  FROM public.bookings
  WHERE id = NEW.booking_id;
  
  -- Skip if no GPS set for booking
  IF booking_gps_lat IS NULL OR booking_gps_lon IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate distance
  actual_distance := calculate_gps_distance(
    booking_gps_lat, booking_gps_lon,
    NEW.gps_latitude, NEW.gps_longitude
  );
  
  -- Alert if significantly outside allowed radius
  IF actual_distance > allowed_radius * 2 THEN
    INSERT INTO public.fraud_alerts (
      user_id,
      alert_type,
      severity,
      description,
      status
    ) VALUES (
      NEW.technician_id,
      'gps_location_mismatch',
      CASE 
        WHEN actual_distance > allowed_radius * 5 THEN 'critical'
        WHEN actual_distance > allowed_radius * 3 THEN 'high'
        ELSE 'medium'
      END,
      format('Photo taken %.0f meters from service location (allowed: %s meters). Booking ID: %s',
        actual_distance, allowed_radius, NEW.booking_id),
      'open'
    );
    
    INSERT INTO public.fraud_metrics (
      user_id,
      metric_type,
      metric_value,
      threshold_exceeded
    ) VALUES (
      NEW.technician_id,
      'gps_distance_violation_meters',
      actual_distance,
      TRUE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_gps_anomaly
  AFTER INSERT ON public.job_photos
  FOR EACH ROW
  EXECUTE FUNCTION detect_gps_fraud();

-- Auto-suspend on critical fraud alerts
CREATE OR REPLACE FUNCTION auto_suspend_on_critical_fraud()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    -- Suspend technician profile
    UPDATE public.technician_profiles
    SET 
      verification_status = 'suspended',
      suspended_at = NOW(),
      suspension_reason = format('Auto-suspended due to critical fraud alert: %s', NEW.alert_type),
      is_active = FALSE
    WHERE id = NEW.user_id;
    
    -- Log the suspension
    INSERT INTO public.activity_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'auto_suspended',
      'technician_profile',
      NEW.user_id,
      jsonb_build_object(
        'alert_id', NEW.id,
        'alert_type', NEW.alert_type,
        'severity', NEW.severity
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_suspend_critical_fraud
  AFTER INSERT ON public.fraud_alerts
  FOR EACH ROW
  WHEN (NEW.severity = 'critical')
  EXECUTE FUNCTION auto_suspend_on_critical_fraud();

-- Enhanced cancellation tracking with rolling window
CREATE OR REPLACE FUNCTION enhanced_cancellation_tracking()
RETURNS TRIGGER AS $$
DECLARE
  cancellation_count_7d INTEGER;
  cancellation_count_30d INTEGER;
  total_bookings_30d INTEGER;
  cancellation_ratio DECIMAL;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Count cancellations in rolling windows
    SELECT 
      COUNT(*) FILTER (WHERE cancelled_at > NOW() - INTERVAL '7 days'),
      COUNT(*) FILTER (WHERE cancelled_at > NOW() - INTERVAL '30 days')
    INTO cancellation_count_7d, cancellation_count_30d
    FROM public.bookings
    WHERE cancelled_by = NEW.cancelled_by
      AND status = 'cancelled';
    
    -- Count total bookings in 30 days
    SELECT COUNT(*)
    INTO total_bookings_30d
    FROM public.bookings
    WHERE (customer_id = NEW.cancelled_by OR technician_id = NEW.cancelled_by)
      AND created_at > NOW() - INTERVAL '30 days';
    
    -- Calculate ratio
    IF total_bookings_30d > 0 THEN
      cancellation_ratio := cancellation_count_30d::DECIMAL / total_bookings_30d;
    ELSE
      cancellation_ratio := 0;
    END IF;
    
    -- Create alert if thresholds exceeded
    IF cancellation_count_7d >= 3 OR cancellation_ratio > 0.5 THEN
      INSERT INTO public.fraud_alerts (
        user_id,
        alert_type,
        severity,
        description,
        status
      ) VALUES (
        NEW.cancelled_by,
        'high_cancellation_rate',
        CASE 
          WHEN cancellation_count_7d >= 5 OR cancellation_ratio > 0.7 THEN 'high'
          ELSE 'medium'
        END,
        format('User has cancelled %s bookings in 7 days, %s in 30 days (%.0f%% cancellation rate)',
          cancellation_count_7d, cancellation_count_30d, cancellation_ratio * 100),
        'open'
      );
    END IF;
    
    -- Update metrics
    INSERT INTO public.fraud_metrics (
      user_id,
      metric_type,
      metric_value,
      threshold_exceeded
    ) VALUES 
      (NEW.cancelled_by, 'cancellations_7d', cancellation_count_7d, cancellation_count_7d >= 3),
      (NEW.cancelled_by, 'cancellation_ratio_30d', cancellation_ratio, cancellation_ratio > 0.5);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_cancellations ON public.bookings;
CREATE TRIGGER track_cancellations
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION enhanced_cancellation_tracking();
