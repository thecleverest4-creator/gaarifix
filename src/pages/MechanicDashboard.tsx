import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Wrench, CheckCircle, Clock, History, User,
  ArrowRight, MapPin, Car, Phone, Calendar, Star, TrendingUp,
  CheckCircle2, X, AlertCircle, FileText, Power,
} from 'lucide-react';
import { DashboardShell, PageHeader, StatCard } from '@/components/DashboardShell';
import { StatusBadge, VerificationBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { acceptBooking, declineDirectBooking } from '@/lib/mechanics';
import { formatPKR } from '@/lib/constants';
import type { Booking, Mechanic, BookingStatusHistory } from '@/types';

type Tab = 'overview' | 'requests' | 'active' | 'history' | 'profile';

export function MechanicDashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigate, path } = useRouter();
  // The tab comes from the URL, so the sidebar links and the browser back button both work.
  const seg = path.slice('/mechanic/dashboard'.length).replace(/^\//, '').split('/')[0];
  const tab: Tab = (['requests', 'active', 'history', 'profile'] as string[]).includes(seg) ? (seg as Tab) : 'overview';
  const setTab = (t: Tab) => navigate(t === 'overview' ? '/mechanic/dashboard' : `/mechanic/dashboard/${t}`);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const loadMechanic = async () => {
    const { data } = await supabase.from('mechanics').select('*').eq('user_id', user!.id).maybeSingle();
    setMechanic(data as Mechanic | null);
    return data as Mechanic | null;
  };

  const loadBookings = async () => {
    // pending requests: all unassigned pending bookings
    const { data: pending } = await supabase
      .from('bookings')
      .select('*, service:services(*), vehicle:vehicles(*), customer_profile:profiles!bookings_customer_id_fkey(full_name, phone)')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .order('created_at', { ascending: false });
    // my bookings: assigned to me
    const { data: mine } = await supabase
      .from('bookings')
      .select('*, service:services(*), vehicle:vehicles(*), customer_profile:profiles!bookings_customer_id_fkey(full_name, phone)')
      .eq('mechanic_id', user!.id)
      .order('created_at', { ascending: false });
    const combined = [...(pending ?? []), ...(mine ?? [])] as Booking[];
    // dedupe by id
    const seen = new Set<string>();
    setAllBookings(combined.filter((b) => { if (seen.has(b.id)) return false; seen.add(b.id); return true; }));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadMechanic();
      await loadBookings();
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  // redirect to registration if no mechanic profile
  useEffect(() => {
    if (!loading && !mechanic) {
      navigate('/mechanic/register');
    }
  }, [loading, mechanic, navigate]);

  const pendingRequests = allBookings
    .filter((b) => b.status === 'pending' && (!b.mechanic_id || b.mechanic_id === user!.id))
    // requests sent directly to me come first
    .sort((a, b) => Number(b.mechanic_id === user!.id) - Number(a.mechanic_id === user!.id));
  const activeJobs = allBookings.filter((b) => ['accepted', 'on_the_way', 'in_progress'].includes(b.status));
  const completedJobs = allBookings.filter((b) => b.status === 'completed');
  const historyJobs = allBookings.filter((b) => ['completed', 'cancelled'].includes(b.status));

  const toggleAvailability = async () => {
    if (!mechanic) return;
    setTogglingAvail(true);
    const { error } = await supabase.from('mechanics').update({ is_available: !mechanic.is_available }).eq('id', mechanic.id);
    setTogglingAvail(false);
    if (error) return;
    loadMechanic();
  };

  const navItems = [
    { label: 'Overview', path: '/mechanic/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Requests', path: '/mechanic/dashboard/requests', icon: <Wrench className="h-5 w-5" /> },
    { label: 'Active Jobs', path: '/mechanic/dashboard/active', icon: <Clock className="h-5 w-5" /> },
    { label: 'History', path: '/mechanic/dashboard/history', icon: <History className="h-5 w-5" /> },
    { label: 'Profile', path: '/mechanic/dashboard/profile', icon: <User className="h-5 w-5" /> },
  ];

  if (loading) {
    return <DashboardShell navItems={navItems} activePath="/mechanic/dashboard" role="mechanic"><Spinner className="h-8 w-8" /></DashboardShell>;
  }
  if (!mechanic) return null;

  const isPendingVerification = mechanic.verification_status === 'pending';
  const isRejected = mechanic.verification_status === 'rejected';
  const isSuspended = mechanic.is_suspended;

  return (
    <DashboardShell navItems={navItems} activePath={`/mechanic/dashboard${tab !== 'overview' ? '/' + tab : ''}`} role="mechanic">
      {/* Verification banner */}
      {(isPendingVerification || isRejected || isSuspended) && (
        <div className={`mb-6 flex items-start gap-3 rounded-xl px-5 py-4 text-sm ${
          isSuspended ? 'bg-red-50 text-red-700' : isRejected ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            {isPendingVerification && <p>Your account is under review. You'll be able to accept bookings once an admin approves your profile.</p>}
            {isRejected && <p>Your mechanic application was not approved. Please contact support for more information.</p>}
            {isSuspended && <p>Your account has been suspended. Please contact support to resolve this issue.</p>}
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <>
          <PageHeader
            title={`Hello, ${mechanic.full_name.split(' ')[0]}`}
            subtitle={mechanic.workshop_name ? mechanic.workshop_name : 'Mechanic dashboard'}
            action={
              <button onClick={toggleAvailability} disabled={togglingAvail || !mechanic.verification_status || mechanic.verification_status !== 'approved' || isSuspended} className="btn-outline">
                <Power className="h-4 w-4" /> {mechanic.is_available ? 'Available' : 'Unavailable'}
                <span className={`ml-1 h-2 w-2 rounded-full ${mechanic.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
              </button>
            }
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total jobs" value={mechanic.total_jobs} icon={<Wrench className="h-5 w-5" />} />
            <StatCard label="Pending requests" value={pendingRequests.length} icon={<Clock className="h-5 w-5" />} tone="orange" />
            <StatCard label="Active jobs" value={activeJobs.length} icon={<TrendingUp className="h-5 w-5" />} tone="blue" />
            <StatCard label="Earnings" value={formatPKR(mechanic.total_earnings)} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-700">Pending requests</h2>
                {pendingRequests.length > 0 && <button onClick={() => setTab('requests')} className="text-sm font-medium text-orange-600 hover:underline">View all</button>}
              </div>
              {pendingRequests.length === 0 ? (
                <EmptyState icon={<Wrench className="h-7 w-7" />} title="No pending requests" description={mechanic.verification_status === 'approved' ? "New booking requests will appear here." : "Once approved, you'll see requests here."} />
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map((b) => <RequestCard key={b.id} booking={b} onAccept={() => loadBookings()} onView={() => navigate(`/mechanic/bookings/${b.id}`)} canAccept={mechanic.verification_status === 'approved' && !isSuspended && mechanic.is_available} />)}
                </div>
              )}
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-700">Active jobs</h2>
                {activeJobs.length > 0 && <button onClick={() => setTab('active')} className="text-sm font-medium text-orange-600 hover:underline">View all</button>}
              </div>
              {activeJobs.length === 0 ? (
                <EmptyState icon={<Clock className="h-7 w-7" />} title="No active jobs" description="Jobs you've accepted will show up here." />
              ) : (
                <div className="space-y-3">
                  {activeJobs.slice(0, 3).map((b) => <JobCard key={b.id} booking={b} onClick={() => navigate(`/mechanic/bookings/${b.id}`)} />)}
                </div>
              )}
            </div>
          </div>

          {mechanic.rating_count > 0 && (
            <div className="mt-8 card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-700"><Star className="h-5 w-5 text-orange-500" /> Customer reviews</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-navy-700">{mechanic.rating_avg.toFixed(1)}</p>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(mechanic.rating_avg) ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />)}
                  </div>
                  <p className="mt-1 text-xs text-navy-400">{mechanic.rating_count} reviews</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <>
          <PageHeader title="Booking Requests" subtitle="Review and accept customer requests." />
          {loading ? <Spinner /> : pendingRequests.length === 0 ? (
            <EmptyState icon={<Wrench className="h-7 w-7" />} title="No pending requests" description="New booking requests from customers will appear here." />
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((b) => <RequestCard key={b.id} booking={b} onAccept={() => loadBookings()} onView={() => navigate(`/mechanic/bookings/${b.id}`)} canAccept={mechanic.verification_status === 'approved' && !isSuspended && mechanic.is_available} />)}
            </div>
          )}
        </>
      )}

      {tab === 'active' && (
        <>
          <PageHeader title="Active Jobs" subtitle="Jobs you've accepted and are working on." />
          {loading ? <Spinner /> : activeJobs.length === 0 ? (
            <EmptyState icon={<Clock className="h-7 w-7" />} title="No active jobs" description="Accepted jobs will appear here." />
          ) : (
            <div className="space-y-3">
              {activeJobs.map((b) => <JobCard key={b.id} booking={b} onClick={() => navigate(`/mechanic/bookings/${b.id}`)} />)}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          <PageHeader title="Job History" subtitle="Your completed and cancelled jobs." />
          {loading ? <Spinner /> : historyJobs.length === 0 ? (
            <EmptyState icon={<History className="h-7 w-7" />} title="No history yet" description="Your past jobs will appear here." />
          ) : (
            <div className="space-y-3">
              {historyJobs.map((b) => <JobCard key={b.id} booking={b} onClick={() => navigate(`/mechanic/bookings/${b.id}`)} />)}
            </div>
          )}
        </>
      )}

      {tab === 'profile' && <MechanicProfile mechanic={mechanic} profile={profile} onUpdated={async () => { await loadMechanic(); await refreshProfile(); }} />}
    </DashboardShell>
  );
}

function RequestCard({ booking, onAccept, onView, canAccept }: { booking: Booking; onAccept: () => void; onView: () => void; canAccept: boolean }) {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    const err = await acceptBooking(booking, user!.id);
    setAccepting(false);
    if (err) { setError(err); return; }
    onAccept();
  };

  const handleDecline = async () => {
    setAccepting(true);
    const err = await declineDirectBooking(booking.id, user!.id);
    setAccepting(false);
    if (err) { setError(err); return; }
    onAccept();
  };
  const isDirect = booking.mechanic_id === user?.id;

  const customerName = (booking.customer_profile as unknown as { full_name: string } | null)?.full_name ?? 'Customer';
  const customerPhone = (booking.customer_profile as unknown as { phone: string | null } | null)?.phone ?? booking.customer_phone;
  const date = booking.preferred_date ? new Date(booking.preferred_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : 'Immediate';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-navy-400">{booking.booking_ref}</span>
            <StatusBadge status={booking.status} />
            {isDirect && <span className="badge bg-orange-500 text-white">Sent to you</span>}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-navy-700">{booking.service?.name}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-navy-400">
            <span className="flex items-center gap-1.5"><Car className="h-3.5 w-3.5" /> {booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Any'}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {booking.area}, {booking.city}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {date}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {customerPhone}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-navy-500">{booking.problem_description}</p>
          <p className="mt-1 text-xs font-medium text-navy-300">Customer: {customerName}</p>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-sm font-bold text-navy-700">{formatPKR(booking.estimated_price)}</span>
          {canAccept ? (
            <button onClick={handleAccept} disabled={accepting} className="btn-primary px-4 py-2 text-xs">
              {accepting ? <Spinner className="h-3.5 w-3.5" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Accept</>}
            </button>
          ) : (
            <span className="text-xs text-navy-300">Not available to accept</span>
          )}
          {isDirect && (
            <button onClick={handleDecline} disabled={accepting} className="text-xs font-medium text-red-600 hover:underline">Decline</button>
          )}
          <button onClick={onView} className="text-xs font-medium text-navy-500 hover:text-orange-600">Details →</button>
        </div>
      </div>
    </div>
  );
}

function JobCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const date = booking.preferred_date ? new Date(booking.preferred_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : 'Immediate';
  return (
    <button onClick={onClick} className="card group flex w-full items-center gap-4 p-5 text-left hover:shadow-cardHover">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Wrench className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-navy-400">{booking.booking_ref}</span>
          <StatusBadge status={booking.status} />
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-navy-700">{booking.service?.name}</h3>
        <p className="mt-0.5 text-xs text-navy-400">{booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'No vehicle'} · {date} · {booking.area}, {booking.city}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-navy-300 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" />
    </button>
  );
}

function MechanicProfile({ mechanic, profile, onUpdated }: { mechanic: Mechanic; profile: ReturnType<typeof useAuth>['profile']; onUpdated: () => Promise<void> }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(mechanic.full_name);
  const [phone, setPhone] = useState(mechanic.phone);
  const [workshopName, setWorkshopName] = useState(mechanic.workshop_name ?? '');
  const [description, setDescription] = useState(mechanic.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    await supabase.from('mechanics').update({
      full_name: fullName.trim(),
      phone: phone.trim(),
      workshop_name: workshopName.trim() || null,
      description: description.trim() || null,
    }).eq('id', mechanic.id);
    await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', user!.id);
    setSaving(false);
    setSaved(true);
    await onUpdated();
  };

  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your mechanic profile." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-100 text-2xl font-bold text-navy-600">{mechanic.full_name.charAt(0).toUpperCase()}</div>
            <h3 className="mt-4 text-lg font-semibold text-navy-700">{mechanic.full_name}</h3>
            <div className="mt-1"><VerificationBadge status={mechanic.verification_status} /></div>
            <div className="mt-4 w-full space-y-2 border-t border-gray-50 pt-4 text-sm text-navy-400">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-navy-300" /> {mechanic.phone}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-navy-300" /> {mechanic.city}</p>
              <p className="flex items-center gap-2"><Wrench className="h-4 w-4 text-navy-300" /> {mechanic.years_experience} years experience</p>
              {mechanic.rating_count > 0 && <p className="flex items-center gap-2"><Star className="h-4 w-4 text-navy-300" /> {mechanic.rating_avg.toFixed(1)} ({mechanic.rating_count} reviews)</p>}
            </div>
            <div className="mt-4 w-full border-t border-gray-50 pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Service areas</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mechanic.service_areas.map((a) => <span key={a} className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-500">{a}</span>)}
              </div>
            </div>
            <div className="mt-4 w-full border-t border-gray-50 pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Specializations</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mechanic.specializations.map((s) => <span key={s} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">{s.replace(/-/g, ' ')}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-navy-700">Edit details</h3>
          {saved && <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Profile updated successfully.</div>}
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label className="label-text">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Workshop name (optional)</label>
              <input value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="input-field resize-none" />
            </div>
            <div>
              <label className="label-text">Email (cannot be changed)</label>
              <input value={user?.email ?? ''} disabled className="input-field bg-gray-50 text-navy-400" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner className="h-4 w-4" /> : 'Save changes'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
