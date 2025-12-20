-- Constraint: Technician price must be within platform bounds
CREATE OR REPLACE FUNCTION validate_technician_price()
RETURNS TRIGGER AS $$
DECLARE
  service_min_price DECIMAL(10,2);
  service_max_price DECIMAL(10,2);
BEGIN
  -- Get service price bounds
  SELECT min_price, max_price INTO service_min_price, service_max_price
  FROM public.services
  WHERE id = NEW.service_id;

  -- Validate custom price is within bounds
  IF NEW.custom_price < service_min_price OR NEW.custom_price > service_max_price THEN
    RAISE EXCEPTION 'Custom price %.2f is outside allowed range (%.2f - %.2f)', 
      NEW.custom_price, service_min_price, service_max_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_price_bounds
  BEFORE INSERT OR UPDATE ON public.technician_services
  FOR EACH ROW
  EXECUTE FUNCTION validate_technician_price();

-- Constraint: Auto-disable technician services when suspended
CREATE OR REPLACE FUNCTION auto_disable_suspended_technician_services()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'suspended' THEN
    -- Disable all services for suspended technician
    UPDATE public.technician_services
    SET is_active = FALSE, updated_at = NOW()
    WHERE technician_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disable_services_on_suspension
  AFTER UPDATE ON public.technician_profiles
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION auto_disable_suspended_technician_services();

-- Constraint: Mark service as having bookings (makes it immutable)
CREATE OR REPLACE FUNCTION mark_service_has_bookings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.services
  SET has_bookings = TRUE
  WHERE id = (
    SELECT service_id FROM public.technician_services WHERE id = NEW.service_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_service_has_bookings
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION mark_service_has_bookings();

-- Constraint: Prevent editing services that have bookings (require versioning)
CREATE OR REPLACE FUNCTION prevent_service_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.has_bookings = TRUE THEN
    RAISE EXCEPTION 'Cannot modify service that has existing bookings. Create a new version instead.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_service_immutability
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  WHEN (OLD.has_bookings = TRUE)
  EXECUTE FUNCTION prevent_service_mutation();

-- Constraint: Log price deviations for fraud detection
CREATE OR REPLACE FUNCTION log_price_audit()
RETURNS TRIGGER AS $$
DECLARE
  platform_price DECIMAL(10,2);
  tech_price DECIMAL(10,2);
  variance_pct DECIMAL(5,2);
BEGIN
  -- Get platform base price
  SELECT s.base_price INTO platform_price
  FROM public.services s
  JOIN public.technician_services ts ON ts.service_id = s.id
  WHERE ts.id = NEW.service_id;

  -- Get technician's custom price
  SELECT ts.custom_price INTO tech_price
  FROM public.technician_services ts
  WHERE ts.id = NEW.service_id;

  -- Calculate variance
  variance_pct := ABS((NEW.total_amount - platform_price) / platform_price * 100);

  -- Insert audit log
  INSERT INTO public.price_audit_logs (
    booking_id,
    service_id,
    platform_price,
    technician_quoted_price,
    final_charged_price,
    price_variance_percent,
    is_suspicious,
    payment_method
  ) VALUES (
    NEW.id,
    (SELECT service_id FROM public.technician_services WHERE id = NEW.service_id),
    platform_price,
    tech_price,
    NEW.total_amount,
    variance_pct,
    variance_pct > 20, -- flag if >20% deviation
    'platform'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_booking_price
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_price_audit();

-- Constraint: Track preferred technician relationships
CREATE OR REPLACE FUNCTION track_preferred_technician()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.preferred_technicians (
    customer_id,
    technician_id,
    service_id,
    last_booking_id,
    total_bookings
  ) VALUES (
    NEW.customer_id,
    NEW.technician_id,
    (SELECT service_id FROM public.technician_services WHERE id = NEW.service_id),
    NEW.id,
    1
  )
  ON CONFLICT (customer_id, technician_id, service_id)
  DO UPDATE SET
    last_booking_id = NEW.id,
    total_bookings = public.preferred_technicians.total_bookings + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_preferred_technician
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION track_preferred_technician();

-- Constraint: Detect offline payment leakage
CREATE OR REPLACE FUNCTION detect_offline_leakage()
RETURNS TRIGGER AS $$
DECLARE
  repeat_count INTEGER;
BEGIN
  -- Check if customer and technician have multiple interactions
  SELECT COUNT(*) INTO repeat_count
  FROM public.preferred_technicians
  WHERE customer_id = NEW.customer_id
    AND technician_id = NEW.technician_id
    AND total_bookings >= 3;

  -- If customer cancels after 3+ bookings, flag as potential offline deal
  IF repeat_count > 0 AND NEW.status = 'cancelled' THEN
    UPDATE public.preferred_technicians
    SET offline_contact_suspected = TRUE
    WHERE customer_id = NEW.customer_id
      AND technician_id = NEW.technician_id;

    -- Create fraud alert
    INSERT INTO public.fraud_alerts (
      user_id,
      alert_type,
      severity,
      description,
      status
    ) VALUES (
      NEW.customer_id,
      'offline_payment_suspected',
      'medium',
      'Customer cancelled booking after 3+ interactions with same technician. Possible offline arrangement.',
      'open'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flag_offline_leakage
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION detect_offline_leakage();
