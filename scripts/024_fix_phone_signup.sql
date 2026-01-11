-- Migration to fix phone signup error
-- Makes profiles.email nullable (if not already) and updates handle_new_user trigger

-- 1. Ensure email is nullable (User said they did this, but good to have in migration)
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Update handle_new_user function to handle phone numbers and metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

-- 3. Re-create trigger (just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
