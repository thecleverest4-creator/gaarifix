import { useEffect, useState } from 'react';
import { LayoutDashboard, Car, Wrench, User, Plus, Pencil, Trash2, Phone, Mail, MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { DashboardShell, PageHeader, StatCard } from '@/components/DashboardShell';
import { VehicleForm } from '@/components/VehicleForm';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { formatPKR, FUEL_TYPES } from '@/lib/constants';
import type { Vehicle, Booking, FuelType } from '@/types';

type Tab = 'overview' | 'vehicles' | 'bookings' | 'profile';

export function CustomerDashboard() {
  const { profile, user, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [vRes, bRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('*, service:services(*), vehicle:vehicles(*)')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false }),
    ]);
    if (vRes.data) setVehicles(vRes.data as Vehicle[]);
    if (bRes.data) setBookings(bRes.data as Booking[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, []);

  const activeBookings = bookings.filter((b) => ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status));
  const pastBookings = bookings.filter((b) => ['completed', 'cancelled'].includes(b.status));

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Remove this vehicle? Past bookings will keep a reference but new bookings cannot use it.')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    setVehicles((v) => v.filter((x) => x.id !== id));
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'My Vehicles', path: '/dashboard/vehicles', icon: <Car className="h-5 w-5" /> },
    { label: 'My Bookings', path: '/dashboard/bookings', icon: <Wrench className="h-5 w-5" /> },
    { label: 'Profile', path: '/dashboard/profile', icon: <User className="h-5 w-5" /> },
  ];

  return (
    <DashboardShell navItems={navItems} activePath={`/dashboard${tab !== 'overview' ? '/' + tab : ''}`} role="customer">
      {tab === 'overview' && (
        <>
          <PageHeader
            title={`Welcome, ${profile?.full_name?.split(' ')[0] ?? 'there'}`}
            subtitle="Manage your vehicles, bookings and profile."
            action={<button onClick={() => navigate('/book')} className="btn-primary"><Plus className="h-4 w-4" /> Book a Service</button>}
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total bookings" value={bookings.length} icon={<Wrench className="h-5 w-5" />} />
            <StatCard label="Active bookings" value={activeBookings.length} icon={<Clock className="h-5 w-5" />} tone="orange" />
            <StatCard label="Saved vehicles" value={vehicles.length} icon={<Car className="h-5 w-5" />} tone="blue" />
            <StatCard label="Completed" value={pastBookings.filter((b) => b.status === 'completed').length} icon={<Calendar className="h-5 w-5" />} tone="green" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-700">Active bookings</h2>
                <button onClick={() => setTab('bookings')} className="text-sm font-medium text-orange-600 hover:underline">View all</button>
              </div>
              {loading ? <Spinner /> : activeBookings.length === 0 ? (
                <EmptyState icon={<Wrench className="h-7 w-7" />} title="No active bookings" description="Book a service to get started." action={<button onClick={() => navigate('/book')} className="btn-primary">Book a Service</button>} />
              ) : (
                <div className="space-y-3">
                  {activeBookings.slice(0, 3).map((b) => <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />)}
                </div>
              )}
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-700">Your vehicles</h2>
                <button onClick={() => setTab('vehicles')} className="text-sm font-medium text-orange-600 hover:underline">View all</button>
              </div>
              {loading ? <Spinner /> : vehicles.length === 0 ? (
                <EmptyState icon={<Car className="h-7 w-7" />} title="No vehicles yet" description="Add a vehicle to start booking." action={<button onClick={() => setTab('vehicles')} className="btn-primary">Add a Vehicle</button>} />
              ) : (
                <div className="space-y-3">
                  {vehicles.slice(0, 3).map((v) => <VehicleCard key={v.id} vehicle={v} compact />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'vehicles' && (
        <>
          <PageHeader title="My Vehicles" subtitle="Add and manage the cars you book services for." action={<button onClick={() => { setEditingVehicle(null); setShowVehicleForm(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Add Vehicle</button>} />
          {showVehicleForm && (
            <div className="mb-6"><VehicleForm existing={editingVehicle} onCancel={() => setShowVehicleForm(false)} onSaved={(v) => {
              setVehicles((prev) => editingVehicle ? prev.map((x) => x.id === v.id ? v : x) : [v, ...prev]);
              setShowVehicleForm(false); setEditingVehicle(null);
            }} /></div>
          )}
          {loading ? <Spinner /> : vehicles.length === 0 && !showVehicleForm ? (
            <EmptyState icon={<Car className="h-7 w-7" />} title="No vehicles yet" description="Add your first vehicle to start booking services." action={<button onClick={() => setShowVehicleForm(true)} className="btn-primary">Add a Vehicle</button>} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {vehicles.map((v) => (
                <div key={v.id} className="relative">
                  <VehicleCard vehicle={v} />
                  <div className="absolute right-4 top-4 flex gap-1">
                    <button onClick={() => { setEditingVehicle(v); setShowVehicleForm(true); }} className="rounded-lg bg-white p-2 text-navy-500 shadow-sm hover:text-orange-500" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteVehicle(v.id)} className="rounded-lg bg-white p-2 text-navy-500 shadow-sm hover:text-red-500" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <>
          <PageHeader title="My Bookings" subtitle="Track all your service requests." action={<button onClick={() => navigate('/book')} className="btn-primary"><Plus className="h-4 w-4" /> Book a Service</button>} />
          {loading ? <Spinner /> : bookings.length === 0 ? (
            <EmptyState icon={<Wrench className="h-7 w-7" />} title="No bookings yet" description="Your service requests will appear here." action={<button onClick={() => navigate('/book')} className="btn-primary">Book a Service</button>} />
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />)}
            </div>
          )}
        </>
      )}

      {tab === 'profile' && <ProfileEditor onSaved={refreshProfile} />}
    </DashboardShell>
  );
}

function VehicleCard({ vehicle, compact }: { vehicle: Vehicle; compact?: boolean }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-500">
          <Car className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-navy-700">{vehicle.make} {vehicle.model}</h3>
          <p className="text-sm text-navy-400">{vehicle.year} · {vehicle.fuel_type}</p>
          <p className="mt-1 text-xs font-medium text-navy-500">REG: {vehicle.registration_number}</p>
          {vehicle.nickname && !compact && <p className="mt-0.5 text-xs text-navy-300">"{vehicle.nickname}"</p>}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const date = booking.preferred_date ? new Date(booking.preferred_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Immediate';
  return (
    <button onClick={onClick} className="card group flex w-full items-center gap-4 p-5 text-left hover:shadow-cardHover">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        <Wrench className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-navy-400">{booking.booking_ref}</span>
          <StatusBadge status={booking.status} />
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-navy-700">{booking.service?.name ?? 'Service'}</h3>
        <p className="mt-0.5 text-xs text-navy-400">
          {booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'No vehicle'} · {date} {booking.preferred_time_slot ? `· ${booking.preferred_time_slot}` : ''}
        </p>
        <p className="mt-1 text-xs text-navy-400"><MapPin className="inline h-3 w-3" /> {booking.area}, {booking.city}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-bold text-navy-700">{formatPKR(booking.estimated_price)}</span>
        <ArrowRight className="h-4 w-4 text-navy-300 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" />
      </div>
    </button>
  );
}

function ProfileEditor({ onSaved }: { onSaved: () => Promise<void> }) {
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', user!.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    await onSaved();
  };

  return (
    <>
      <PageHeader title="Profile Settings" subtitle="Update your personal information." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-100 text-2xl font-bold text-navy-600">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-navy-700">{profile?.full_name}</h3>
            <p className="text-sm text-navy-400">Customer</p>
            <div className="mt-4 w-full space-y-2 border-t border-gray-50 pt-4 text-sm text-navy-400">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-navy-300" /> {user?.email}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-navy-300" /> {profile?.phone || 'Not set'}</p>
            </div>
          </div>
        </div>
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-navy-700">Edit details</h3>
          {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {saved && <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Profile updated successfully.</div>}
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label className="label-text">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="03001234567" />
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
