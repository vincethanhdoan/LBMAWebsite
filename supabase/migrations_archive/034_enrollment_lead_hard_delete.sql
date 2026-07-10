drop policy if exists "Admins can delete enrollment leads" on public.enrollment_leads;
create policy "Admins can delete enrollment leads"
  on public.enrollment_leads for delete
  to authenticated
  using (is_admin(auth.uid()));

grant delete on public.enrollment_leads to authenticated;
