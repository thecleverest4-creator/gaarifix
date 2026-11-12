import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Mic, ShieldAlert, Sparkles, Square, Wrench } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Footer } from '@/components/Footer';
import { MechanicCard } from '@/components/MechanicCard';
import { useRouter } from '@/context/RouterContext';
import { SPECIALIZATION_OPTIONS } from '@/lib/constants';
import { diagnose, type Diagnosis } from '@/lib/aiHelper';
import { fetchMechanics, rankMechanics, type PublicMechanic } from '@/lib/mechanics';

const EXAMPLES = [
  'Gaari start nahi ho rahi, sirf click ki awaaz aati hai',
  'AC thandi hawa nahi de raha',
  'Engine se dhuan nikal raha hai aur temperature barh gaya',
  'Brake lagate waqt awaaz aati hai',
  'Raste mein tyre puncture ho gaya',
];

const URGENCY = {
  safe: { label: 'Safe to drive', ur: 'چلانا محفوظ ہے', cls: 'bg-navy-700 text-white', Icon: CheckCircle2 },
  careful: { label: 'Drive slowly to a mechanic', ur: 'آہستہ چلا کر مکینک تک جائیں', cls: 'bg-orange-500 text-white', Icon: AlertTriangle },
  stop: { label: 'Do not drive — get help', ur: 'گاڑی نہ چلائیں — مدد منگوائیں', cls: 'bg-red-600 text-white', Icon: ShieldAlert },
} as const;

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

export function AiHelperPage() {
  const { navigate } = useRouter();
  const [text, setText] = useState('');
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [mechanics, setMechanics] = useState<PublicMechanic[]>([]);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

  useEffect(() => {
    fetchMechanics().then(setMechanics);
    try {
      const q = sessionStorage.getItem('gf-problem');
      sessionStorage.removeItem('gf-problem');
      if (q && q.trim().length >= 3) {
        setText(q);
        ask(q);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (q = text) => {
    if (q.trim().length < 3) return;
    setBusy(true);
    setResult(await diagnose(q.trim(), lang));
    setBusy(false);
    setTimeout(() => document.getElementById('ai-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const toggleMic = () => {
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = lang === 'ur' ? 'ur-PK' : 'en-PK';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ');
      setText((t) => (t ? `${t} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const label = (slug: string) => SPECIALIZATION_OPTIONS.find((s) => s.slug === slug)?.label ?? slug;
  const matches = result
    ? rankMechanics(mechanics.filter((m) => m.specializations.length === 0 || m.specializations.includes(result.service))).slice(0, 3)
    : [];
  const u = result ? URGENCY[result.urgency] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <section className="bg-navy-700">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-4 py-1.5 text-sm font-medium text-orange-300 ring-1 ring-orange-500/30">
            <Sparkles className="h-4 w-4" /> AI Problem Helper
          </span>
          <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">Tell us what's wrong with your car</h1>
          <p className="mt-3 text-navy-100">Type or speak in English, Roman Urdu or Urdu. We'll tell you the likely cause, rough cost, and which mechanic you need.</p>
          <p className="mt-2 font-urdu text-lg leading-loose text-orange-300" dir="rtl">اپنی گاڑی کا مسئلہ لکھیں یا بولیں</p>
        </div>
      </section>

      <div className="mx-auto -mt-6 max-w-3xl px-4 sm:px-6">
        <div className="card p-5 sm:p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1500}
            rows={4}
            placeholder="e.g. Gaari start nahi ho rahi, sirf click ki awaaz aati hai…"
            className="input-field resize-none text-base"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SR && (
              <button onClick={toggleMic} className={listening ? 'btn-secondary' : 'btn-outline'}>
                {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {listening ? 'Stop' : 'Speak'}
              </button>
            )}
            <div className="flex rounded-xl border border-gray-200 bg-white p-1 text-sm">
              {(['en', 'ur'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`rounded-lg px-3 py-1.5 font-medium ${lang === l ? 'bg-navy-700 text-white' : 'text-navy-500'}`}>
                  {l === 'en' ? 'English' : 'اردو'}
                </button>
              ))}
            </div>
            <button onClick={() => ask()} disabled={busy || text.trim().length < 3} className="btn-primary ml-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Check my problem
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setText(e);
                  ask(e);
                }}
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-orange-400"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {result && u && (
          <div id="ai-result" className="mt-6 space-y-6 animate-slide-up">
            <div className="card overflow-hidden">
              <div className={`flex items-center gap-2 px-5 py-3 font-semibold ${u.cls}`}>
                <u.Icon className="h-5 w-5" /> {u.label}
                <span className="ml-auto font-urdu text-sm" dir="rtl">{u.ur}</span>
              </div>
              <div className="space-y-4 p-5" dir={lang === 'ur' && result.source === 'ai' ? 'rtl' : undefined}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Service you need</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-bold text-navy-700"><Wrench className="h-5 w-5 text-orange-500" /> {label(result.service)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Possible causes</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-navy-600">
                    {result.causes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                {result.costRange && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Rough cost</p>
                    <p className="mt-1 font-semibold text-navy-700">{result.costRange}</p>
                  </div>
                )}
                {result.advice && <p className="rounded-xl bg-orange-50 p-3 text-sm text-navy-700">{result.advice}</p>}
                <p className="text-xs text-navy-300">
                  {result.source === 'ai' ? 'AI guidance' : 'GaariFix guide'} only — the mechanic will confirm after checking your car.
                </p>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xl font-bold text-navy-700">Top-rated mechanics for {label(result.service)}</h2>
                <button onClick={() => navigate(`/mechanics?service=${result.service}`)} className="text-sm font-semibold text-orange-600 underline">
                  See all →
                </button>
              </div>
              {matches.length ? (
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {matches.map((m) => (
                    <MechanicCard key={m.id} m={m} service={result.service} />
                  ))}
                </div>
              ) : (
                <div className="card mt-4 p-6 text-center">
                  <p className="text-navy-500">Post your request and the first available verified mechanic will accept it.</p>
                  <button
                    onClick={() => navigate(`/book?service=${result.service}&problem=${encodeURIComponent(text.trim().slice(0, 500))}`)}
                    className="btn-primary mt-4"
                  >
                    Request a mechanic
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="h-16" />
      <Footer />
    </div>
  );
}
