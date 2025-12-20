-- Enhanced price fraud detection and tracking

-- Track price disputes
CREATE TABLE IF NOT EXISTS public.price_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id),
  original_amount DECIMAL(10,2) NOT NULL,
  disputed_amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved_refund', 'resolved_no_refund', 'fraudulent')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_disputes_booking ON public.price_disputes(booking_id);
CREATE INDEX idx_price_disputes_customer ON public.price_disputes(customer_id);
CREATE INDEX idx_price_disputes_technician ON public.price_disputes(technician_id);
CREATE INDEX idx_price_disputes_status ON public.price_disputes(status);

-- Trigger: Track repeat price disputes for fraud scoring
CREATE OR REPLACE FUNCTION track_price_dispute_fraud()
RETURNS TRIGGER AS $$
DECLARE
  dispute_count INTEGER;
BEGIN
  -- Count disputes by this technician in last 30 days
  SELECT COUNT(*) INTO dispute_count
  FROM public.price_disputes
  WHERE technician_id = NEW.technician_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- If more than 3 disputes in 30 days, create fraud alert
  IF dispute_count > 3 THEN
    INSERT INTO public.fraud_alerts (
      user_id,
      alert_type,
      severity,
      description,
      status
    ) VALUES (
      NEW.technician_id,
      'repeat_price_disputes',
      'high',
      format('Technician has %s price disputes in the last 30 days', dispute_count),
      'open'
    );

    -- Add fraud metric
    INSERT INTO public.fraud_metrics (
      user_id,
      metric_type,
      metric_value,
      threshold_exceeded
    ) VALUES (
      NEW.technician_id,
      'price_disputes',
      dispute_count,
      TRUE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_dispute_fraud
  AFTER INSERT ON public.price_disputes
  FOR EACH ROW
  EXECUTE FUNCTION track_price_dispute_fraud();

-- Offline payment detection
CREATE TABLE IF NOT EXISTS public.offline_payment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id),
  booking_id UUID REFERENCES public.bookings(id),
  reported_by UUID NOT NULL REFERENCES public.profiles(id), -- could be customer reporting tech, or system detection
  report_type TEXT NOT NULL CHECK (report_type IN ('customer_report', 'system_detection', 'third_party_report')),
  description TEXT NOT NULL,
  evidence JSONB, -- screenshots, messages, etc
  amount_if_known DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'confirmed', 'false_alarm', 'unresolved')),
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_reports_tech ON public.offline_payment_reports(technician_id);
CREATE INDEX idx_offline_reports_customer ON public.offline_payment_reports(customer_id);
CREATE INDEX idx_offline_reports_status ON public.offline_payment_reports(status);

-- Trigger: Auto-flag warranty disable for offline payments
CREATE OR REPLACE FUNCTION disable_warranty_offline_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.booking_id IS NOT NULL THEN
    -- Update booking to disable warranty
    UPDATE public.bookings
    SET 
      technician_notes = COALESCE(technician_notes, '') || ' [WARRANTY DISABLED: Offline payment confirmed]',
      updated_at = NOW()
    WHERE id = NEW.booking_id;

    -- Suspend technician if multiple offenses
    DECLARE
      offense_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO offense_count
      FROM public.offline_payment_reports
      WHERE technician_id = NEW.technician_id
        AND status = 'confirmed';

      IF offense_count >= 2 THEN
        UPDATE public.technician_profiles
        SET 
          verification_status = 'suspended',
          suspended_at = NOW(),
          suspension_reason = 'Multiple confirmed offline payment violations'
        WHERE id = NEW.technician_id;

        -- Create critical alert
        INSERT INTO public.fraud_alerts (
          user_id,
          alert_type,
          severity,
          description,
          status
        ) VALUES (
          NEW.technician_id,
          'offline_payment_repeat_offender',
          'critical',
          format('Technician has %s confirmed offline payment violations', offense_count),
          'open'
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_offline_payment_penalty
  AFTER UPDATE ON public.offline_payment_reports
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION disable_warranty_offline_payment();

-- Upsell tracking (technician tries to charge more after booking confirmed)
CREATE TABLE IF NOT EXISTS public.upsell_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  original_amount DECIMAL(10,2) NOT NULL,
  attempted_amount DECIMAL(10,2) NOT NULL,
  reason_given TEXT,
  customer_approved BOOLEAN DEFAULT FALSE,
  admin_reviewed BOOLEAN DEFAULT FALSE,
  is_legitimate BOOLEAN, -- set by admin after review
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upsell_booking ON public.upsell_attempts(booking_id);
CREATE INDEX idx_upsell_review ON public.upsell_attempts(admin_reviewed) WHERE admin_reviewed = FALSE;

-- Trigger: Flag excessive upsell attempts
CREATE OR REPLACE FUNCTION flag_upsell_abuse()
RETURNS TRIGGER AS $$
DECLARE
  upsell_count INTEGER;
  booking_tech_id UUID;
BEGIN
  -- Get technician from booking
  SELECT technician_id INTO booking_tech_id
  FROM public.bookings
  WHERE id = NEW.booking_id;

  -- Count upsell attempts by this technician in last 30 days
  SELECT COUNT(*) INTO upsell_count
  FROM public.upsell_attempts ua
  JOIN public.bookings b ON b.id = ua.booking_id
  WHERE b.technician_id = booking_tech_id
    AND ua.created_at > NOW() - INTERVAL '30 days'
    AND ua.customer_approved = FALSE;

  -- If more than 5 rejected upsells, flag
  IF upsell_count > 5 THEN
    INSERT INTO public.fraud_alerts (
      user_id,
      alert_type,
      severity,
      description,
      status
    ) VALUES (
      booking_tech_id,
      'excessive_upsell_attempts',
      'medium',
      format('Technician has %s rejected upsell attempts in 30 days', upsell_count),
      'open'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_upsell_abuse
  AFTER INSERT ON public.upsell_attempts
  FOR EACH ROW
  EXECUTE FUNCTION flag_upsell_abuse();

-- RLS policies
ALTER TABLE public.price_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_payment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS price_disputes_policy ON public.price_disputes;
CREATE POLICY price_disputes_policy ON public.price_disputes
  FOR ALL
  USING (
    customer_id = auth.uid() OR
    technician_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS offline_reports_policy ON public.offline_payment_reports;
CREATE POLICY offline_reports_policy ON public.offline_payment_reports
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS upsell_policy ON public.upsell_attempts;
CREATE POLICY upsell_policy ON public.upsell_attempts
  FOR SELECT
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid() OR technician_id = auth.uid())
    OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );
