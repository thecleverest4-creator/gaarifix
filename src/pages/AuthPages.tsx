import { useState } from 'react';
import { Link as LinkIcon, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // The AuthContext onAuthStateChange will load the profile; route based on role after a brief tick
    setTimeout(() => navigate('/dashboard'), 200);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 animate-slide-up">
            <h1 className="text-2xl font-bold text-navy-700">Welcome back</h1>
            <p className="mt-1.5 text-sm text-navy-400">Log in to your MechanicMate account.</p>

            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label-text">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="label-text">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Spinner className="h-4 w-4" /> : <>Log in <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-400">
              <LinkIcon className="h-4 w-4 shrink-0 text-orange-500" />
              <span>Don't have an account? <button onClick={() => navigate('/signup')} className="font-semibold text-orange-600 hover:underline">Sign up</button></span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-navy-300">
            Are you a mechanic? <button onClick={() => navigate('/mechanic/register')} className="font-semibold text-navy-500 hover:underline">Register here</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signUp } = useAuth();
  const { navigate } = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/^(\+92|0)?3\d{2}[-\s]?\d{7}$/.test(phone.replace(/\s/g, ''))) {
      setError('Please enter a valid Pakistani phone number (e.g. 03001234567).');
      return;
    }
    setLoading(true);
    const { error } = await signUp({ email: email.trim(), password, fullName: fullName.trim(), phone: phone.trim() });
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate('/dashboard'), 600);
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="card max-w-md p-8 text-center animate-slide-up">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-navy-700">Account created!</h1>
            <p className="mt-2 text-sm text-navy-400">Welcome to MechanicMate. Redirecting you to your dashboard…</p>
            <Spinner className="mx-auto mt-4 h-5 w-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Logo /></div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 animate-slide-up">
            <h1 className="text-2xl font-bold text-navy-700">Create your account</h1>
            <p className="mt-1.5 text-sm text-navy-400">Book trusted mechanics in minutes.</p>

            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label-text">Full name</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="Ahmed Khan" />
              </div>
              <div>
                <label className="label-text">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-10" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="label-text">Phone number</label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="03001234567" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Password</label>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                </div>
                <div>
                  <label className="label-text">Confirm</label>
                  <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-field" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Spinner className="h-4 w-4" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-navy-400">
              Already have an account? <button onClick={() => navigate('/login')} className="font-semibold text-orange-600 hover:underline">Log in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
