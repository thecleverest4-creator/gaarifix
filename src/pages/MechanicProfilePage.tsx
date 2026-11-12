import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Briefcase, CalendarCheck, MapPin, MessageCircle, Phone, ShieldCheck, Wrench } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Footer } from '@/components/Footer';
import { Spinner } from '@/components/Spinner';
import { Stars } from '@/components/Stars';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { SPECIALIZATION_OPTIONS, formatPKR } from '@/lib/constants';
import { PUBLIC_MECHANIC_COLS, initials, type PublicMechanic } from '@/lib/mechanics';
import type { Review, Service } from '@/types';

export function MechanicProfilePage({ mechanicId }: { mechanicId: string }) {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const [m, setM] = useState<PublicMechanic | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('mechanics').select(PUBLIC_MECHANIC_COLS).eq('id', mechanicId).maybeSingle();
      const mech = (data as PublicMechanic | null) ?? null;
      setM(mech);
      if (!mech) return;
      const [rv, sv] = await Promise.all([
        supabase.from('reviews').select('*').eq('mechanic_id', mech.user_id).order('created_at', { ascending: false }).limit(20),
        supabase.from('services').select('*').eq('is_active', true),
      ]);
      setReviews((rv.data ?? []) as Review[]);
      setServices((sv.data ?? []) as Service[]);
      if (profile) {
        const { data: p } = await supabase.from('mechanics').select('phone').eq('id', mechanicId).maybeSingle();
        setPhone((p as { phone?: string } | null)?.phone ?? null);
      }
    })();
  }, [mechanicId, profile]);

  if (m === undefined)
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
      </div>
    );

  if (!m || m.verification_status !== 'approved' || m.is_suspended)
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-navy-700">Mechanic not found</h1>
          <p className="mt-2 text-navy-400">{profile ? 'This mechanic is no longer listed.' : 'Please sign in to view mechanic profiles.'}</p>
          <button onClick={() => navigate(profile ? '/mechanics' : '/login')} className="btn-primary mt-6">
            {profile ? 'Browse mechanics' : 'Login'}
          </button>
        </div>
      </div>
    );

  const specs = m.specializations.length ? m.specializations : SPECIALIZATION_OPTIONS.map((s) => s.slug);
  const myServices = services.filter((s) => specs.includes(s.slug));
  const wa = phone ? phone.replace(/\D/g, '').replace(/^0/, '92') : null;
  const breakdown = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/mechanics')} className="btn-ghost -ml-3 mb-4">
          <ArrowLeft className="h-4 w-4" /> All mechanics
        </button>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="card flex flex-col gap-5 p-6 sm:flex-row">
              {m.profile_photo_url ? (
                <img src={m.profile_photo_url} alt={m.full_name} className="h-28 w-28 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-orange-200 bg-orange-50 text-3xl font-bold text-navy-700">
                  {initials(m.full_name)}
                </span>
              )}
              <div className="flex-1">
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-navy-700">
                  {m.workshop_name || m.full_name} <BadgeCheck className="h-6 w-6 text-orange-500" />
                </h1>
                {m.workshop_name && <p className="text-navy-400">{m.full_name}</p>}
                <p className="mt-2 flex items-center gap-2">
                  <Stars value={m.rating_avg} size="h-5 w-5" />
                  <b className="text-navy-700">{Number(m.rating_avg).toFixed(1)}</b>
                  <span className="text-sm text-navy-400">({m.rating_count} reviews)</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-navy-500">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-orange-500" /> {m.city}{m.service_areas.length ? ` · ${m.service_areas.join(', ')}` : ''}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-orange-500" /> {m.years_experience} years · {m.total_jobs} jobs</span>
                </div>
                <span className={`badge mt-3 ${m.is_available ? 'bg-navy-700 text-white' : 'bg-gray-100 text-navy-400'}`}>
                  {m.is_available ? 'Available now' : 'Currently busy'}
                </span>
              </div>
            </div>

            {m.description && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-navy-700">About</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-navy-500">{m.description}</p>
              </div>
            )}

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-navy-700">Services &amp; starting prices</h2>
              <div className="mt-3 divide-y divide-gray-100">
                {myServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2 font-medium text-navy-700"><Wrench className="h-4 w-4 text-orange-500" /> {s.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm text-navy-500">from {formatPKR(s.starting_price)}</span>
                      <button onClick={() => navigate(`/book?mechanic=${m.user_id}&service=${s.slug}`)} className="btn-outline px-3 py-1.5 text-xs">Book</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-navy-700">Customer reviews</h2>
              {reviews.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {breakdown.map(({ n, c }) => (
                    <div key={n} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-navy-500">{n}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${(c / reviews.length) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-navy-400">{c}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 space-y-4">
                {reviews.length === 0 && <p className="text-sm text-navy-400">No reviews yet.</p>}
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} />
                      <span className="text-xs text-navy-300">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-navy-600">“{r.comment}”</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card space-y-3 p-5">
              <p className="flex items-center gap-2 font-semibold text-navy-700"><ShieldCheck className="h-5 w-5 text-orange-500" /> Verified by GaariFix</p>
              <p className="text-sm text-navy-400">CNIC checked. Ratings come only from customers who booked this mechanic.</p>
              <button onClick={() => navigate(`/book?mechanic=${m.user_id}`)} className="btn-primary w-full py-3.5 text-base">
                <CalendarCheck className="h-5 w-5" /> Book this mechanic
              </button>
              {profile && phone ? (
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${phone}`} className="btn-secondary px-3"><Phone className="h-4 w-4" /> Call</a>
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Assalam o Alaikum, I found you on GaariFix and need help with my car.')}`} target="_blank" rel="noreferrer" className="btn-primary px-3">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              ) : (
                !profile && (
                  <button onClick={() => navigate('/login')} className="btn-outline w-full">
                    <Phone className="h-4 w-4" /> Login to call or WhatsApp
                  </button>
                )
              )}
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}
