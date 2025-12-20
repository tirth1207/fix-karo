-- Create OTP verification table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  otp_code TEXT NOT NULL,
  otp_type TEXT NOT NULL CHECK (otp_type IN ('job_start', 'job_completion')),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user ON public.otp_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_booking ON public.otp_verifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_otp_code ON public.otp_verifications(otp_code) WHERE NOT verified;

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their OTPs" ON public.otp_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert OTPs" ON public.otp_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their OTPs" ON public.otp_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create device binding table
CREATE TABLE IF NOT EXISTS public.device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  device_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  risk_score INTEGER DEFAULT 0,
  forced_logout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_bindings_user ON public.device_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_device_bindings_device ON public.device_bindings(device_id);
CREATE INDEX IF NOT EXISTS idx_device_bindings_active ON public.device_bindings(is_active) WHERE is_active = TRUE;

ALTER TABLE public.device_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their devices" ON public.device_bindings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their devices" ON public.device_bindings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert devices" ON public.device_bindings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all devices" ON public.device_bindings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Track device changes for technicians
CREATE OR REPLACE FUNCTION track_device_changes()
RETURNS TRIGGER AS $$
DECLARE
  active_device_count INTEGER;
  profile_role user_role;
BEGIN
  -- Get user role
  SELECT role INTO profile_role
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Only enforce for technicians
  IF profile_role = 'technician' AND NEW.is_active = TRUE THEN
    -- Count currently active devices
    SELECT COUNT(*)
    INTO active_device_count
    FROM public.device_bindings
    WHERE user_id = NEW.user_id
      AND is_active = TRUE
      AND id != NEW.id;
    
    -- If there's already an active device, deactivate it
    IF active_device_count > 0 THEN
      UPDATE public.device_bindings
      SET is_active = FALSE,
          forced_logout_at = NOW()
      WHERE user_id = NEW.user_id
        AND is_active = TRUE
        AND id != NEW.id;
      
      -- Create fraud alert for device change
      INSERT INTO public.fraud_alerts (
        user_id,
        alert_type,
        severity,
        description,
        status
      ) VALUES (
        NEW.user_id,
        'device_change_detected',
        'medium',
        format('Technician logged in from new device: %s (previous devices deactivated)', NEW.device_id),
        'open'
      );
      
      -- Increment risk score
      NEW.risk_score := 10;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_device_change
  BEFORE INSERT OR UPDATE ON public.device_bindings
  FOR EACH ROW
  EXECUTE FUNCTION track_device_changes();
