import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Wrench, ShieldCheck, UserCog, Settings,
  CheckCircle2, XCircle, Ban, Power, Search, Pencil, Trash2, Plus,
  Eye, AlertCircle, Star, MapPin, FileText, Car,
} from 'lucide-react';
import { DashboardShell, PageHeader, StatCard } from '@/components/DashboardShell';
import { StatusBadge, VerificationBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { ServiceIcon } from '@/components/ServiceIcon';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { formatPKR } from '@/lib/constants';
import type { Mechanic, Booking, Service, Profile } from '@/types';

type Tab = 'overview' | 'mechanics' | 'bookings' | 'customers' | 'services';

export function AdminDashboard() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [mRes, cRes, bRes, sRes] = await Promise.all([
      supabase.from('mechanics').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, service:services(*), vehicle:vehicles(*), customer_profile:profiles!bookings_customer_id_fkey(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('name'),
    ]);
    if (mRes.data) setMechanics(mRes.data as Mechanic[]);
    if (cRes.data) setCustomers(cRes.data as Profile[]);
    if (bRes.data) setBookings(bRes.data as Booking[]);
    if (sRes.data) setServices(sRes.data as Service[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, []);

  const pendingMechanics = mechanics.filter((m) => m.verification_status === 'pending');
  const approvedMechanics = mechanics.filter((m) => m.verification_status === 'approved');
  const activeBookings = bookings.filter((b) => ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  const navItems = [
    { label: 'Overview', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Mechanics', path: '/admin/mechanics', icon: <Wrench className="h-5 w-5" /> },
    { label: 'Bookings', path: '/admin/bookings', icon: <Car className="h-5 w-5" /> },
    { label: 'Customers', path: '/admin/customers', icon: <Users className="h-5 w-5" /> },
    { label: 'Services', path: '/admin/services', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleVerify = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.rpc('admin_set_mechanic_verification', { p_mechanic_id: id, p_status: status });
    if (error) { alert(error.message); return; }
    loadData();
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    const { error } = await supabase.rpc('admin_toggle_mechanic_suspend', { p_mechanic_id: id, p_suspend: suspend });
    if (error) { alert(error.message); return; }
    loadData();
  };

  const handleBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc('admin_set_booking_status', { p_booking_id: id, p_status: status });
    if (error) { alert(error.message); return; }
    loadData();
  };

  return (
    <DashboardShell navItems={navItems} activePath={`/admin${tab !== 'overview' ? '/' + tab : ''}`} role="admin">
      {tab === 'overview' && (
        <>
          <PageHeader title="Admin Dashboard" subtitle="Platform overview and management." />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total customers" value={customers.length} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Total mechanics" value={mechanics.length} icon={<Wrench className="h-5 w-5" />} tone="blue" />
            <StatCard label="Pending verifications" value={pendingMechanics.length} icon={<ShieldCheck className="h-5 w-5" />} tone="amber" />
            <StatCard label="Total bookings" value={bookings.length} icon={<Car className="h-5 w-5" />} tone="orange" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Active bookings" value={activeBookings.length} icon={<Car className="h-5 w-5" />} tone="blue" />
            <StatCard label="Completed" value={completedBookings.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
            <StatCard label="Cancelled" value={cancelledBookings.length} icon={<XCircle className="h-5 w-5" />} tone="red" />
          </div>

          {pendingMechanics.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-700">Pending mechanic verifications</h2>
                <button onClick={() => setTab('mechanics')} className="text-sm font-medium text-orange-600 hover:underline">View all</button>
              </div>
              <div className="space-y-3">
                {pendingMechanics.slice(0, 3).map((m) => (
                  <div key={m.id} className="card flex items-center gap-4 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-600">{m.full_name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-700">{m.full_name}</p>
                      <p className="text-xs text-navy-400">{m.city} · {m.years_experience} years · {m.specializations.length} specializations</p>
                    </div>
                    <button onClick={() => setSelectedMechanic(m)} className="btn-outline px-3 py-2 text-xs"><Eye className="h-3.5 w-3.5" /> Review</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'mechanics' && (
        <>
          <PageHeader title="Mechanics" subtitle="Approve, reject and manage mechanic profiles." />
          {loading ? <Spinner /> : mechanics.length === 0 ? (
            <EmptyState icon={<Wrench className="h-7 w-7" />} title="No mechanics registered" description="Mechanic registrations will appear here." />
          ) : (
            <div className="space-y-3">
              {mechanics.map((m) => (
                <div key={m.id} className="card p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-100 text-base font-semibold text-navy-600">{m.full_name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-navy-700">{m.full_name}</p>
                        <VerificationBadge status={m.verification_status} />
                        {m.is_suspended && <span className="badge bg-red-100 text-red-700">Suspended</span>}
                      </div>
                      <p className="mt-1 text-xs text-navy-400">{m.city} · {m.years_experience} years exp · {m.total_jobs} jobs · {formatPKR(m.total_earnings)} earned</p>
                      <p className="mt-0.5 text-xs text-navy-400">Areas: {m.service_areas.join(', ') || '—'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setSelectedMechanic(m)} className="btn-outline px-3 py-2 text-xs"><Eye className="h-3.5 w-3.5" /> Details</button>
                      {m.verification_status === 'pending' && (
                        <>
                          <button onClick={() => handleVerify(m.id, 'approved')} className="btn-primary px-3 py-2 text-xs bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                          <button onClick={() => handleVerify(m.id, 'rejected')} className="btn-outline px-3 py-2 text-xs text-red-600 border-red-200 hover:bg-red-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                        </>
                      )}
                      {m.verification_status === 'approved' && (
                        m.is_suspended ? (
                          <button onClick={() => handleSuspend(m.id, false)} className="btn-outline px-3 py-2 text-xs text-green-600 border-green-200 hover:bg-green-50"><Power className="h-3.5 w-3.5" /> Unsuspend</button>
                        ) : (
                          <button onClick={() => handleSuspend(m.id, true)} className="btn-outline px-3 py-2 text-xs text-red-600 border-red-200 hover:bg-red-50"><Ban className="h-3.5 w-3.5" /> Suspend</button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <>
          <PageHeader title="All Bookings" subtitle="Monitor and manage all platform bookings." />
          {loading ? <Spinner /> : bookings.length === 0 ? (
            <EmptyState icon={<Car className="h-7 w-7" />} title="No bookings yet" description="Platform bookings will appear here." />
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const customerName = (b.customer_profile as unknown as { full_name: string } | null)?.full_name ?? 'Customer';
                return (
                  <div key={b.id} className="card p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-navy-400">{b.booking_ref}</span>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-navy-700">{b.service?.name}</p>
                        <p className="text-xs text-navy-400">{customerName} · {b.city} · {formatPKR(b.estimated_price)}</p>
                      </div>
                      <select
                        value={b.status}
                        onChange={(e) => handleBookingStatus(b.id, e.target.value)}
                        className="input-field w-auto text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="on_the_way">On the Way</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'customers' && (
        <>
          <PageHeader title="Customers" subtitle="View all registered customers." />
          {loading ? <Spinner /> : customers.length === 0 ? (
            <EmptyState icon={<Users className="h-7 w-7" />} title="No customers yet" description="Registered customers will appear here." />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-navy-300">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Phone</th>
                    <th className="px-6 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-navy-700">{c.full_name || '—'}</td>
                      <td className="px-6 py-3 text-navy-400">{c.phone || '—'}</td>
                      <td className="px-6 py-3 text-navy-400">{new Date(c.created_at).toLocaleDateString('en-PK')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'services' && <ServicesManager services={services} onChanged={loadData} />}

      {/* Mechanic detail modal */}
      {selectedMechanic && (
        <MechanicDetailModal mechanic={selectedMechanic} onClose={() => setSelectedMechanic(null)} onVerify={handleVerify} onSuspend={handleSuspend} />
      )}
    </DashboardShell>
  );
}

function ServicesManager({ services, onChanged }: { services: Service[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service? Existing bookings keep a reference.')) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    onChanged();
  };

  const handleToggleActive = async (s: Service) => {
    const { error } = await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) { alert(error.message); return; }
    onChanged();
  };

  return (
    <>
      <PageHeader title="Services" subtitle="Add, edit and manage the service catalog." action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Add Service</button>} />
      {showForm && <ServiceForm service={editing} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); onChanged(); }} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.is_active ? 'bg-navy-50 text-orange-500' : 'bg-gray-100 text-gray-400'}`}><ServiceIcon name={s.icon_name} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy-700">{s.name}</p>
                  {!s.is_active && <span className="badge bg-gray-100 text-gray-500">Disabled</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-navy-400">{s.description}</p>
                <p className="mt-1.5 text-sm font-bold text-navy-600">{formatPKR(s.starting_price)}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-gray-50 pt-3">
              <button onClick={() => { setEditing(s); setShowForm(true); }} className="btn-ghost text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
              <button onClick={() => handleToggleActive(s)} className="btn-ghost text-xs"><Power className="h-3.5 w-3.5" /> {s.is_active ? 'Disable' : 'Enable'}</button>
              <button onClick={() => handleDelete(s.id)} className="btn-ghost text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ServiceForm({ service, onCancel, onSaved }: { service: Service | null; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(service?.name ?? '');
  const [slug, setSlug] = useState(service?.slug ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [iconName, setIconName] = useState(service?.icon_name ?? 'Wrench');
  const [price, setPrice] = useState(service ? String(service.starting_price) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ICONS = ['Wrench', 'SearchCheck', 'Gauge', 'BatteryCharging', 'Droplets', 'Disc', 'Snowflake', 'CircleDot', 'Siren'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim(),
      icon_name: iconName,
      starting_price: parseInt(price, 10) || 0,
      is_active: true,
    };
    const result = service
      ? await supabase.from('services').update(payload).eq('id', service.id)
      : await supabase.from('services').insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved();
  };

  return (
    <div className="card mb-6 p-6">
      <h3 className="text-base font-semibold text-navy-700">{service ? 'Edit service' : 'Add a service'}</h3>
      {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label-text">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="label-text">Slug (unique)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="input-field" placeholder="auto-generated from name" disabled={!!service} />
          </div>
        </div>
        <div>
          <label className="label-text">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label-text">Icon</label>
            <select value={iconName} onChange={(e) => setIconName(e.target.value)} className="input-field">
              {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Starting price (PKR)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="input-field" />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner className="h-4 w-4" /> : 'Save'}</button>
          <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function MechanicDetailModal({ mechanic, onClose, onVerify, onSuspend }: {
  mechanic: Mechanic;
  onClose: () => void;
  onVerify: (id: string, status: 'approved' | 'rejected') => void;
  onSuspend: (id: string, suspend: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl animate-slide-up">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-navy-700">Mechanic details</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-navy-400 hover:bg-gray-100"><XCircle className="h-5 w-5" /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 text-xl font-bold text-navy-600">{mechanic.full_name.charAt(0).toUpperCase()}</div>
            <div>
              <h4 className="text-lg font-semibold text-navy-700">{mechanic.full_name}</h4>
              <div className="mt-1 flex gap-2">
                <VerificationBadge status={mechanic.verification_status} />
                {mechanic.is_suspended && <span className="badge bg-red-100 text-red-700">Suspended</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Field label="Phone" value={mechanic.phone} />
            <Field label="Email" value={mechanic.email ?? '—'} />
            <Field label="City" value={mechanic.city} />
            <Field label="Experience" value={`${mechanic.years_experience} years`} />
            <Field label="Workshop" value={mechanic.workshop_name ?? '—'} />
            <Field label="Total jobs" value={String(mechanic.total_jobs)} />
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Service areas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mechanic.service_areas.map((a) => <span key={a} className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-500">{a}</span>)}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Specializations</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mechanic.specializations.map((s) => <span key={s} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">{s.replace(/-/g, ' ')}</span>)}
            </div>
          </div>

          {mechanic.description && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Description</p>
              <p className="mt-1 text-sm text-navy-600">{mechanic.description}</p>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Documents</p>
            <div className="mt-2 flex gap-3">
              {mechanic.cnic_document_url && <a href={mechanic.cnic_document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-navy-50 px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-100"><FileText className="h-4 w-4" /> View CNIC</a>}
              {mechanic.profile_photo_url && <a href={mechanic.profile_photo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-navy-50 px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-100"><Eye className="h-4 w-4" /> View photo</a>}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-50 pt-4">
            {mechanic.verification_status === 'pending' && (
              <>
                <button onClick={() => { onVerify(mechanic.id, 'approved'); onClose(); }} className="btn-primary bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-4 w-4" /> Approve</button>
                <button onClick={() => { onVerify(mechanic.id, 'rejected'); onClose(); }} className="btn-outline text-red-600 border-red-200 hover:bg-red-50"><XCircle className="h-4 w-4" /> Reject</button>
              </>
            )}
            {mechanic.verification_status === 'approved' && (
              mechanic.is_suspended ? (
                <button onClick={() => { onSuspend(mechanic.id, false); onClose(); }} className="btn-outline text-green-600 border-green-200 hover:bg-green-50"><Power className="h-4 w-4" /> Unsuspend</button>
              ) : (
                <button onClick={() => { onSuspend(mechanic.id, true); onClose(); }} className="btn-outline text-red-600 border-red-200 hover:bg-red-50"><Ban className="h-4 w-4" /> Suspend</button>
              )
            )}
            <button onClick={onClose} className="btn-ghost ml-auto">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-navy-300">{label}</p>
      <p className="mt-0.5 text-sm text-navy-700">{value}</p>
    </div>
  );
}
