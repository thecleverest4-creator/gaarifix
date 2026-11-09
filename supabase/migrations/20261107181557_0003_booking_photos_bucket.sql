/*
# Booking photos storage bucket

Creates a private `booking-photos` bucket for customer problem-description photos.
An authenticated user may upload/read only objects under their own user-id prefix.
*/

insert into storage.buckets (id, name, public)
values ('booking-photos', 'booking-photos', false)
on conflict (id) do nothing;

drop policy if exists "booking_photos_select_own" on storage.objects;
create policy "booking_photos_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'booking-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "booking_photos_insert_own" on storage.objects;
create policy "booking_photos_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'booking-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
