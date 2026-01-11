-- 020_create_technician_profile_function.sql
-- Create a SECURITY DEFINER function to safely create technician_profiles rows while enforcing checks.
-- This avoids RLS insertion failures when server-side contexts vary, while still enforcing explicit checks
-- (role must be 'technician', and caller must be the same user as the provided id).

CREATE OR REPLACE FUNCTION public.create_technician_profile_if_allowed(
  p_user_id uuid,
  p_business_name text DEFAULT NULL,
  p_specializations text[] DEFAULT ARRAY[]::text[],
  p_years_of_experience integer DEFAULT NULL,
  p_license_number text DEFAULT NULL,
  p_insurance_policy_number text DEFAULT NULL
)
RETURNS public.technician_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing public.technician_profiles%ROWTYPE;
  caller uuid;
  user_role text;
BEGIN
  -- The session user must match the provided user id
  caller := auth.uid();
  IF caller IS NULL OR caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure the profile role in profiles table is 'technician'
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  IF user_role IS NULL OR user_role <> 'technician' THEN
    RAISE EXCEPTION 'User is not a technician';
  END IF;

  -- If a row already exists, return it (idempotent)
  SELECT * INTO existing FROM public.technician_profiles WHERE id = p_user_id;
  IF FOUND THEN
    RETURN existing;
  END IF;

  -- Insert the row with safe defaults
  INSERT INTO public.technician_profiles (
    id,
    business_name,
    specializations,
    years_of_experience,
    license_number,
    insurance_policy_number,
    verification_status,
    is_active,
    rating,
    total_reviews,
    total_jobs_completed
  ) VALUES (
    p_user_id,
    p_business_name,
    p_specializations,
    p_years_of_experience,
    p_license_number,
    p_insurance_policy_number,
    'pending', -- verification_status
    false,     -- is_active
    0.00,      -- rating
    0,         -- total_reviews
    0          -- total_jobs_completed
  ) RETURNING * INTO existing;

  RETURN existing;
END;
$$;

COMMENT ON FUNCTION public.create_technician_profile_if_allowed(uuid, text, text[], integer, text, text) IS 'Creates a technician_profiles row if caller is same as p_user_id and profiles.role = technician. Idempotent.';
