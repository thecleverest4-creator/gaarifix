/*
# GaariFix: public mechanic browsing + direct booking

1. Visitors who are not logged in can browse APPROVED mechanics, but only safe columns
   (no phone, email, CNIC document or earnings).
2. A customer can send a booking directly to a chosen mechanic (bookings.mechanic_id set
   while status = 'pending'). That mechanic accepts with accept_direct_booking().
*/

-- 1. Public browsing (anon) — column-level grant keeps private columns hidden
grant select (
  id, user_id, full_name, city, service_areas, years_experience, specializations,
  workshop_name, profile_photo_url, description, is_available, total_jobs,
  rating_avg, rating_count, verification_status, is_suspended, created_at
) on public.mechanics to anon;

drop policy if exists "mechanics_select_public_approved" on public.mechanics;
create policy "mechanics_select_public_approved" on public.mechanics
  for select to anon
  using (verification_status = 'approved' and is_suspended = false);

grant select on public.services to anon;

-- 2. Accept a request that was sent directly to this mechanic
create or replace function public.accept_direct_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.mechanics;
  assigned public.bookings;
begin
  select * into m from public.mechanics where user_id = auth.uid();
  if not found then raise exception 'Mechanic profile not found'; end if;
  if m.verification_status <> 'approved' then raise exception 'Mechanic is not approved'; end if;
  if m.is_suspended then raise exception 'Mechanic is suspended'; end if;

  update public.bookings
     set status = 'accepted', updated_at = now()
   where id = p_booking_id and mechanic_id = auth.uid() and status = 'pending'
  returning * into assigned;

  if not found then raise exception 'Booking is no longer available'; end if;

  insert into public.booking_status_history (booking_id, status, changed_by)
    values (assigned.id, 'accepted', auth.uid());

  return assigned;
end;
$$;

revoke execute on function public.accept_direct_booking(uuid) from public, anon;
grant execute on function public.accept_direct_booking(uuid) to authenticated;

-- 3. Customers may only assign a pending booking to an approved, active mechanic
create or replace function public.check_direct_booking_mechanic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mechanic_id is not null and new.status = 'pending' then
    if not exists (
      select 1 from public.mechanics
       where user_id = new.mechanic_id and verification_status = 'approved' and is_suspended = false
    ) then
      raise exception 'Selected mechanic is not available';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_check_direct_mechanic on public.bookings;
create trigger bookings_check_direct_mechanic
  before insert on public.bookings
  for each row execute function public.check_direct_booking_mechanic();
