import { supabase } from '@/lib/supabase';
import type { Mechanic } from '@/types';

/** Only public, non-sensitive columns (no phone/CNIC) for browsing. */
export const PUBLIC_MECHANIC_COLS =
  'id,user_id,full_name,city,service_areas,years_experience,specializations,workshop_name,profile_photo_url,description,is_available,total_jobs,rating_avg,rating_count,verification_status,is_suspended,created_at';

export type PublicMechanic = Omit<Mechanic, 'phone' | 'email' | 'cnic_document_url' | 'total_earnings' | 'updated_at'>;

export async function fetchMechanics(): Promise<PublicMechanic[]> {
  const { data } = await supabase
    .from('mechanics')
    .select(PUBLIC_MECHANIC_COLS)
    .eq('verification_status', 'approved')
    .eq('is_suspended', false)
    .order('rating_avg', { ascending: false });
  return (data ?? []) as PublicMechanic[];
}

/** Ranks mechanics: available first, then by rating (weighted by number of reviews), then experience. */
export function rankMechanics<T extends PublicMechanic>(list: T[]): T[] {
  const score = (m: T) => Number(m.rating_avg) * Math.min(1, 0.6 + m.rating_count / 25) + m.years_experience * 0.02;
  return [...list].sort((a, b) => Number(b.is_available) - Number(a.is_available) || score(b) - score(a));
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** Remember where to go after login (e.g. booking a chosen mechanic). */
export function setNextAfterLogin(path: string) {
  try {
    sessionStorage.setItem('gf-next', path);
  } catch {
    /* storage unavailable */
  }
}

export function takeNextAfterLogin(): string | null {
  try {
    const v = sessionStorage.getItem('gf-next');
    sessionStorage.removeItem('gf-next');
    return v;
  } catch {
    return null;
  }
}

/**
 * Accept a booking. Open requests are claimed with `claim_booking`; requests sent directly to this
 * mechanic use `accept_direct_booking` (migration 0006), with a plain update as a fallback.
 */
export async function acceptBooking(booking: { id: string; mechanic_id: string | null }, userId: string) {
  if (booking.mechanic_id !== userId) {
    const { error } = await supabase.rpc('claim_booking', { p_booking_id: booking.id });
    return error?.message ?? null;
  }
  const rpc = await supabase.rpc('accept_direct_booking', { p_booking_id: booking.id });
  if (!rpc.error) return null;
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', booking.id)
    .eq('mechanic_id', userId)
    .eq('status', 'pending');
  if (!error) await supabase.from('booking_status_history').insert({ booking_id: booking.id, status: 'accepted', changed_by: userId });
  return error?.message ?? null;
}

/** Decline a request that a customer sent directly to this mechanic. */
export async function declineDirectBooking(bookingId: string, userId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      repair_note: 'The mechanic is not available for this request. Please book another mechanic.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('mechanic_id', userId)
    .eq('status', 'pending');
  return error?.message ?? null;
}
