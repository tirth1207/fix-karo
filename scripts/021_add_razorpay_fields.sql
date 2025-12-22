-- Add Razorpay fields to payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'razorpay';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
