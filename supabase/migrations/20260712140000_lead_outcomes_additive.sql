-- Widen the lead status set to include attendance outcomes as first-class
-- terminal statuses. `enrolled` is kept here and removed in the cleanup
-- migration so code and DB stay consistent through the refactor.
alter table enrollment_leads drop constraint enrollment_leads_status_check;
alter table enrollment_leads add constraint enrollment_leads_status_check
  check (status = any (array[
    'new','approved','appointment_scheduled','appointment_confirmed',
    'denied','enrolled','attended','no_show','closed'
  ]));

-- Permanently delete a lead and everything attached to it. Children,
-- program bookings, and email-notification rows cascade via FK; the admin
-- bell (user_notifications) references leads polymorphically with no FK, so
-- it is swept explicitly here.
create or replace function public.delete_enrollment_lead(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (is_admin(auth.uid()) or auth.role() = 'service_role') then
    raise exception 'Unauthorized';
  end if;

  delete from user_notifications
  where reference_type = 'enrollment_lead' and reference_id = p_lead_id;

  delete from enrollment_leads where lead_id = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
end $function$;

revoke all on function public.delete_enrollment_lead(uuid) from public;
grant execute on function public.delete_enrollment_lead(uuid) to authenticated;
grant execute on function public.delete_enrollment_lead(uuid) to service_role;
