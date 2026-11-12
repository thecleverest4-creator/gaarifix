import { useEffect, useState } from 'react';
import {
  Car, Wrench, MapPin, Calendar, CheckCircle2, ArrowRight, ArrowLeft,
  Camera, Plus, Clock, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { VehicleForm } from '@/components/VehicleForm';
import { ServiceIcon } from '@/components/ServiceIcon';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { PAKISTAN_CITIES, TIME_SLOTS, formatPKR } from '@/lib/constants';
import type { Vehicle, Service, Booking } from '@/types';
import { PUBLIC_MECHANIC_COLS, type PublicMechanic } from '@/lib/mechanics';
import { BadgeCheck } from 'lucide-react';

const STEPS = ['Vehicle', 'Service', 'Problem', 'Location', 'Schedule', 'Review'];

export function BookingPage() {
  const { user, profile } = useAuth();
  const { navigate, query } = useRouter();
  const chosenMechanicUserId = query.get('mechanic');
  const serviceSlug = query.get('service');
  const [chosenMechanic, setChosenMechanic] = useState<PublicMechanic | null>(null);
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [problem, setProblem] = useState(query.get('problem') ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [city, setCity] = useState('Karachi');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [mapLocation, setMapLocation] = useState('');
  const [customerPhone, setCustomerPhone] = useState(profile?.phone ?? '');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [isImmediate, setIsImmediate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Booking | null>(null);

  useEffect(() => {
    (async () => {
      const [vRes, sRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('is_active', true).order('name'),
      ]);
      if (vRes.data) setVehicles(vRes.data as Vehicle[]);
      if (sRes.data) {
        setServices(sRes.data as Service[]);
        const pre = (sRes.data as Service[]).find((s) => s.slug === serviceSlug);
        if (pre) setSelectedServiceId(pre.id);
      }
      if (chosenMechanicUserId) {
        const { data: m } = await supabase.from('mechanics').select(PUBLIC_MECHANIC_COLS).eq('user_id', chosenMechanicUserId).maybeSingle();
        const mech = m as PublicMechanic | null;
        if (mech && mech.verification_status === 'approved' && !mech.is_suspended) {
          setChosenMechanic(mech);
          setCity(mech.city);
        }
      }
      setLoading(false);
    })();
  }, [user, chosenMechanicUserId, serviceSlug]);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!selectedVehicleId;
      case 1: return !!selectedServiceId;
      case 2: return problem.trim().length >= 10;
      case 3: return !!city && area.trim().length > 0 && address.trim().length > 0 && customerPhone.trim().length > 0;
      case 4: return isImmediate || (!!preferredDate && !!timeSlot);
      default: return true;
    }
  };

  const next = () => { if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    let photoUrl: string | null = null;

    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('booking-photos').upload(path, photoFile);
      if (!upErr) {
        const { data } = await supabase.storage.from('booking-photos').createSignedUrl(path, 60 * 60 * 24 * 7);
        photoUrl = data?.signedUrl ?? null;
      }
    }

    const payload = {
      customer_id: user!.id,
      // When the customer picked a specific mechanic, the request goes only to them.
      mechanic_id: chosenMechanic?.user_id ?? null,
      service_id: selectedServiceId,
      vehicle_id: selectedVehicleId || null,
      problem_description: problem.trim(),
      photo_url: photoUrl,
      city,
      area: area.trim(),
      address: address.trim(),
      map_location: mapLocation.trim() || null,
      customer_phone: customerPhone.trim(),
      preferred_date: isImmediate ? null : preferredDate,
      preferred_time_slot: isImmediate ? null : timeSlot,
      is_immediate: isImmediate,
    };

    const { data, error: insErr } = await supabase.from('bookings').insert(payload).select().single();
    setSubmitting(false);
    if (insErr) { setError(insErr.message); return; }
    setConfirmation(data as Booking);
  };

  if (confirmation) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div></header>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="card max-w-lg p-8 text-center animate-slide-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-navy-700">Booking Confirmed!</h1>
            <p className="mt-2 text-sm text-navy-400">
              {chosenMechanic
                ? `Your request has been sent to ${chosenMechanic.workshop_name || chosenMechanic.full_name}. They will confirm shortly.`
                : 'Your service request has been submitted. A verified mechanic will accept it shortly.'}
            </p>
            <div className="mt-6 rounded-xl bg-navy-50 px-6 py-4">
              <p className="text-xs uppercase tracking-wider text-navy-300">Booking ID</p>
              <p className="mt-1 font-mono text-lg font-bold text-navy-700">{confirmation.booking_ref}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate(`/bookings/${confirmation.id}`)} className="btn-primary flex-1">View booking details</button>
              <button onClick={() => navigate('/dashboard')} className="btn-outline flex-1">Go to dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div></header>
        <div className="flex flex-1 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Logo />
          <button onClick={() => navigate('/dashboard')} className="ml-auto btn-ghost">Cancel</button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {chosenMechanic && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
            <BadgeCheck className="h-6 w-6 shrink-0 text-orange-500" />
            <p className="flex-1 text-sm text-navy-700">
              Booking with <b>{chosenMechanic.workshop_name || chosenMechanic.full_name}</b> · ★ {Number(chosenMechanic.rating_avg).toFixed(1)} · {chosenMechanic.city}
            </p>
            <button onClick={() => { setChosenMechanic(null); navigate('/book'); }} className="text-xs font-semibold text-navy-500 underline">
              Any mechanic instead
            </button>
          </div>
        )}
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-orange-500 text-white' : 'bg-gray-200 text-navy-300'
                }`}>
                  {i < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`mt-1.5 hidden text-xs sm:block ${i === step ? 'font-semibold text-navy-700' : 'text-navy-300'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {/* Step 0: Vehicle */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-navy-700">Select your vehicle</h2>
              <p className="mt-1 text-sm text-navy-400">Choose the car that needs servicing.</p>
              {vehicles.length === 0 ? (
                <div className="mt-6">
                  <p className="mb-4 text-sm text-navy-400">You haven't added a vehicle yet. Add one to continue.</p>
                  {showAddVehicle ? <VehicleForm onSaved={(v) => { setVehicles((p) => [v, ...p]); setSelectedVehicleId(v.id); setShowAddVehicle(false); }} onCancel={() => setShowAddVehicle(false)} /> : (
                    <button onClick={() => setShowAddVehicle(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add a vehicle</button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {vehicles.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${selectedVehicleId === v.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${selectedVehicleId === v.id ? 'bg-orange-500 text-white' : 'bg-navy-50 text-navy-500'}`}><Car className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy-700">{v.make} {v.model}</p>
                          <p className="text-xs text-navy-400">{v.year} · {v.fuel_type} · {v.registration_number}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {showAddVehicle ? (
                    <div className="mt-4"><VehicleForm onSaved={(v) => { setVehicles((p) => [v, ...p]); setSelectedVehicleId(v.id); setShowAddVehicle(false); }} onCancel={() => setShowAddVehicle(false)} /></div>
                  ) : (
                    <button onClick={() => setShowAddVehicle(true)} className="mt-4 btn-outline"><Plus className="h-4 w-4" /> Add another vehicle</button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 1: Service */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-navy-700">Select a service</h2>
              <p className="mt-1 text-sm text-navy-400">What does your car need?</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <button key={s.id} onClick={() => setSelectedServiceId(s.id)} className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${selectedServiceId === s.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selectedServiceId === s.id ? 'bg-orange-500 text-white' : 'bg-navy-50 text-navy-500'}`}><ServiceIcon name={s.icon_name} className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-700">{s.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-navy-400 line-clamp-2">{s.description}</p>
                      <p className="mt-1.5 text-xs font-bold text-navy-600">From {formatPKR(s.starting_price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Problem */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-navy-700">Describe the problem</h2>
              <p className="mt-1 text-sm text-navy-400">Help your mechanic come prepared.</p>
              <div className="mt-5">
                <label className="label-text">What's going on with your car? <span className="text-navy-300">(min. 10 characters)</span></label>
                <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={5} className="input-field resize-none" placeholder="e.g. The engine makes a rattling noise when I start it in the morning, and the check engine light is on…" />
                <p className="mt-1 text-xs text-navy-300">{problem.trim().length} characters</p>
              </div>
              <div className="mt-5">
                <label className="label-text">Photo (optional)</label>
                {photoFile ? (
                  <div className="flex items-center gap-3 rounded-xl bg-navy-50 px-4 py-3">
                    <Camera className="h-5 w-5 text-orange-500" />
                    <span className="flex-1 truncate text-sm text-navy-600">{photoFile.name}</span>
                    <button onClick={() => setPhotoFile(null)} className="text-navy-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-4 transition-colors hover:border-orange-400">
                    <Camera className="h-5 w-5 text-navy-400" />
                    <span className="text-sm text-navy-400">Click to upload a photo of the problem</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-navy-700">Where should the mechanic come?</h2>
              <p className="mt-1 text-sm text-navy-400">Enter your service location.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-text">City</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                    {PAKISTAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-text">Area</label>
                  <input value={area} onChange={(e) => setArea(e.target.value)} className="input-field" placeholder="e.g. Gulshan-e-Iqbal" />
                </div>
              </div>
              <div className="mt-4">
                <label className="label-text">Full address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="input-field resize-none" placeholder="House #, street, block, landmark…" />
              </div>
              <div className="mt-4">
                <label className="label-text">Map location (optional)</label>
                <input value={mapLocation} onChange={(e) => setMapLocation(e.target.value)} className="input-field" placeholder="Paste a Google Maps link" />
              </div>
              <div className="mt-4">
                <label className="label-text">Your phone number</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input-field" placeholder="03001234567" />
                <p className="mt-1 text-xs text-navy-300">The mechanic will contact you on this number.</p>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-navy-700">When do you need the service?</h2>
              <p className="mt-1 text-sm text-navy-400">Pick a date and time, or request immediate help.</p>
              <button onClick={() => setIsImmediate(!isImmediate)} className={`mt-5 flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${isImmediate ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isImmediate ? 'bg-orange-500 text-white' : 'bg-navy-50 text-navy-500'}`}><Clock className="h-5 w-5" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-700">Immediate assistance</p>
                  <p className="text-xs text-navy-400">Request a mechanic as soon as possible (subject to availability).</p>
                </div>
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isImmediate ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                  {isImmediate && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
              </button>
              <div className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${isImmediate ? 'pointer-events-none opacity-40' : ''}`}>
                <div>
                  <label className="label-text">Preferred date</label>
                  <input type="date" value={preferredDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setPreferredDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label-text">Time slot</label>
                  <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="input-field">
                    <option value="">Select a slot</option>
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-navy-700">Review and submit</h2>
              <p className="mt-1 text-sm text-navy-400">Please confirm your booking details.</p>
              {error && <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
              <div className="mt-5 space-y-4">
                <ReviewRow icon={<BadgeCheck className="h-5 w-5" />} label="Mechanic" value={chosenMechanic ? `${chosenMechanic.workshop_name || chosenMechanic.full_name} (${chosenMechanic.city})` : 'First available verified mechanic'} />
                <ReviewRow icon={<Car className="h-5 w-5" />} label="Vehicle" value={selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})` : '—'} />
                <ReviewRow icon={<Wrench className="h-5 w-5" />} label="Service" value={selectedService?.name ?? '—'} />
                <ReviewRow icon={<Wrench className="h-5 w-5" />} label="Estimated price" value={selectedService ? formatPKR(selectedService.starting_price) : '—'} />
                <ReviewRow icon={<Wrench className="h-5 w-5" />} label="Problem" value={problem} />
                {photoFile && <ReviewRow icon={<Camera className="h-5 w-5" />} label="Photo" value={photoFile.name} />}
                <ReviewRow icon={<MapPin className="h-5 w-5" />} label="Location" value={`${address}, ${area}, ${city}`} />
                <ReviewRow icon={<Wrench className="h-5 w-5" />} label="Phone" value={customerPhone} />
                <ReviewRow icon={<Calendar className="h-5 w-5" />} label="Schedule" value={isImmediate ? 'Immediate assistance' : `${preferredDate} · ${timeSlot}`} />
              </div>
              <div className="mt-6 rounded-xl bg-navy-50 px-5 py-4">
                <p className="text-xs text-navy-400">Note: This is an estimated price. The mechanic will provide a final quotation after inspection. No payment is charged through the platform — you pay the mechanic directly.</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-50 pt-6">
            <button onClick={back} disabled={step === 0} className="btn-outline disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} disabled={!canProceed()} className="btn-primary">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting ? <Spinner className="h-4 w-4" /> : <>Submit booking <CheckCircle2 className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-navy-300">{label}</p>
        <p className="text-sm text-navy-700">{value}</p>
      </div>
    </div>
  );
}
