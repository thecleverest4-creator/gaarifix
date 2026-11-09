/*
# Admin bootstrap function

Adds a SECURITY DEFINER function `promote_first_admin()` that promotes the
calling authenticated user to the `admin` role, but ONLY when no admin exists
yet in the profiles table. This lets the first person to sign in claim the
admin role safely, while preventing any later user from self-promoting.

Also adds `admin_set_mechanic_verification` and `admin_toggle_mechanic_suspend`
so admins can approve/reject/suspend mechanics without touching arbitrary row
updates (mechanics' own update policy would block admin column changes to
verification_status / is_suspended without this).
*/

-- Promote the caller to admin only if no admin exists
create or replace function public.promote_first_admin()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_admin_count integer;
  p public.profiles;
begin
  select count(*) into existing_admin_count from public.profiles where role = 'admin';
  if existing_admin_count > 0 then
    raise exception 'An admin already exists. Contact the existing admin to be promoted.';
  end if;

  update public.profiles set role = 'admin', updated_at = now()
    where id = auth.uid() returning * into p;

  if not found then
    raise exception 'Profile not found';
  end if;

  return p;
end;
$$;

revoke execute on function public.promote_first_admin() from public, anon;
grant execute on function public.promote_first_admin() to authenticated;

-- Admin: set mechanic verification status
create or replace function public.admin_set_mechanic_verification(p_mechanic_id uuid, p_status text)
returns public.mechanics
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.mechanics;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_status not in ('pending','approved','rejected') then
    raise exception 'Invalid status';
  end if;

  update public.mechanics
    set verification_status = p_status, updated_at = now()
    where id = p_mechanic_id returning * into m;

  if not found then
    raise exception 'Mechanic not found';
  end if;
  return m;
end;
$$;

revoke execute on function public.admin_set_mechanic_verification(uuid, text) from public, anon;
grant execute on function public.admin_set_mechanic_verification(uuid, text) to authenticated;

-- Admin: toggle mechanic suspension
create or replace function public.admin_toggle_mechanic_suspend(p_mechanic_id uuid, p_suspend boolean)
returns public.mechanics
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.mechanics;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.mechanics
    set is_suspended = p_suspend, updated_at = now()
    where id = p_mechanic_id returning * into m;

  if not found then
    raise exception 'Mechanic not found';
  end if;
  return m;
end;
$$;

revoke execute on function public.admin_toggle_mechanic_suspend(uuid, boolean) from public, anon;
grant execute on function public.admin_toggle_mechanic_suspend(uuid, boolean) to authenticated;

-- Admin: override booking status (general)
create or replace function public.admin_set_booking_status(p_booking_id uuid, p_status text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_status not in ('pending','accepted','on_the_way','in_progress','completed','cancelled') then
    raise exception 'Invalid status';
  end if;

  update public.bookings set status = p_status, updated_at = now()
    where id = p_booking_id returning * into b;

  if not found then
    raise exception 'Booking not found';
  end if;

  insert into public.booking_status_history (booking_id, status, changed_by)
    values (p_booking_id, p_status, auth.uid());

  return b;
end;
$$;

revoke execute on function public.admin_set_booking_status(uuid, text) from public, anon;
grant execute on function public.admin_set_booking_status(uuid, text) to authenticated;
