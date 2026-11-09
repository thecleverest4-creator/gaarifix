/*
# Tighten function security

Fixes security advisor warnings:
1. `touch_updated_at()` — set a fixed `search_path = public` so the search path is not mutable.
2. Trigger-only functions (`generate_booking_ref`, `seed_booking_history`, `handle_new_user`) — REVOKE EXECUTE from all roles. These are only meant to run as triggers, not be called directly via the REST API.
3. `promote_first_admin()` — already guards internally (only works when no admin exists), keep executable by authenticated as intended.

The admin functions (`admin_*`), `claim_booking`, and `advance_booking_status` remain executable by `authenticated` because they each perform their own authorization check internally (`is_admin()`, mechanic verification, assignment ownership). The `is_admin`/`is_mechanic`/`is_customer` helper functions are intentionally callable by authenticated users — they only return a boolean and are used by RLS policies.
*/

-- Fix mutable search_path on touch_updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Revoke direct execution on trigger-only functions
revoke execute on function public.generate_booking_ref() from public, anon, authenticated;
revoke execute on function public.seed_booking_history() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
