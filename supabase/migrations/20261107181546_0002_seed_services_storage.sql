/*
# Seed services catalog + storage bucket for uploads

## Services
Inserts the eight MVP services with admin-configurable starting prices in PKR:
- General Car Inspection
- Engine Diagnostics
- Battery Replacement
- Oil Change
- Brake Repair
- AC Repair
- Tyre Replacement
- Emergency Roadside Assistance

Each row is given a stable slug so booking logic and mechanic specializations can reference it deterministically.

## Storage
Creates a private `mechanic-documents` bucket for CNIC verification documents and profile photos, with a policy allowing an authenticated user to upload/read only objects under their own user-id prefix.
*/

insert into public.services (slug, name, description, icon_name, starting_price)
values
  ('general-inspection', 'General Car Inspection', 'A full visual and mechanical inspection of your vehicle covering engine, brakes, suspension, lights, fluids and tyres.', 'SearchCheck', 2000),
  ('engine-diagnostics', 'Engine Diagnostics', 'Computerised OBD-II scanning to identify engine fault codes and pinpoint performance issues.', 'Gauge', 3000),
  ('battery-replacement', 'Battery Replacement', 'Testing of your current battery and on-site replacement with a new, compatible unit.', 'BatteryCharging', 5000),
  ('oil-change', 'Oil Change', 'Drain and replace engine oil with a fresh filter, including a top-up of essential fluids.', 'Droplets', 2500),
  ('brake-repair', 'Brake Repair', 'Inspection and repair of brake pads, discs and lines to restore safe stopping performance.', 'Disc', 4000),
  ('ac-repair', 'AC Repair', 'Diagnosis and repair of car air conditioning including gas recharge, compressor and cooling checks.', 'Snowflake', 3500),
  ('tyre-replacement', 'Tyre Replacement', 'Replacement of worn or punctured tyres with balancing, performed at your location.', 'CircleDot', 6000),
  ('emergency-roadside', 'Emergency Roadside Assistance', 'Immediate on-site help for breakdowns: jump-start, flat tyre, lockout and minor roadside repairs.', 'Siren', 3000)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon_name = excluded.icon_name,
  starting_price = excluded.starting_price;

-- Storage bucket for mechanic documents (private)
insert into storage.buckets (id, name, public)
values ('mechanic-documents', 'mechanic-documents', false)
on conflict (id) do nothing;

-- allow authenticated users to read & upload within their own user-id folder
drop policy if exists "mech_docs_select_own" on storage.objects;
create policy "mech_docs_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'mechanic-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mech_docs_insert_own" on storage.objects;
create policy "mech_docs_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'mechanic-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mech_docs_update_own" on storage.objects;
create policy "mech_docs_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'mechanic-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
