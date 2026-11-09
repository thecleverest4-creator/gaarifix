/*
# MechanicMate — Initial schema

Builds the full database for a mobile car-mechanic booking platform operating in Pakistan.

## Tables created
- `profiles` — extends `auth.users` with a role (customer / mechanic / admin), display name, phone and avatar.
- `services` — catalog of bookable services with an admin-configurable starting price (PKR).
- `vehicles` — customer-owned vehicles.
- `mechanics` — mechanic profile linked to a user; verification status, service areas, specializations, experience, documents.
- `bookings` — a service request; assigned to a mechanic once accepted; carries location, schedule, problem description, price fields and status.
- `booking_status_history` — append-only log of booking status changes.
- `reviews` — customer reviews of completed jobs.

## Security model
- `profiles`: each authenticated user reads/updates only their own row. Created automatically via trigger on `auth.users`.
- `services`: public read (anon + authenticated); only admins insert/update/delete.
- `vehicles`: owner-scoped CRUD by the customer.
- `mechanics`: any authenticated user can read; only the owning user can insert/update their own row; admins can update verification/availability/suspension.
- `bookings`: customers read/insert/cancel only their own; assigned mechanics can read & update their assigned bookings; admins can read/update all.
- `booking_status_history`: read by the customer and assigned mechanic of the related booking.
- `reviews`: public read; only the booking's customer can insert their own review.

## Privileged helpers (SECURITY DEFINER)
- `is_admin()` / `is_mechanic()` / `is_customer()` — stable helper functions for policy predicates.
- `claim_booking(booking_id)` — atomically assigns a pending booking to the calling approved mechanic.
- `advance_booking_status(booking_id)` — advances a booking along the happy-path status flow.
- `admin_cancel_booking(booking_id)` — admin-only cancellation.
- `handle_new_user()` — creates a `profiles` row on signup, defaulting role to `customer`.
- `touch_updated_at()` / `generate_booking_ref()` / `seed_booking_history()` — trigger helpers.

All privileged functions REVOKE EXECUTE from PUBLIC/anon and GRANT only to authenticated.

Ordering note: helper functions are defined immediately after `profiles` exists, before any policy that references them.
*/

-- ===========================================================================
-- 1. profiles (must exist before helper functions reference it)
-- ===========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer','mechanic','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- 2. Helper functions (depend on profiles; referenced by all later policies)
-- ===========================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_mechanic()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'mechanic'
  );
$$;

create or replace function public.is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'customer'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_mechanic() from public, anon;
grant execute on function public.is_mechanic() to authenticated;
revoke execute on function public.is_customer() from public, anon;
grant execute on function public.is_customer() to authenticated;

-- trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- 3. profiles RLS + grants (now that helpers exist)
-- ===========================================================================
alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ===========================================================================
-- 4. services
-- ===========================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon_name text not null default 'Wrench',
  starting_price integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

drop policy if exists "services_select_all" on public.services;
create policy "services_select_all" on public.services
  for select to anon, authenticated using (true);

drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin" on public.services
  for insert to authenticated with check (public.is_admin());

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin" on public.services
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "services_delete_admin" on public.services;
create policy "services_delete_admin" on public.services
  for delete to authenticated using (public.is_admin());

-- ===========================================================================
-- 5. vehicles
-- ===========================================================================
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null,
  registration_number text not null,
  fuel_type text not null check (fuel_type in ('Petrol','Diesel','CNG','Hybrid','Electric')),
  nickname text,
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

grant select, insert, update, delete on public.vehicles to authenticated;

drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own" on public.vehicles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own" on public.vehicles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own" on public.vehicles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own" on public.vehicles
  for delete to authenticated using (auth.uid() = user_id);

