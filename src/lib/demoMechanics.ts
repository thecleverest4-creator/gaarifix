import type { Review } from '@/types';
import type { PublicMechanic } from '@/lib/mechanics';

/**
 * Sample mechanics shown only while the database has no approved mechanics yet,
 * so the marketplace can be demoed. Their ids start with "demo-"; booking one sends an
 * open request that any real verified mechanic can accept.
 */
export const DEMO_PREFIX = 'demo-';
export const isDemoMechanic = (m: { id: string }) => m.id.startsWith(DEMO_PREFIX);

type Seed = [string, string | null, string, string[], number, string[], number, number, number, boolean, string];
const SEEDS: Seed[] = [
  ['Muhammad Imran', 'Imran Auto Works', 'Islamabad', ['G-11', 'G-10', 'F-10'], 14, ['engine-diagnostics', 'general-inspection', 'oil-change'], 4.9, 128, 640, true, 'Toyota and Honda engine specialist. Computer scanning available at your doorstep.'],
  ['Shahid Mehmood', 'Shahid AC & Electric', 'Islamabad', ['I-8', 'I-10', 'H-8'], 11, ['ac-repair', 'battery-replacement'], 4.8, 96, 470, true, 'Car AC gas refill, compressor and cooling coil repair. Summer special packages.'],
  ['Asad Ali', null, 'Islamabad', ['E-11', 'F-11', 'Golra'], 7, ['tyre-replacement', 'emergency-roadside', 'battery-replacement'], 4.7, 61, 300, true, 'Puncture, tyre change and jump-start anywhere in Islamabad, day or night.'],
  ['Naveed Akhtar', 'Akhtar Brake Centre', 'Rawalpindi', ['Saddar', 'Satellite Town', 'Chaklala'], 18, ['brake-repair', 'general-inspection'], 4.8, 152, 820, false, 'Brake pads, discs and ABS issues. 18 years in Saddar.'],
  ['Kashif Raza', 'Raza Motors', 'Rawalpindi', ['Bahria Town', 'DHA 2', 'Gulraiz'], 9, ['oil-change', 'engine-diagnostics', 'general-inspection'], 4.6, 74, 410, true, 'Oil change with genuine filters, tuning and full inspection.'],
  ['Bilal Hussain', null, 'Rawalpindi', ['Commercial Market', 'Chandni Chowk'], 5, ['battery-replacement', 'emergency-roadside'], 4.5, 33, 150, true, 'Battery testing and replacement at your location within 45 minutes.'],
  ['Tariq Javed', 'Javed Auto Clinic', 'Lahore', ['DHA', 'Gulberg', 'Model Town'], 20, ['engine-diagnostics', 'brake-repair', 'ac-repair'], 4.9, 210, 1150, true, 'Senior mechanic for Japanese and Korean cars. Honest estimate before any work.'],
  ['Usman Ghani', 'Ghani Tyre Point', 'Lahore', ['Johar Town', 'Wapda Town'], 8, ['tyre-replacement', 'general-inspection'], 4.4, 47, 260, false, 'Tyres, alignment and balancing. Mobile service available.'],
  ['Faisal Khan', 'Khan Car Care', 'Karachi', ['Gulshan-e-Iqbal', 'PECHS', 'Bahadurabad'], 12, ['ac-repair', 'oil-change', 'general-inspection'], 4.7, 88, 530, true, 'Car AC and service specialist for Karachi heat.'],
  ['Zubair Ahmed', null, 'Karachi', ['Clifton', 'DHA'], 6, ['emergency-roadside', 'tyre-replacement', 'battery-replacement'], 4.6, 52, 240, true, 'Roadside help across Clifton and DHA, 24/7.'],
  ['Adnan Qureshi', 'Qureshi Motors', 'Karachi', ['North Nazimabad', 'Gulberg'], 16, ['engine-diagnostics', 'brake-repair'], 4.8, 117, 700, true, 'Engine overhaul, overheating and brake repair.'],
  ['Hamza Iqbal', 'Hamza Auto Electric', 'Islamabad', ['Bahria Enclave', 'DHA 2', 'PWD'], 10, ['battery-replacement', 'engine-diagnostics', 'ac-repair'], 4.7, 69, 380, false, 'Auto electrician: wiring, self starter, alternator and AC.'],
];

export const DEMO_MECHANICS: PublicMechanic[] = SEEDS.map((s, i) => ({
  id: `${DEMO_PREFIX}${i + 1}`,
  user_id: `${DEMO_PREFIX}${i + 1}`,
  full_name: s[0],
  workshop_name: s[1],
  city: s[2],
  service_areas: s[3],
  years_experience: s[4],
  specializations: s[5],
  rating_avg: s[6],
  rating_count: s[7],
  total_jobs: s[8],
  is_available: s[9],
  description: s[10],
  profile_photo_url: null,
  verification_status: 'approved',
  is_suspended: false,
  created_at: '2026-10-01T00:00:00Z',
}));

const COMMENTS: [number, string][] = [
  [5, 'Bohat acha kaam kiya, time par aaye aur price bhi pehle bata di.'],
  [5, 'Very honest mechanic. Fixed the problem in one visit.'],
  [4, 'Kaam theek tha, thora late aaye lekin masla hal ho gaya.'],
  [5, 'Ghar aa kar gaari theek ki, highly recommended.'],
  [5, 'Explained everything clearly and did not overcharge.'],
  [4, 'Good work, would book again.'],
];

export function demoReviews(m: PublicMechanic): Review[] {
  return COMMENTS.map(([rating, comment], i) => ({
    id: `${m.id}-r${i}`,
    booking_id: '',
    customer_id: '',
    mechanic_id: m.user_id,
    rating: m.rating_avg < 4.6 && i === 0 ? 4 : rating,
    comment,
    created_at: new Date(Date.UTC(2026, 9, 28 - i * 4)).toISOString(),
  }));
}
