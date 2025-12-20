-- Function to increment completed jobs count for technicians
CREATE OR REPLACE FUNCTION increment_completed_jobs(technician_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.technician_profiles
  SET total_jobs_completed = total_jobs_completed + 1
  WHERE id = technician_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suspicious users (for future fraud detection)
CREATE OR REPLACE FUNCTION get_suspicious_users()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role user_role,
  violation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    COUNT(fm.id) as violation_count
  FROM public.profiles p
  INNER JOIN public.fraud_metrics fm ON fm.user_id = p.id
  WHERE fm.threshold_exceeded = true
  GROUP BY p.id, p.full_name, p.email, p.role
  HAVING COUNT(fm.id) > 2
  ORDER BY violation_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
