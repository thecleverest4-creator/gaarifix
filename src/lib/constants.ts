import type { BookingStatus, VerificationStatus } from '@/types';

// Pakistan cities served by MechanicMate (configurable)
export const PAKISTAN_CITIES: string[] = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Sialkot',
  'Gujranwala',
  'Bahawalpur',
];

// Time slots available for booking (configurable)
export const TIME_SLOTS: string[] = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
];

// Service specializations a mechanic can choose from (slugs matching the services table)
export const SPECIALIZATION_OPTIONS: { slug: string; label: string }[] = [
  { slug: 'general-inspection', label: 'General Car Inspection' },
  { slug: 'engine-diagnostics', label: 'Engine Diagnostics' },
  { slug: 'battery-replacement', label: 'Battery Replacement' },
  { slug: 'oil-change', label: 'Oil Change' },
  { slug: 'brake-repair', label: 'Brake Repair' },
  { slug: 'ac-repair', label: 'AC Repair' },
  { slug: 'tyre-replacement', label: 'Tyre Replacement' },
  { slug: 'emergency-roadside', label: 'Emergency Roadside Assistance' },
];

export const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Hybrid', 'Electric'] as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  on_the_way: 'Mechanic on the Way',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  on_the_way: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending Verification',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// Maps service icon_name (stored in DB) to a Lucide icon name we render.
// Kept in sync by the homepage services section.
export const SERVICE_ICON_MAP: Record<string, string> = {
  SearchCheck: 'SearchCheck',
  Gauge: 'Gauge',
  BatteryCharging: 'BatteryCharging',
  Droplets: 'Droplets',
  Disc: 'Disc',
  Snowflake: 'Snowflake',
  CircleDot: 'CircleDot',
  Siren: 'Siren',
  Wrench: 'Wrench',
};

export function formatPKR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return 'PKR ' + amount.toLocaleString('en-PK');
}
