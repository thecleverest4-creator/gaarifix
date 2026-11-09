import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Car, Wrench, Phone, Camera, CheckCircle2, XCircle, Star, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { StatusBadge } from '@/components/StatusBadge';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { formatPKR } from '@/lib/constants';
import type { Booking, BookingStatusHistory, Mechanic, Review } from '@/types';

export function BookingDetailPage({ bookingId }: { bookingId: string }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // review form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadBooking = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, service:services(*), vehicle:vehicles(*)')
      .eq('id', bookingId)
      .maybeSingle();
    if (error || !data) { setLoading(false); return; }
    const b = data as Booking;
    setBooking(b);

    if (b.mechanic_id) {
      const { data: m } = await supabase.from('mechanics').select('*').eq('user_id', b.mechanic_id).maybeSingle();
      setMechanic(m as Mechanic | null);
    }

    const { data: h } = await supabase
      .from('booking_status_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (h) setHistory(h as BookingStatusHistory[]);

    if (b.status === 'completed') {
      const { data: r } = await supabase.from('reviews').select('*').eq('booking_id', bookingId).maybeSingle();
      setExistingReview(r as Review | null);
    }

    setLoading(false);
  };

  useEffect(() => { loadBooking(); /* eslint-disable-next-line */ }, [bookingId]);

  const isCustomer = booking?.customer_id === user?.id;
  const canCancel = isCustomer && booking?.status === 'pending';

  const handleCancel = async () => {
    if (!booking || !canCancel) return;
    setCancelling(true);
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    setCancelling(false);
    if (error) { setError(error.message); return; }
    loadBooking();
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !booking.mechanic_id) return;
    setReviewSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      customer_id: user!.id,
      mechanic_id: booking.mechanic_id,
      rating,
      comment: comment.trim() || null,
    });
    setReviewSubmitting(false);
    if (error) { setError(error.message); return; }
    loadBooking();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div></header>
        <div className="flex items-center justify-center py-20"><Spinner className="h-8 w-8" /></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div></header>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState title="Booking not found" description="This booking may have been removed." action={<button onClick={() => navigate('/dashboard')} className="btn-primary">Back to dashboard</button>} />
        </div>
      </div>
    );
  }

  const dateLabel = booking.preferred_date
    ? new Date(booking.preferred_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Immediate assistance';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Logo />
          <button onClick={() => navigate(profile?.role === 'mechanic' ? '/mechanic/dashboard' : '/dashboard')} className="ml-auto btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-navy-700 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-navy-200">{booking.booking_ref}</p>
                <h1 className="mt-1 text-xl font-bold">{booking.service?.name}</h1>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 gap-px bg-gray-50 sm:grid-cols-2">
            <DetailCell icon={<Car className="h-4 w-4" />} label="Vehicle" value={booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.year})` : 'Not specified'} />
            <DetailCell icon={<MapPin className="h-4 w-4" />} label="Location" value={`${booking.address}, ${booking.area}, ${booking.city}`} />
            <DetailCell icon={<Calendar className="h-4 w-4" />} label="Date" value={dateLabel} />
            <DetailCell icon={<Clock className="h-4 w-4" />} label="Time" value={booking.preferred_time_slot ?? 'As soon as possible'} />
            <DetailCell icon={<Phone className="h-4 w-4" />} label="Phone" value={booking.customer_phone} />
            <DetailCell icon={<Wrench className="h-4 w-4" />} label="Estimated price" value={formatPKR(booking.estimated_price)} />
          </div>

          {/* Problem */}
          <div className="border-t border-gray-50 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Problem description</p>
            <p className="mt-2 text-sm text-navy-700">{booking.problem_description}</p>
            {booking.photo_url && (
              <div className="mt-3">
                <a href={booking.photo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:underline">
                  <Camera className="h-4 w-4" /> View attached photo
                </a>
              </div>
            )}
          </div>

          {/* Mechanic info */}
          {mechanic && (
            <div className="border-t border-gray-50 px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Assigned mechanic</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-lg font-semibold text-navy-600">
                  {mechanic.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-700">{mechanic.full_name}</p>
                  <p className="text-xs text-navy-400">{mechanic.years_experience} years experience · {mechanic.city}</p>
                </div>
                <a href={`tel:${mechanic.phone}`} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100" aria-label="Call mechanic">
                  <Phone className="h-5 w-5" />
                </a>
              </div>
            </div>
          )}

          {/* Final quotation */}
          {booking.status === 'completed' && (
            <div className="border-t border-gray-50 bg-green-50/50 px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wider text-green-600">Final settlement</p>
              <div className="mt-3 space-y-2 text-sm">
                {booking.final_amount != null && <Row label="Final service amount" value={formatPKR(booking.final_amount)} />}
                {booking.parts_charges != null && <Row label="Parts charges" value={formatPKR(booking.parts_charges)} />}
                {booking.labour_charges != null && <Row label="Labour charges" value={formatPKR(booking.labour_charges)} />}
                {booking.repair_note && <p className="pt-2 text-navy-600"><span className="font-medium">Mechanic's note:</span> {booking.repair_note}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Status timeline */}
        <div className="card mt-6 p-6">
          <h2 className="text-base font-semibold text-navy-700">Status timeline</h2>
          <div className="mt-4 space-y-4">
            {history.length === 0 ? (
              <p className="text-sm text-navy-400">No updates yet.</p>
            ) : history.map((h, i) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${i === history.length - 1 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-navy-400'}`}>
                    {h.status === 'cancelled' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  {i < history.length - 1 && <div className="h-6 w-px bg-gray-200" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-700 capitalize">{h.status.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-navy-400">{new Date(h.created_at).toLocaleString('en-PK')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review section */}
        {booking.status === 'completed' && isCustomer && (
          <div className="card mt-6 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700"><Star className="h-5 w-5 text-orange-500" /> Rate your experience</h2>
            {existingReview ? (
              <div className="mt-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-6 w-6 ${i < existingReview.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                {existingReview.comment && <p className="mt-3 text-sm text-navy-600">"{existingReview.comment}"</p>}
                <p className="mt-2 text-xs text-green-600">Thank you for your review!</p>
              </div>
            ) : (
              <form onSubmit={handleReview} className="mt-4 space-y-4">
                <div>
                  <label className="label-text">Your rating</label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} stars`}>
                        <Star className={`h-8 w-8 transition-colors ${i < rating ? 'fill-orange-400 text-orange-400' : 'text-gray-200 hover:text-orange-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-text">Comment (optional)</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="input-field resize-none" placeholder="Share your experience…" />
                </div>
                <button type="submit" disabled={reviewSubmitting} className="btn-primary">{reviewSubmitting ? <Spinner className="h-4 w-4" /> : 'Submit review'}</button>
              </form>
            )}
          </div>
        )}

        {/* Cancel button */}
        {canCancel && (
          <div className="mt-6 flex justify-end">
            <button onClick={handleCancel} disabled={cancelling} className="btn-outline text-red-600 border-red-200 hover:bg-red-50">
              {cancelling ? <Spinner className="h-4 w-4" /> : <><XCircle className="h-4 w-4" /> Cancel booking</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white px-6 py-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-300">{icon} {label}</p>
      <p className="mt-1 text-sm text-navy-700">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-400">{label}</span>
      <span className="font-semibold text-navy-700">{value}</span>
    </div>
  );
}
