-- Drop old tables and recreate with proper platform-controlled structure
DROP TABLE IF EXISTS public.technician_services CASCADE;
DROP TABLE IF EXISTS public.service_categories CASCADE;

-- Service categories (admin-controlled)
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform services (admin-controlled, immutable once used)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.service_categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  min_price DECIMAL(10,2) NOT NULL CHECK (min_price >= 0),
  max_price DECIMAL(10,2) NOT NULL CHECK (max_price >= min_price),
  estimated_duration_minutes INTEGER NOT NULL CHECK (estimated_duration_minutes > 0),
  warranty_days INTEGER NOT NULL DEFAULT 30,
  emergency_supported BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.services(id),
  has_bookings BOOLEAN DEFAULT FALSE, -- set to true when first booking created
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name, version)
);

-- Service availability by city (admin-controlled)
CREATE TABLE IF NOT EXISTS public.service_city_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_id, city, state)
);

-- Technician service offerings (supply layer)
CREATE TABLE IF NOT EXISTS public.technician_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2) NOT NULL,
  coverage_radius_km INTEGER NOT NULL CHECK (coverage_radius_km > 0 AND coverage_radius_km <= 100),
  is_active BOOLEAN DEFAULT FALSE, -- starts false, needs admin approval
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  tools_declared JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(technician_id, service_id)
);

-- Price audit logs (fraud protection)
CREATE TABLE IF NOT EXISTS public.price_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  platform_price DECIMAL(10,2) NOT NULL,
  technician_quoted_price DECIMAL(10,2) NOT NULL,
  final_charged_price DECIMAL(10,2) NOT NULL,
  price_variance_percent DECIMAL(5,2) NOT NULL,
  is_suspicious BOOLEAN DEFAULT FALSE,
  payment_method TEXT, -- 'platform' or 'offline'
  dispute_filed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Preferred technicians (rebooking tracking)
CREATE TABLE IF NOT EXISTS public.preferred_technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  last_booking_id UUID REFERENCES public.bookings(id),
  total_bookings INTEGER DEFAULT 0,
  offline_contact_suspected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, technician_id, service_id)
);

-- Indexes for performance
CREATE INDEX idx_services_category ON public.services(category_id) WHERE is_active = TRUE;
CREATE INDEX idx_services_emergency ON public.services(emergency_supported) WHERE is_active = TRUE;
CREATE INDEX idx_service_city_availability ON public.service_city_availability(service_id, city, state) WHERE is_enabled = TRUE;
CREATE INDEX idx_technician_services_tech ON public.technician_services(technician_id) WHERE is_active = TRUE;
CREATE INDEX idx_technician_services_service ON public.technician_services(service_id) WHERE is_active = TRUE AND approval_status = 'approved';
CREATE INDEX idx_technician_services_approval ON public.technician_services(approval_status) WHERE approval_status = 'pending';
CREATE INDEX idx_price_audit_suspicious ON public.price_audit_logs(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX idx_preferred_technicians_customer ON public.preferred_technicians(customer_id, service_id);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_city_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferred_technicians ENABLE ROW LEVEL SECURITY;
