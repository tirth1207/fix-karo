-- Create payment_events immutable ledger
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'held_in_escrow', 'released', 'refunded', 'disputed')),
  idempotency_key TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON public.payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_idempotency ON public.payment_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON public.payment_events(event_type);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Append-only payment events
CREATE POLICY "System can insert payment events" ON public.payment_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read payment events" ON public.payment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "No updates to payment events" ON public.payment_events
  FOR UPDATE USING (false);

CREATE POLICY "No deletes of payment events" ON public.payment_events
  FOR DELETE USING (false);

-- Add idempotency to payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency ON public.payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
