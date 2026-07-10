-- Returns safe public lead fields for a given booking token.
-- Used by BookingPage to determine current state without exposing internal data.

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token UUID)
RETURNS TABLE(
  status TEXT,
  parent_name TEXT,
  parent_email TEXT,
  appointment_date DATE,
  appointment_time TIME
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, parent_name, parent_email, appointment_date, appointment_time
  FROM enrollment_leads
  WHERE booking_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_by_token(UUID) TO anon, authenticated;
