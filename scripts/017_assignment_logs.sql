-- Assignment decision logs for transparency and auditing
CREATE TABLE IF NOT EXISTS public.assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  assigned_technician_id UUID NOT NULL REFERENCES public.technician_profiles(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('auto', 'manual_admin', 'customer_selected')),
  ranking_factors JSONB NOT NULL, -- stores all ranking scores
  reason TEXT NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id), -- null for auto, admin id for manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignment_logs_booking ON public.assignment_logs(booking_id);
CREATE INDEX idx_assignment_logs_technician ON public.assignment_logs(assigned_technician_id);
CREATE INDEX idx_assignment_logs_type ON public.assignment_logs(assignment_type);

ALTER TABLE public.assignment_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Admins see all, users see own
DROP POLICY IF EXISTS assignment_logs_policy ON public.assignment_logs;
CREATE POLICY assignment_logs_policy ON public.assignment_logs
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    OR
    assigned_technician_id = auth.uid()
    OR
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
  );
