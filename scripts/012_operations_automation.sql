-- Create ops_events table for automated actions
CREATE TABLE IF NOT EXISTS public.ops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_taken TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_events_type ON public.ops_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ops_events_entity ON public.ops_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ops_events_created ON public.ops_events(created_at DESC);

ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert ops events" ON public.ops_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view ops events" ON public.ops_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Add customer risk score
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS customer_risk_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0;

-- Track repeat disputes
CREATE OR REPLACE FUNCTION track_customer_disputes()
RETURNS TRIGGER AS $$
DECLARE
  dispute_count INTEGER;
BEGIN
  IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
    -- Increment customer dispute count
    UPDATE public.profiles
    SET 
      dispute_count = dispute_count + 1,
      customer_risk_score = customer_risk_score + 20
    WHERE id = NEW.customer_id;
    
    -- Get total disputes
    SELECT dispute_count INTO dispute_count
    FROM public.profiles
    WHERE id = NEW.customer_id;
    
    -- Create alert if multiple disputes
    IF dispute_count >= 2 THEN
      INSERT INTO public.fraud_alerts (
        user_id,
        alert_type,
        severity,
        description,
        status
      ) VALUES (
        NEW.customer_id,
        'repeat_disputes',
        CASE WHEN dispute_count >= 4 THEN 'high' ELSE 'medium' END,
        format('Customer has disputed %s bookings', dispute_count),
        'open'
      );
    END IF;
    
    -- Log ops event
    INSERT INTO public.ops_events (
      event_type,
      entity_type,
      entity_id,
      action_taken,
      reason,
      metadata
    ) VALUES (
      'dispute_detected',
      'booking',
      NEW.id,
      'customer_risk_score_increased',
      format('Customer dispute count: %s', dispute_count),
      jsonb_build_object('customer_id', NEW.customer_id, 'dispute_count', dispute_count)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_disputes
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_customer_disputes();

-- Create city feature toggles
CREATE TABLE IF NOT EXISTS public.city_feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  disabled_reason TEXT,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city, state, feature_name)
);

CREATE INDEX IF NOT EXISTS idx_city_features_location ON public.city_feature_toggles(city, state);
CREATE INDEX IF NOT EXISTS idx_city_features_enabled ON public.city_feature_toggles(is_enabled);

ALTER TABLE public.city_feature_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature toggles" ON public.city_feature_toggles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature toggles" ON public.city_feature_toggles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Function to check if city feature is enabled
CREATE OR REPLACE FUNCTION is_city_feature_enabled(
  p_city TEXT,
  p_state TEXT,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  enabled BOOLEAN;
BEGIN
  SELECT is_enabled INTO enabled
  FROM public.city_feature_toggles
  WHERE city = p_city
    AND state = p_state
    AND feature_name = p_feature;
  
  -- Default to enabled if no toggle exists
  RETURN COALESCE(enabled, TRUE);
END;
$$ LANGUAGE plpgsql;
