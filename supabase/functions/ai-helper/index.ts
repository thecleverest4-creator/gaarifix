// GaariFix AI Problem Helper — Supabase Edge Function.
// Deploy:  supabase functions deploy ai-helper
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// The website still works without this (it falls back to a built-in guide).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERVICES = [
  'general-inspection',
  'engine-diagnostics',
  'battery-replacement',
  'oil-change',
  'brake-repair',
  'ac-repair',
  'tyre-replacement',
  'emergency-roadside',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { text, language } = await req.json();
    if (typeof text !== 'string' || text.trim().length < 3 || text.length > 1500) {
      return Response.json({ error: 'Please describe the problem.' }, { status: 400, headers: cors });
    }
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return Response.json({ error: 'AI not configured' }, { status: 503, headers: cors });

    const lang = language === 'ur' ? 'simple Urdu (Urdu script)' : 'simple English';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 500,
        system: `You help car owners in Pakistan understand a car problem before they book a mechanic.
The user may write in English, Roman Urdu or Urdu. Reply ONLY with JSON:
{"service": one of ${JSON.stringify(SERVICES)},
 "causes": [2-4 short possible causes],
 "costRange": "rough repair cost range in PKR",
 "urgency": "safe" | "careful" | "stop",
 "advice": "1-2 sentences of practical advice"}
Write causes, costRange and advice in ${lang}. This is guidance only; the mechanic confirms after checking.
Use "stop" for brakes, smoke/fire, overheating with steam, accidents or anything unsafe to drive.`,
        messages: [{ role: 'user', content: text.trim() }],
      }),
    });
    if (!res.ok) return Response.json({ error: 'AI error' }, { status: 502, headers: cors });
    const out = await res.json();
    const raw: string = out?.content?.[0]?.text ?? '';
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return Response.json(json, { headers: cors });
  } catch {
    return Response.json({ error: 'AI error' }, { status: 500, headers: cors });
  }
});
