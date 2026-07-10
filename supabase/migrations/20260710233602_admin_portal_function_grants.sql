-- align phase functions with the repo's grant hygiene pattern

REVOKE EXECUTE ON FUNCTION public.upsert_appointment_slot(uuid, integer, time without time zone, integer, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(uuid, integer, time without time zone, integer, text, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.close_enrollment_lead(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_enrollment_lead(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.prevent_slot_double_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_lead() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_booking_change() FROM PUBLIC, anon, authenticated;
