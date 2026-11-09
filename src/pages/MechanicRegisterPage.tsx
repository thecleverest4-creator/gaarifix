import { useState } from 'react';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, User, MapPin,
  Wrench, Camera, FileText, Upload, ShieldCheck, Clock, X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { PAKISTAN_CITIES, SPECIALIZATION_OPTIONS } from '@/lib/constants';
import type { Mechanic } from '@/types';

const STEPS = ['Account', 'Location', 'Expertise', 'Documents'];

export function MechanicRegisterPage() {
  const { user, profile, signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);

  // account
  const [isExisting, setIsExisting] = useState(true);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  // location
  const [city, setCity] = useState('Karachi');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // expertise
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [workshopName, setWorkshopName] = useState('');
  const [description, setDescription] = useState('');

  // documents
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cnicFile, setCnicFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Mechanic | null>(null);

  const toggleArea = (area: string) => {
    setServiceAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);
  };
  const toggleSpec = (slug: string) => {
    setSpecializations((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  };

  const canProceed = (): boolean => {
    if (user) {
      // logged in — skip account step validation
      if (step === 0) return !!fullName.trim() && !!phone.trim();
    } else {
      if (step === 0) return !!fullName.trim() && !!email.trim() && !!phone.trim() && password.length >= 6;
    }
    if (step === 1) return !!city && serviceAreas.length > 0;
    if (step === 2) return !!yearsExperience && specializations.length > 0;
    if (step === 3) return !!cnicFile;
    return true;
  };

  const next = () => { if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleAccountStep = async (): Promise<boolean> => {
    if (user) {
      // update existing profile with name/phone
      await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', user.id);
      return true;
    }
    if (isExisting) {
      const { error } = await signIn(email.trim(), password);
      if (error) { setError(error); return false; }
      return true;
    } else {
      const { error } = await signUp({ email: email.trim(), password, fullName: fullName.trim(), phone: phone.trim() });
      if (error) { setError(error); return false; }
      return true;
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    // We need an authenticated user; if account step wasn't completed (e.g. fresh sign-up),
    // the auth state should now be set.
    let currentUserId = user?.id;
    if (!currentUserId) {
      const { data: sess } = await supabase.auth.getSession();
      currentUserId = sess.session?.user.id;
    }
    if (!currentUserId) {
      setError('Authentication required. Please complete the account step.');
      setLoading(false);
      return;
    }

    // set role to mechanic
    const { error: roleErr } = await supabase.from('profiles').update({ role: 'mechanic', full_name: fullName.trim(), phone: phone.trim() }).eq('id', currentUserId);
    if (roleErr) { setError(roleErr.message); setLoading(false); return; }

    // upload files
    let photoUrl: string | null = null;
    let cnicUrl: string | null = null;
    if (photoFile) {
      const path = `${currentUserId}/profile-${Date.now()}.${photoFile.name.split('.').pop()}`;
      const { error: e } = await supabase.storage.from('mechanic-documents').upload(path, photoFile);
      if (!e) { const { data } = await supabase.storage.from('mechanic-documents').createSignedUrl(path, 60 * 60 * 24 * 30); photoUrl = data?.signedUrl ?? null; }
    }
    if (cnicFile) {
      const path = `${currentUserId}/cnic-${Date.now()}.${cnicFile.name.split('.').pop()}`;
      const { error: e } = await supabase.storage.from('mechanic-documents').upload(path, cnicFile);
      if (!e) { const { data } = await supabase.storage.from('mechanic-documents').createSignedUrl(path, 60 * 60 * 24 * 30); cnicUrl = data?.signedUrl ?? null; }
    }

    const payload = {
      user_id: currentUserId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      city,
      service_areas: serviceAreas,
      years_experience: parseInt(yearsExperience, 10) || 0,
      specializations: specializations,
      workshop_name: workshopName.trim() || null,
      profile_photo_url: photoUrl,
      cnic_document_url: cnicUrl,
      description: description.trim() || null,
      verification_status: 'pending',
    };

    const { data, error: insErr } = await supabase.from('mechanics').insert(payload).select().single();
    setLoading(false);
    if (insErr) { setError(insErr.message); return; }
    setSuccess(data as Mechanic);
  };

  const handleNext = async () => {
    setError(null);
    if (step === 0 && !user) {
      setLoading(true);
      const ok = await handleAccountStep();
      setLoading(false);
      if (!ok) return;
    } else if (step === 0 && user) {
      setLoading(true);
      await handleAccountStep();
      setLoading(false);
    }
    next();
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div></header>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="card max-w-lg p-8 text-center animate-slide-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-navy-700">Registration submitted!</h1>
            <p className="mt-2 text-sm text-navy-400">Your mechanic profile is now under review. Our admin team will verify your documents and approve your account — usually within 1–2 business days.</p>
            <div className="mt-6 rounded-xl bg-amber-50 px-5 py-4 text-sm text-amber-700">Status: <span className="font-semibold">Pending Verification</span></div>
            <button onClick={() => navigate('/mechanic/dashboard')} className="mt-6 btn-primary w-full">Go to mechanic dashboard <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Logo />
          <button onClick={() => navigate('/')} className="ml-auto btn-ghost">Back to home</button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-navy-700">Become a Mechanic</h1>
          <p className="mt-1.5 text-sm text-navy-400">Join MechanicMate and start receiving customer bookings.</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-orange-500 text-white' : 'bg-gray-200 text-navy-300'}`}>
                  {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`mt-1.5 hidden text-xs sm:block ${i === step ? 'font-semibold text-navy-700' : 'text-navy-300'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {error && <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

          {/* Step 0: Account */}
          {step === 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-700"><User className="h-5 w-5 text-orange-500" /> Account details</h2>
              {user ? (
                <p className="mt-2 text-sm text-navy-400">You're signed in as {user.email}. Confirm your details below.</p>
              ) : (
                <div className="mt-4 flex gap-2 rounded-xl bg-navy-50 p-1">
                  <button onClick={() => setIsExisting(true)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${isExisting ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400'}`}>I have an account</button>
                  <button onClick={() => setIsExisting(false)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${!isExisting ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400'}`}>Create new account</button>
                </div>
              )}
              <div className="mt-5 space-y-4">
                <div>
                  <label className="label-text">Full name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="Ahmed Khan" />
                </div>
                <div>
                  <label className="label-text">Phone number</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="03001234567" />
                </div>
                {!user && (
                  <>
                    <div>
                      <label className="label-text">Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="label-text">Password {isExisting ? '' : '(min. 6 characters)'}</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-700"><MapPin className="h-5 w-5 text-orange-500" /> Service location</h2>
              <p className="mt-2 text-sm text-navy-400">Where can you serve customers?</p>
              <div className="mt-5">
                <label className="label-text">Your city</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                  {PAKISTAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="mt-4">
                <label className="label-text">Service areas <span className="text-navy-300">(select all that apply)</span></label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PAKISTAN_CITIES.map((c) => (
                    <button key={c} type="button" onClick={() => toggleArea(c)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${serviceAreas.includes(c) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-navy-500 hover:bg-gray-200'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Expertise */}
          {step === 2 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-700"><Wrench className="h-5 w-5 text-orange-500" /> Your expertise</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-text">Years of experience</label>
                  <input type="number" min="0" max="50" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className="input-field" placeholder="e.g. 8" />
                </div>
                <div>
                  <label className="label-text">Workshop name (optional)</label>
                  <input value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} className="input-field" placeholder="e.g. Khan Auto Works" />
                </div>
              </div>
              <div className="mt-4">
                <label className="label-text">Specializations <span className="text-navy-300">(select all that apply)</span></label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SPECIALIZATION_OPTIONS.map((s) => (
                    <button key={s.slug} type="button" onClick={() => toggleSpec(s.slug)} className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${specializations.includes(s.slug) ? 'border-orange-500 bg-orange-50 text-navy-700' : 'border-gray-100 text-navy-500 hover:border-gray-200'}`}>
                      <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${specializations.includes(s.slug) ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                        {specializations.includes(s.slug) && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="label-text">Short description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field resize-none" placeholder="Tell customers about your skills and experience…" />
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-700"><FileText className="h-5 w-5 text-orange-500" /> Verification documents</h2>
              <p className="mt-2 text-sm text-navy-400">Upload your CNIC and a profile photo for verification.</p>
              <div className="mt-5 space-y-4">
                <FileUpload label="CNIC document (required)" file={cnicFile} onFile={setCnicFile} icon={<FileText className="h-6 w-6" />} />
                <FileUpload label="Profile photograph (optional)" file={photoFile} onFile={setPhotoFile} icon={<Camera className="h-6 w-6" />} />
              </div>
              <div className="mt-5 rounded-xl bg-navy-50 px-5 py-4 text-sm text-navy-400">
                <ShieldCheck className="mb-1.5 h-5 w-5 text-orange-500" />
                Your documents are stored securely and only visible to our admin team for verification. They will never be shared with customers.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-50 pt-6">
            <button onClick={back} disabled={step === 0} className="btn-outline disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} disabled={!canProceed() || loading} className="btn-primary">
                {loading ? <Spinner className="h-4 w-4" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                {loading ? <Spinner className="h-4 w-4" /> : <>Submit for verification <CheckCircle2 className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, file, onFile, icon }: { label: string; file: File | null; onFile: (f: File | null) => void; icon: React.ReactNode }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      {file ? (
        <div className="flex items-center gap-3 rounded-xl bg-navy-50 px-4 py-3">
          {icon}
          <span className="flex-1 truncate text-sm text-navy-600">{file.name}</span>
          <button type="button" onClick={() => onFile(null)} className="text-navy-400 hover:text-red-500"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 transition-colors hover:border-orange-400">
          <Upload className="h-5 w-5 text-navy-400" />
          <span className="text-sm text-navy-400">Click to upload a file</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
