-- Migrate the one legacy terminal-with-attendance row to the unified model.
update enrollment_leads
set status = 'no_show'
where status = 'closed' and attendance_status = 'no_show';

-- Tighten the status set to the final vocabulary (drops `enrolled`).
alter table enrollment_leads drop constraint enrollment_leads_status_check;
alter table enrollment_leads add constraint enrollment_leads_status_check
  check (status = any (array[
    'new','approved','appointment_scheduled','appointment_confirmed',
    'denied','attended','no_show','closed'
  ]));

-- `attendance_status` is now redundant with `status`.
alter table enrollment_leads
  drop constraint enrollment_leads_attendance_status_check;
alter table enrollment_leads drop column attendance_status;
