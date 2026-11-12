import { supabase } from '@/lib/supabase';

export type Urgency = 'safe' | 'careful' | 'stop';

export interface Diagnosis {
  /** Service slug from the services table, used to find matching mechanics. */
  service: string;
  causes: string[];
  costRange: string;
  urgency: Urgency;
  advice: string;
  /** 'ai' when the online AI answered, 'guide' when the built-in guide was used. */
  source: 'ai' | 'guide';
}

const SLUGS = [
  'general-inspection',
  'engine-diagnostics',
  'battery-replacement',
  'oil-change',
  'brake-repair',
  'ac-repair',
  'tyre-replacement',
  'emergency-roadside',
] as const;

type Rule = { keys: RegExp; d: Omit<Diagnosis, 'source'> };

/**
 * Built-in guide (works offline, no API key). Understands English, Roman Urdu and Urdu keywords.
 * Used when the online AI is not set up or not reachable.
 */
const RULES: Rule[] = [
  {
    keys: /accident|towing|tow|crash|takkar|ٹکر|حادث|raste me band|raste mein band|road.?side|beech raste|بند ہو گئی/i,
    d: {
      service: 'emergency-roadside',
      causes: ['Breakdown on the road', 'Accident damage', 'Engine or electrical failure'],
      costRange: 'PKR 3,000 – 8,000 (towing extra)',
      urgency: 'stop',
      advice: 'Park safely, turn on hazard lights and request emergency roadside help. Do not try to drive further.',
    },
  },
  {
    keys: /battery|start nahi|start nhi|self nahi|self nhi|click|jump|بیٹری|اسٹارٹ نہیں|سٹارٹ نہیں|dead/i,
    d: {
      service: 'battery-replacement',
      causes: ['Weak or dead battery', 'Loose or corroded battery terminals', 'Faulty self-starter or alternator'],
      costRange: 'PKR 2,000 – 25,000 (new battery costs more)',
      urgency: 'careful',
      advice: 'If the car clicks but does not start, the battery is the most likely cause. A mechanic can test it on the spot.',
    },
  },
  {
    keys: /brake|break|breke|ruk(ti)? nahi|squeal|chee|بریک|رکتی نہیں/i,
    d: {
      service: 'brake-repair',
      causes: ['Worn brake pads', 'Low or leaking brake fluid', 'Warped brake discs'],
      costRange: 'PKR 4,000 – 15,000',
      urgency: 'stop',
      advice: 'Brake problems are a safety risk. Avoid driving until a mechanic checks them.',
    },
  },
  {
    keys: /\bac\b|a\.c|cooling nahi|thandi nahi|thanda nahi|garam hawa|اے سی|ٹھنڈی نہیں|ٹھنڈا نہیں/i,
    d: {
      service: 'ac-repair',
      causes: ['Low AC gas', 'Compressor or clutch fault', 'Blocked condenser or cabin filter'],
      costRange: 'PKR 3,500 – 20,000',
      urgency: 'safe',
      advice: 'Safe to drive. An AC mechanic will check gas pressure and the compressor.',
    },
  },
  {
    keys: /tyre|tire|puncture|panchar|pancher|flat|ٹائر|پنکچر/i,
    d: {
      service: 'tyre-replacement',
      causes: ['Puncture', 'Worn-out tyre', 'Damaged rim or valve'],
      costRange: 'PKR 500 – 20,000 (new tyre costs more)',
      urgency: 'careful',
      advice: 'Do not drive on a flat tyre — it can damage the rim. Use the spare or call a mechanic to your location.',
    },
  },
  {
    keys: /oil|engine oil|mobil|tel|تیل|آئل/i,
    d: {
      service: 'oil-change',
      causes: ['Engine oil due for change', 'Low oil level or leak', 'Oil filter blocked'],
      costRange: 'PKR 2,500 – 9,000',
      urgency: 'careful',
      advice: 'If the oil warning light is on, stop the engine and check the oil level before driving further.',
    },
  },
  {
    keys: /smoke|dhuan|dhuwan|overheat|garam|heat|temperature|check engine|engine light|awaz|awaaz|noise|knock|jhatk|pick ?up|mileage|average|دھواں|گرم|آواز|انجن/i,
    d: {
      service: 'engine-diagnostics',
      causes: ['Engine overheating (coolant or radiator)', 'Faulty sensor or spark plugs', 'Fuel or air supply problem'],
      costRange: 'PKR 3,000 – 30,000 depending on the fault',
      urgency: 'careful',
      advice: 'A computer scan finds the exact fault code. If there is smoke or overheating, stop and let the engine cool.',
    },
  },
];

const GENERAL: Omit<Diagnosis, 'source'> = {
  service: 'general-inspection',
  causes: ['Needs a full check to find the exact cause'],
  costRange: 'PKR 2,000 – 5,000 for inspection',
  urgency: 'careful',
  advice: 'A general inspection covers the engine, brakes, suspension, fluids and tyres so the mechanic can find the problem.',
};

export function guideDiagnose(text: string): Diagnosis {
  const rule = RULES.find((r) => r.keys.test(text));
  return { ...(rule?.d ?? GENERAL), source: 'guide' };
}

/**
 * Tries the online AI first (Supabase Edge Function "ai-helper"); falls back to the built-in guide.
 */
export async function diagnose(text: string, language: 'en' | 'ur'): Promise<Diagnosis> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-helper', { body: { text, language } });
    if (!error && data && SLUGS.includes(data.service) && Array.isArray(data.causes)) {
      return {
        service: data.service,
        causes: data.causes.slice(0, 4).map(String),
        costRange: String(data.costRange ?? ''),
        urgency: (['safe', 'careful', 'stop'] as const).includes(data.urgency) ? data.urgency : 'careful',
        advice: String(data.advice ?? ''),
        source: 'ai',
      };
    }
  } catch {
    /* AI not set up or offline — use the guide below */
  }
  return guideDiagnose(text);
}
