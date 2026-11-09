import { useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, Calendar, Clock, Car, Phone, Camera,
  CheckCircle2, AlertCircle, Star, FileText, Wrench,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { StatusBadge } from '@/components/StatusBadge';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { formatPKR } from '@/lib/constants';
import type { Booking, BookingStatusHistory, Review } from '@/types';

const NEXT_ACTION_LABEL: Record<string, string> = {
  accepted: 'Mark as "On the Way"',
  on_the_way: 'Start the job',
  in_progress: 'Mark as completed',
};

export function MechanicBookingDetailPage({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // completion form
  const [finalAmount, setFinalAmount] = useState('');
  const [partsCharges, setPartsCharges] = useState('');
  const [labourCharges, setLabourCharges] = useState('');
  const [repairNote, setRepairNote] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  const loadBooking = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, service:services(*), vehicle:vehicles(*), customer_profile:profiles!bookings_customer_id_fkey(full_name, phone)')
      .eq('id', bookingId)
      .maybeSingle();
    if (error || !data) { setLoading(false); return; }
    setBooking(data as Booking);
    setFinalAmount(data.estimated_price ? String(data.estimated_price) : '');
    if (data.parts_charges != null) setPartsCharges(String(data.parts_charges));
    if (data.labour_charges != null) setLabourCharges(String(data.labour_charges));
    if (data.repair_note) setRepairNote(data.repair_note);

    const { data: h } = await supabase.from('booking_status_history').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true });
    if (h) setHistory(h as BookingStatusHistory[]);

    if (data.mechanic_id) {
      const { data: rv } = await supabase.from('reviews').select('*').eq('mechanic_id', data.mechanic_id).order('created_at', { ascending: false }).limit(5);
      if (rv) setReviews(rv as Review[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadBooking(); /* eslint-disable-next-line */ }, [bookingId]);

  const isAssignedMechanic = booking?.mechanic_id === user?.id;
  const canAdvance = isAssignedMechanic && ['accepted', 'on_the_way', 'in_progress'].includes(booking?.status ?? '');

  const handleAdvance = async () => {
    if (!booking) return;
    setActionLoading(true); setError(null);
    if (booking.status === 'in_progress') {
      // require completion details
      if (!finalAmount) { setError('Please enter a final service amount.'); setActionLoading(false); return; }
      const { error: updErr } = await supabase.from('bookings').update({
        final_amount: parseInt(finalAmount, 10) || null,
        parts_charges: partsCharges ? parseInt(partsCharges, 10) : null,
        labour_charges: labourCharges ? parseInt(labourCharges, 10) : null,
        repair_note: repairNote.trim() || null,
      }).eq('id', booking.id);
      if (updErr) { setError(updErr.message); setActionLoading(false); return; }
    }
    const { error: rpcErr } = await supabase.rpc('advance_booking_status', { p_booking_id: booking.id });
    setActionLoading(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    loadBooking();
  };

  const handleReject = async () => {
    // Mechanic "rejects" by not accepting — there's no assigned mechanic to reject.
    // This is just navigating back; pending bookings auto-expire.
    navigate('/mechanic/dashboard');
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
          <EmptyState title="Booking not found" action={<button onClick={() => navigate('/mechanic/dashboard')} className="btn-primary">Back to dashboard</button>} />
        </div>
      </div>
    );
  }

  const customerName = (booking.customer_profile as unknown as { full_name: string } | null)?.full_name ?? 'Customer';
  const customerPhone = (booking.customer_profile as unknown as { phone: string | null } | null)?.phone ?? booking.customer_phone;
  const dateLabel = booking.preferred_date ? new Date(booking.preferred_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Immediate assistance';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Logo />
          <button onClick={() => navigate('/mechanic/dashboard')} className="ml-auto btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

        <div className="card overflow-hidden">
          <div className="bg-navy-700 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-navy-200">{booking.booking_ref}</p>
                <h1 className="mt-1 text-xl font-bold">{booking.service?.name}</h1>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </div>

          {/* Customer & vehicle info */}
          <div className="grid grid-cols-1 gap-px bg-gray-50 sm:grid-cols-2">
            <div className="bg-white px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Customer</p>
              <p className="mt-1 text-sm font-semibold text-navy-700">{customerName}</p>
              <a href={`tel:${customerPhone}`} className="mt-1 flex items-center gap-1.5 text-sm text-orange-600"><Phone className="h-3.5 w-3.5" /> {customerPhone}</a>
            </div>
            <div className="bg-white px-6 py-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-300"><Car className="h-3.5 w-3.5" /> Vehicle</p>
              <p className="mt-1 text-sm text-navy-700">{booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.year})` : 'Not specified'}</p>
              {booking.vehicle && <p className="text-xs text-navy-400">REG: {booking.vehicle.registration_number} · {booking.vehicle.fuel_type}</p>}
            </div>
            <div className="bg-white px-6 py-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-300"><MapPin className="h-3.5 w-3.5" /> Location</p>
              <p className="mt-1 text-sm text-navy-700">{booking.address}</p>
              <p className="text-xs text-navy-400">{booking.area}, {booking.city}</p>
              {booking.map_location && <a href={booking.map_location} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-orange-600 hover:underline">View on map →</a>}
            </div>
            <div className="bg-white px-6 py-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-300"><Calendar className="h-3.5 w-3.5" /> Schedule</p>
              <p className="mt-1 text-sm text-navy-700">{dateLabel}</p>
              <p className="text-xs text-navy-400">{booking.preferred_time_slot ?? 'As soon as possible'}</p>
            </div>
          </div>

          {/* Problem */}
          <div className="border-t border-gray-50 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Problem description</p>
            <p className="mt-2 text-sm text-navy-700">{booking.problem_description}</p>
            {booking.photo_url && (
              <a href={booking.photo_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:underline"><Camera className="h-4 w-4" /> View customer's photo</a>
            )}
          </div>

          {/* Estimated price */}
          <div className="border-t border-gray-50 bg-navy-50/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-400">Estimated service price</span>
              <span className="text-lg font-bold text-navy-700">{formatPKR(booking.estimated_price)}</span>
            </div>
          </div>
        </div>

        {/* Completion form (shown when in_progress) */}
        {booking.status === 'in_progress' && isAssignedMechanic && (
          <div className="card mt-6 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700"><FileText className="h-5 w-5 text-orange-500" /> Service completion details</h2>
            <p className="mt-1 text-sm text-navy-400">Enter the final quotation before marking this job as completed.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label-text">Final service amount (PKR)</label>
                <input type="number" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="input-field" placeholder="5000" />
              </div>
              <div>
                <label className="label-text">Parts charges (optional)</label>
                <input type="number" value={partsCharges} onChange={(e) => setPartsCharges(e.target.value)} className="input-field" placeholder="2000" />
              </div>
              <div>
                <label className="label-text">Labour charges (optional)</label>
                <input type="number" value={labourCharges} onChange={(e) => setLabourCharges(e.target.value)} className="input-field" placeholder="1000" />
              </div>
            </div>
            <div className="mt-4">
              <label className="label-text">Repair note for customer (optional)</label>
              <textarea value={repairNote} onChange={(e) => setRepairNote(e.target.value)} rows={3} className="input-field resize-none" placeholder="Describe what was fixed, parts replaced, and any recommendations…" />
            </div>
          </div>
        )}

        {/* Final settlement display (completed) */}
        {booking.status === 'completed' && (
          <div className="card mt-6 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700"><CheckCircle2 className="h-5 w-5 text-green-500" /> Service completed</h2>
            <div className="mt-4 space-y-2 text-sm">
              {booking.final_amount != null && <div className="flex justify-between"><span className="text-navy-400">Final service amount</span><span className="font-semibold text-navy-700">{formatPKR(booking.final_amount)}</span></div>}
              {booking.parts_charges != null && <div className="flex justify-between"><span className="text-navy-400">Parts charges</span><span className="font-semibold text-navy-700">{formatPKR(booking.parts_charges)}</span></div>}
              {booking.labour_charges != null && <div className="flex justify-between"><span className="text-navy-400">Labour charges</span><span className="font-semibold text-navy-700">{formatPKR(booking.labour_charges)}</span></div>}
              {booking.repair_note && <p className="pt-2 text-navy-600"><span className="font-medium">Repair note:</span> {booking.repair_note}</p>}
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div className="card mt-6 p-6">
          <h2 className="text-base font-semibold text-navy-700">Status timeline</h2>
          <div className="mt-4 space-y-4">
            {history.map((h, i) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${i === history.length - 1 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-navy-400'}`}><CheckCircle2 className="h-4 w-4" /></div>
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

        {/* Action buttons */}
        {canAdvance && (
          <div className="mt-6 flex justify-end gap-3">
            {booking.status === 'in_progress' ? (
              <button onClick={handleAdvance} disabled={actionLoading} className="btn-primary">
                {actionLoading ? <Spinner className="h-4 w-4" /> : <><CheckCircle2 className="h-4 w-4" /> Mark as completed</>}
              </button>
            ) : (
              <button onClick={handleAdvance} disabled={actionLoading} className="btn-primary">
                {actionLoading ? <Spinner className="h-4 w-4" /> : <><CheckCircle2 className="h-4 w-4" /> {NEXT_ACTION_LABEL[booking.status] ?? 'Advance'}</>}
              </button>
            )}
          </div>
        )}

        {booking.status === 'pending' && !booking.mechanic_id && (
          <AcceptSection bookingId={booking.id} onAccepted={loadBooking} onReject={handleReject} />
        )}

        {/* Recent reviews */}
        {reviews.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700"><Star className="h-5 w-5 text-orange-500" /> Recent reviews</h2>
            <div className="mt-4 space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-gray-50 pb-3 last:border-0">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />)}
                  </div>
                  {r.comment && <p className="mt-1.5 text-sm text-navy-600">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AcceptSection({ bookingId, onAccepted, onReject }: { bookingId: string; onAccepted: () => void; onReject: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.rpc('claim_booking', { p_booking_id: bookingId });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAccepted();
  };

  return (
    <div className="mt-6 flex items-center justify-end gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={onReject} className="btn-outline">Skip</button>
      <button onClick={handleAccept} disabled={loading} className="btn-primary">
        {loading ? <Spinner className="h-4 w-4" /> : <><CheckCircle2 className="h-4 w-4" /> Accept job</>}
      </button>
    </div>
  );
}
