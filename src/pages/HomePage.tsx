import { useEffect, useState } from 'react';
import {
  MapPin, ChevronDown, ArrowRight, ShieldCheck, BadgeCheck, Home, Sparkles, Search,
  Star, Clock, Users, ThumbsUp,
} from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Footer } from '@/components/Footer';
import { ServiceIcon } from '@/components/ServiceIcon';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { PAKISTAN_CITIES, formatPKR } from '@/lib/constants';
import type { Service } from '@/types';

const HERO_IMAGE = 'https://images.pexels.com/photos/4116221/pexels-photo-4116221.jpeg?auto=compress&cs=tinysrgb&w=1600';
const MECHANIC_IMAGE = 'https://images.pexels.com/photos/4489776/pexels-photo-4489776.jpeg?auto=compress&cs=tinysrgb&w=1200';

const HOW_IT_WORKS = [
  { icon: Sparkles, title: 'Tell AI what is wrong', desc: 'Type or speak in Urdu or English — get the likely cause and rough cost.' },
  { icon: Search, title: 'Compare mechanics', desc: 'See verified mechanics near you with real ratings, reviews and experience.' },
  { icon: Star, title: 'Choose the one you trust', desc: 'Pick by rating, area or service — your choice, not ours.' },
  { icon: MapPin, title: 'Book location and time', desc: 'Home, office or roadside — pick a slot that suits you.' },
  { icon: ThumbsUp, title: 'Get fixed, then rate', desc: 'Your rating helps the next car owner choose well.' },
];

const WHY_CHOOSE = [
  { icon: ShieldCheck, title: 'Verified Mechanics', desc: 'Every mechanic is identity-checked and skill-reviewed before joining.' },
  { icon: Sparkles, title: 'AI Problem Helper', desc: 'Describe the problem in Urdu or English and know what you need before you book.' },
  { icon: BadgeCheck, title: 'Transparent Estimated Prices', desc: 'See starting prices upfront with no hidden surprises.' },
  { icon: Home, title: 'Home & Office Service', desc: 'We come to you — no workshop visit required.' },
  { icon: Star, title: 'Customer Reviews', desc: 'Real ratings from real customers after every job.' },
  { icon: Clock, title: 'Immediate Assistance', desc: 'Stuck on the road? Request emergency help right away.' },
];

export function HomePage() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [city, setCity] = useState<string>(PAKISTAN_CITIES[0]);
  const [cityOpen, setCityOpen] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('starting_price', { ascending: true })
      .then(({ data }) => {
        if (data) setServices(data as Service[]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-700">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Mechanic repairing a car engine" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-800/90 to-navy-700/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-4 py-1.5 text-sm font-medium text-orange-300 ring-1 ring-orange-500/30">
              <MapPin className="h-4 w-4" /> Now serving major cities across Pakistan
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Car Broke Down? Find a Top-Rated Mechanic Near You.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-navy-100">
              Compare verified mechanics by rating and area, ask our AI what's wrong, and book the one you trust — at home, office or roadside.
            </p>

            {/* Location selector */}
            <div className="relative mt-7 inline-block">
              <label className="mb-1.5 block text-sm font-medium text-navy-200">Your city</label>
              <button
                onClick={() => setCityOpen((v) => !v)}
                className="flex w-64 items-center justify-between rounded-xl border border-navy-500 bg-navy-600/60 px-4 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:border-orange-400"
              >
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-400" /> {city}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              </button>
              {cityOpen && (
                <div className="absolute z-10 mt-2 max-h-64 w-64 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  {PAKISTAN_CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCity(c); setCityOpen(false); }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${c === city ? 'font-semibold text-orange-600' : 'text-navy-700'}`}
                    >
                      <MapPin className="h-4 w-4 text-navy-300" /> {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate(`/mechanics?city=${encodeURIComponent(city)}`)} className="btn-primary text-base px-6 py-3.5">
                <Search className="h-5 w-5" /> Find Mechanics in {city}
              </button>
              <button onClick={() => navigate('/mechanic/register')} className="btn-outline bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40 px-6 py-3.5 text-base">
                Become a Mechanic
              </button>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); navigate('/help'); try { sessionStorage.setItem('gf-problem', problem); } catch { /* ignore */ } }}
              className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-lg"
            >
              <Sparkles className="ml-2 h-5 w-5 shrink-0 text-orange-500" />
              <input
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Ask AI: gaari start nahi ho rahi…"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-navy-700 outline-none placeholder:text-navy-300"
              />
              <button type="submit" className="btn-secondary px-4 py-2.5">Ask AI</button>
            </form>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-navy-200">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-400" /> Verified professionals</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-400" /> On-time service</span>
              <span className="flex items-center gap-2"><Star className="h-4 w-4 text-orange-400" /> Real customer ratings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-orange-500">Our Services</span>
          <h2 className="mt-2 text-3xl font-bold text-navy-700 sm:text-4xl">Professional Care for Every Car Need</h2>
          <p className="mx-auto mt-3 max-w-2xl text-navy-400">From routine maintenance to emergency repairs, our mechanics handle it all — at your location.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card h-56 animate-pulse bg-gray-100" />
              ))
            : services.map((service) => (
                <div key={service.id} className="card group p-6 hover:shadow-cardHover">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                    <ServiceIcon name={service.icon_name} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-navy-700">{service.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-400 line-clamp-3">{service.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                    <div>
                      <span className="text-xs text-navy-300">Starting from</span>
                      <p className="text-sm font-bold text-navy-700">{formatPKR(service.starting_price)}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/mechanics?service=${service.slug}`)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy-500 transition-colors group-hover:bg-orange-500 group-hover:text-white"
                      aria-label={`Find mechanics for ${service.name}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-navy-50/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-orange-500">Simple Process</span>
            <h2 className="mt-2 text-3xl font-bold text-navy-700 sm:text-4xl">How GaariFix Works</h2>
            <p className="mx-auto mt-3 max-w-2xl text-navy-400">Get your car fixed in five simple steps.</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative card p-6">
                <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-sm">
                  {i + 1}
                </span>
                <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-navy-700">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-navy-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-orange-500">Why Choose Us</span>
          <h2 className="mt-2 text-3xl font-bold text-navy-700 sm:text-4xl">The GaariFix Advantage</h2>
          <p className="mx-auto mt-3 max-w-2xl text-navy-400">We make car repair trustworthy, transparent and convenient.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CHOOSE.map((item, i) => (
            <div key={i} className="card flex gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-navy-700">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Become a Mechanic CTA */}
      <section className="relative overflow-hidden bg-navy-700 py-20">
        <div className="absolute inset-0">
          <img src={MECHANIC_IMAGE} alt="Mechanics working in a garage" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 to-navy-700/60" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Are You a Professional Mechanic?</h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-100">
              Join GaariFix to receive more customers, grow your reputation and earn more — all while working on your own schedule.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-200">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-400" /> Get verified badge</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-orange-400" /> Reach more customers</li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-400" /> Flexible availability</li>
            </ul>
          </div>
          <button onClick={() => navigate('/mechanic/register')} className="btn-primary shrink-0 text-base px-7 py-4">
            Register as a Mechanic <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
