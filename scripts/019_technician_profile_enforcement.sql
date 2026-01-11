-- 019_technician_profile_enforcement.sql
-- Adds a simple function that checks whether a technician profile exists for a given user.
-- Important: This function DOES NOT insert any rows — per requirements we must not auto-create profiles.

CREATE OR REPLACE FUNCTION public.ensure_technician_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  u_role text;
  found boolean;
BEGIN
  SELECT role INTO u_role FROM public.profiles WHERE id = p_user_id;

  -- If no profile found or role is not technician, do nothing (treat as OK)
  IF u_role IS NULL OR u_role <> 'technician' THEN
    RETURN true;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.technician_profiles WHERE id = p_user_id) INTO found;

  IF found THEN
    RETURN true; -- technician and profile exists
  ELSE
    RETURN false; -- technician but profile missing
  END IF;
END;
$$;

COMMENT ON FUNCTION public.ensure_technician_profile(uuid) IS 'Return true if user is not a technician OR if a technician profile exists. Return false if user is a technician and the corresponding technician_profiles row is missing.';