-- ===========================================================================
-- 6. mechanics
-- ===========================================================================
create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  city text not null,
  service_areas text[] not null default '{}',
  years_experience integer not null default 0,
  specializations text[] not null default '{}',
  workshop_name text,
  profile_photo_url text,
  cnic_document_url text,
  description text,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  is_available boolean not null default true,
  is_suspended boolean not null default false,
  total_jobs integer not null default 0,
  total_earnings integer not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mechanics enable row level security;

grant select, insert, update on public.mechanics to authenticated;

drop policy if exists "mechanics_select_all" on public.mechanics;
create policy "mechanics_select_all" on public.mechanics
  for select to authenticated using (true);

drop policy if exists "mechanics_insert_own" on public.mechanics;
create policy "mechanics_insert_own" on public.mechanics
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "mechanics_update_own_or_admin" on public.mechanics;
create policy "mechanics_update_own_or_admin" on public.mechanics
  for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- ===========================================================================
-- 7. bookings
-- ===========================================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null unique,
  customer_id uuid not null references auth.users(id) on delete cascade,
  mechanic_id uuid references auth.users(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  problem_description text not null,
  photo_url text,
  city text not null,
  area text not null,
  address text not null,
  map_location text,
  customer_phone text not null,
  preferred_date date,
  preferred_time_slot text,
  is_immediate boolean not null default false,
  estimated_price integer,
  final_amount integer,
  parts_charges integer,
  labour_charges integer,
  repair_note text,
  status text not null default 'pending' check (status in ('pending','accepted','on_the_way','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_id_idx on public.bookings(customer_id);
create index if not exists bookings_mechanic_id_idx on public.bookings(mechanic_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_service_id_idx on public.bookings(service_id);

alter table public.bookings enable row level security;

grant select, insert, update on public.bookings to authenticated;

drop policy if exists "bookings_select" on public.bookings;
create policy "bookings_select" on public.bookings
  for select to authenticated using (
    auth.uid() = customer_id
    or auth.uid() = mechanic_id
    or public.is_admin()
  );

drop policy if exists "bookings_insert_customer" on public.bookings;
create policy "bookings_insert_customer" on public.bookings
  for insert to authenticated with check (auth.uid() = customer_id);

drop policy if exists "bookings_update" on public.bookings;
create policy "bookings_update" on public.bookings
  for update to authenticated
  using (
    auth.uid() = customer_id
    or auth.uid() = mechanic_id
    or public.is_admin()
  )
  with check (
    auth.uid() = customer_id
    or auth.uid() = mechanic_id
    or public.is_admin()
  );

-- ===========================================================================
-- 8. booking_status_history
-- ===========================================================================
create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status text not null check (status in ('pending','accepted','on_the_way','in_progress','completed','cancelled')),
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists bsh_booking_id_idx on public.booking_status_history(booking_id);

alter table public.booking_status_history enable row level security;

grant select on public.booking_status_history to authenticated;

drop policy if exists "bsh_select" on public.booking_status_history;
create policy "bsh_select" on public.booking_status_history
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_status_history.booking_id
      and (b.customer_id = auth.uid() or b.mechanic_id = auth.uid() or public.is_admin())
    )
  );

-- ===========================================================================
-- 9. reviews
-- ===========================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mechanic_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews
  for select to anon, authenticated using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated with check (auth.uid() = customer_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update to authenticated using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete to authenticated using (auth.uid() = customer_id);

-- ===========================================================================
-- 10. SECURITY DEFINER: atomic booking claim
-- ===========================================================================
create or replace function public.claim_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  m public.mechanics;
  svc public.services;
  assigned public.bookings;
begin
  select * into m from public.mechanics where user_id = auth.uid();
  if not found then
    raise exception 'Mechanic profile not found';
  end if;
  if m.verification_status <> 'approved' then
    raise exception 'Mechanic is not approved';
  end if;
  if m.is_suspended then
    raise exception 'Mechanic is suspended';
  end if;
  if not m.is_available then
    raise exception 'Mechanic is currently unavailable';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if b.status <> 'pending' or b.mechanic_id is not null then
    raise exception 'Booking is no longer available';
  end if;

  select * into svc from public.services where id = b.service_id;
  if svc is null then
    raise exception 'Service not found';
  end if;
  if array_length(m.specializations, 1) is not null
     and not (svc.slug = any(m.specializations)) then
    raise exception 'Service is outside your specializations';
  end if;

  update public.bookings
    set status = 'accepted', mechanic_id = auth.uid(), updated_at = now()
    where id = p_booking_id and status = 'pending' and mechanic_id is null
    returning * into assigned;

  if not found then
    raise exception 'Booking was claimed by another mechanic';
  end if;

  insert into public.booking_status_history (booking_id, status, changed_by)
    values (assigned.id, 'accepted', auth.uid());

  return assigned;
end;
$$;

revoke execute on function public.claim_booking(uuid) from public, anon;
grant execute on function public.claim_booking(uuid) to authenticated;

-- ===========================================================================
-- 11. SECURITY DEFINER: advance booking status
-- ===========================================================================
create or replace function public.advance_booking_status(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  next_status text;
  actor uuid := auth.uid();
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;

  if b.mechanic_id is distinct from actor and not public.is_admin() then
    raise exception 'Not authorized to update this booking';
  end if;

  case b.status
    when 'accepted' then next_status := 'on_the_way';
    when 'on_the_way' then next_status := 'in_progress';
    when 'in_progress' then next_status := 'completed';
    else
      raise exception 'Cannot advance from status %', b.status;
  end case;

  update public.bookings set status = next_status, updated_at = now()
    where id = p_booking_id returning * into b;

  insert into public.booking_status_history (booking_id, status, changed_by)
    values (p_booking_id, next_status, actor);

  if next_status = 'completed' then
    update public.mechanics
      set total_jobs = total_jobs + 1,
          total_earnings = total_earnings + coalesce(b.final_amount, b.estimated_price, 0),
          updated_at = now()
      where user_id = b.mechanic_id;
  end if;

  return b;
end;
$$;

revoke execute on function public.advance_booking_status(uuid) from public, anon;
grant execute on function public.advance_booking_status(uuid) to authenticated;

-- ===========================================================================
-- 12. SECURITY DEFINER: admin cancel booking
-- ===========================================================================
create or replace function public.admin_cancel_booking(p_booking_id uuid)
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

  update public.bookings set status = 'cancelled', updated_at = now()
    where id = p_booking_id returning * into b;

  if not found then
    raise exception 'Booking not found';
  end if;

  insert into public.booking_status_history (booking_id, status, changed_by)
    values (p_booking_id, 'cancelled', auth.uid());

  return b;
end;
$$;

revoke execute on function public.admin_cancel_booking(uuid) from public, anon;
grant execute on function public.admin_cancel_booking(uuid) to authenticated;

-- ===========================================================================
-- 13. updated_at triggers
-- ===========================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists mechanics_touch on public.mechanics;
create trigger mechanics_touch before update on public.mechanics
  for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- 14. booking_ref generation + status history seeding on insert
-- ===========================================================================
create or replace function public.generate_booking_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  ref text;
begin
  if new.booking_ref is null or new.booking_ref = '' then
    select count(*) + 1 into n from public.bookings;
    ref := 'MM-' || to_char(now(),'YY') || '-' || lpad(n::text, 5, '0');
    new.booking_ref := ref;
  end if;
  if new.estimated_price is null then
    select starting_price into new.estimated_price from public.services where id = new.service_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_before_insert on public.bookings;
create trigger bookings_before_insert before insert on public.bookings
  for each row execute function public.generate_booking_ref();

create or replace function public.seed_booking_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.booking_status_history (booking_id, status, changed_by)
    values (new.id, 'pending', new.customer_id);
  return new;
end;
$$;

drop trigger if exists bookings_after_insert on public.bookings;
create trigger bookings_after_insert after insert on public.bookings
  for each row execute function public.seed_booking_history();
