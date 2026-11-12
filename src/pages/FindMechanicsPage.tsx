import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Footer } from '@/components/Footer';
import { MechanicCard } from '@/components/MechanicCard';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { PAKISTAN_CITIES, SPECIALIZATION_OPTIONS } from '@/lib/constants';
import { fetchMechanics, rankMechanics, type PublicMechanic } from '@/lib/mechanics';

type Sort = 'best' | 'rating' | 'reviews' | 'experience';

export function FindMechanicsPage() {
  const { navigate, query } = useRouter();
  const { profile } = useAuth();
  const [all, setAll] = useState<PublicMechanic[] | null>(null);
  const [city, setCity] = useState(query.get('city') ?? '');
  const [service, setService] = useState(query.get('service') ?? '');
  const [text, setText] = useState(query.get('q') ?? '');
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('best');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchMechanics().then(setAll);
  }, [profile]);

  useEffect(() => {
    setService(query.get('service') ?? '');
    setCity(query.get('city') ?? '');
  }, [query]);

  const list = useMemo(() => {
    const t = text.trim().toLowerCase();
    let l = (all ?? [])
      .filter((m) => !city || m.city === city)
      .filter((m) => !service || m.specializations.length === 0 || m.specializations.includes(service))
      .filter((m) => Number(m.rating_avg) >= minRating)
      .filter((m) => !availableOnly || m.is_available)
      .filter(
        (m) =>
          !t ||
          [m.full_name, m.workshop_name ?? '', m.city, ...m.service_areas].some((v) => v.toLowerCase().includes(t)),
      );
    if (sort === 'best') l = rankMechanics(l);
    if (sort === 'rating') l.sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg));
    if (sort === 'reviews') l.sort((a, b) => b.rating_count - a.rating_count);
    if (sort === 'experience') l.sort((a, b) => b.years_experience - a.years_experience);
    return l;
  }, [all, city, service, text, minRating, availableOnly, sort]);

  const clear = () => {
    setCity('');
    setService('');
    setText('');
    setMinRating(0);
    setAvailableOnly(false);
  };

  const filters = (
    <div className="space-y-5">
      <div>
        <label className="label-text">City</label>
        <select className="input-field" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {PAKISTAN_CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-text">Service needed</label>
        <div className="flex flex-wrap gap-1.5">
          {SPECIALIZATION_OPTIONS.map((s) => (
            <button
              key={s.slug}
              onClick={() => setService(service === s.slug ? '' : s.slug)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                service === s.slug ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 bg-white text-navy-600 hover:border-orange-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label-text">Minimum rating</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold ${
                minRating === r ? 'border-orange-500 bg-orange-50 text-navy-700' : 'border-gray-200 bg-white text-navy-500'
              }`}
            >
              {r === 0 ? 'Any' : <>{r}+ <Star className="h-3 w-3 fill-orange-400 text-orange-400" /></>}
            </button>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-700">
        <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="h-4 w-4 accent-[#B8862B]" />
        Available now only
      </label>
      <button onClick={clear} className="btn-outline w-full">
        <X className="h-4 w-4" /> Clear filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <section className="bg-navy-700">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Find a trusted mechanic</h1>
          <p className="mt-2 text-navy-100">Compare verified mechanics by rating, area and service — then book the one you trust.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-300" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search by area, workshop or mechanic name (e.g. G-11, Saddar)"
                className="input-field py-3.5 pl-12"
              />
            </div>
            <button onClick={() => navigate('/help')} className="btn-primary px-6 py-3.5">
              <Sparkles className="h-5 w-5" /> Not sure what's wrong? Ask AI
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-500">
            {all === null ? 'Loading mechanics…' : `${list.length} mechanic${list.length === 1 ? '' : 's'} found`}
          </p>
          <div className="flex gap-2">
            <select className="input-field w-auto py-2.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="best">Best match</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviews</option>
              <option value="experience">Most experienced</option>
            </select>
            <button onClick={() => setShowFilters((v) => !v)} className="btn-outline py-2.5 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className={`${showFilters ? 'block' : 'hidden'} card h-fit p-5 lg:block`}>{filters}</aside>
          <div>
            {all === null ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card h-72 animate-pulse bg-gray-100" />
                ))}
              </div>
            ) : all.length === 0 && !profile ? (
              <div className="card p-10 text-center">
                <h2 className="text-lg font-semibold text-navy-700">Sign in to see mechanics near you</h2>
                <p className="mt-2 text-sm text-navy-400">Create a free account to browse ratings and book a verified mechanic.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button onClick={() => navigate('/login')} className="btn-outline">Login</button>
                  <button onClick={() => navigate('/signup')} className="btn-primary">Create free account</button>
                </div>
              </div>
            ) : list.length === 0 ? (
              <div className="card p-10 text-center">
                <h2 className="text-lg font-semibold text-navy-700">No mechanic matches these filters</h2>
                <p className="mt-2 text-sm text-navy-400">Try another city or service, or post your request and any available mechanic can accept it.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button onClick={clear} className="btn-outline">Clear filters</button>
                  <button onClick={() => navigate(`/book${service ? `?service=${service}` : ''}`)} className="btn-primary">
                    Request any mechanic
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((m) => (
                  <MechanicCard key={m.id} m={m} service={service || undefined} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
