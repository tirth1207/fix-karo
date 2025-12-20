-- Create comprehensive immutable audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_role user_role,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  device_id TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Make audit_logs append-only (no updates or deletes)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can read their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = actor_id);

-- Prevent updates and deletes
CREATE POLICY "No updates allowed" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "No deletes allowed" ON public.audit_logs
  FOR DELETE USING (false);

-- Audit all booking state changes
CREATE OR REPLACE FUNCTION audit_booking_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'booking_created'
      WHEN TG_OP = 'UPDATE' THEN 'booking_updated'
      WHEN TG_OP = 'DELETE' THEN 'booking_deleted'
    END,
    'booking',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_build_object(
      'status_changed', OLD.status IS DISTINCT FROM NEW.status,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_booking_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION audit_booking_changes();

-- Audit all payment changes
CREATE OR REPLACE FUNCTION audit_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'payment_created'
      WHEN TG_OP = 'UPDATE' THEN 'payment_updated'
    END,
    'payment',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    jsonb_build_object(
      'status_changed', OLD.payment_status IS DISTINCT FROM NEW.payment_status,
      'old_status', OLD.payment_status,
      'new_status', NEW.payment_status,
      'amount', NEW.amount
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_payment_changes_trigger
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION audit_payment_changes();
