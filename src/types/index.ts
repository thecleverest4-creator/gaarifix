export type UserRole = 'customer' | 'mechanic' | 'admin';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type FuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Hybrid' | 'Electric';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_name: string;
  starting_price: number;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
  fuel_type: FuelType;
  nickname: string | null;
  created_at: string;
}

export interface Mechanic {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string;
  service_areas: string[];
  years_experience: number;
  specializations: string[];
  workshop_name: string | null;
  profile_photo_url: string | null;
  cnic_document_url: string | null;
  description: string | null;
  verification_status: VerificationStatus;
  is_available: boolean;
  is_suspended: boolean;
  total_jobs: number;
  total_earnings: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_ref: string;
  customer_id: string;
  mechanic_id: string | null;
  service_id: string;
  vehicle_id: string | null;
  problem_description: string;
  photo_url: string | null;
  city: string;
  area: string;
  address: string;
  map_location: string | null;
  customer_phone: string;
  preferred_date: string | null;
  preferred_time_slot: string | null;
  is_immediate: boolean;
  estimated_price: number | null;
  final_amount: number | null;
  parts_charges: number | null;
  labour_charges: number | null;
  repair_note: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  // joined fields (optional, populated by select with relations)
  service?: Service;
  vehicle?: Vehicle;
  mechanic_profile?: Mechanic | null;
  customer_profile?: Profile | null;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  status: BookingStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  mechanic_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
