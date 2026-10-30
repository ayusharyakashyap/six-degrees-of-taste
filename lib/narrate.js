import { mode } from './qloo.js';
// Turns a Qloo-grounded path into human words.
// The LLM (if configured) is ONLY allowed to talk about entities already on the path and the Qloo
// tags/affinities attached to them. Without an LLM, deterministic templates do the job.

const pct = (x) => `${Math.round((x || 0) * 100)}%`;

export function templateStory(r) {
  const n = r.nodes;
  const A = r.a.label;
  const B = r.b.label;
  const src = mode() === 'demo' ? 'sample-graph' : 'Qloo';
  const hops = r.edges.map((e, i) => {
    const from = n[i];
    const to = n[i + 1];
    const why = e.shared.length
      ? `${from.name} and ${to.name} share ${src} taste tags — ${e.shared.join(', ')}.`
      : `Fans of ${from.name} over-index on ${to.name} in the ${src} taste graph.`;
    return { text: `${why} Link strength ${pct(e.strength)}.` };
  });
  const bridge = r.bridge;
  const first = n[1];
  const last = n[n.length - 2];
  return {
    headline: `${A} and ${B} are ${r.edges.length} degrees apart — and ${bridge.name} is where they meet.`,
    hops,
    starters: [
      `${A}, start here: ask ${B} what they'd think of ${first.name}.`,
      `${B}, ask ${A} why ${n[0].name} mattered to them — then bring up ${last.name}.`,
      `Both of you: experience ${bridge.name} together this week and compare notes.`,
    ],
    plan: r.places?.length
      ? `Make it real: ${r.places[0].name} in ${r.city} sits right on this path.`
      : `Make it real: put ${bridge.name} on the calendar for the two of you.`,
    by: 'template',
  };
}

function prompt(r) {
  const nodes = r.nodes.map((x, i) => ({
    step: i,
    name: x.name,
    domain: x.domain,
    year: x.year,
    role: x.role,
    tags: (x.tags || []).slice(0, 8).map((t) => t.name),
  }));
  const edges = r.edges.map((e, i) => ({ from: r.nodes[i].name, to: r.nodes[i + 1].name, strength: e.strength, shared_qloo_tags: e.shared }));
  return `You are the narrator for "Six Degrees of Taste", which connects two people through a path found in Qloo's cultural taste graph.

PERSON A: ${r.a.label} (loves ${r.a.seeds.map((s) => s.name).join(', ')})
PERSON B: ${r.b.label} (loves ${r.b.seeds.map((s) => s.name).join(', ')})
PATH NODES: ${JSON.stringify(nodes)}
PATH EDGES (Qloo affinity-based): ${JSON.stringify(edges)}
SHARED TASTE DNA (Qloo tags): ${JSON.stringify(r.dna)}
PLACES${r.city ? ' in ' + r.city : ''}: ${JSON.stringify((r.places || []).map((p) => p.name))}

Rules: Mention ONLY entities listed above. Do not invent facts, plots, songs or quotes. Ground each hop in its shared Qloo tags or affinity. Warm, witty, concise — this is read aloud on live TV.
Return STRICT JSON only:
{"headline": "<=22 words", "hops": [{"text": "<=28 words explaining why step i leads to step i+1"}] (exactly ${r.edges.length} items), "starters": ["3 conversation starters, <=20 words each, addressed to A or B by name"], "plan": "<=30 words: one concrete thing they do together, using the bridge or a listed place"}`;
}

async function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => (t = setTimeout(() => rej(new Error('LLM timeout')), ms)))]).finally(() => clearTimeout(t));
}

async function callAnthropic(text) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 900,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const j = await res.json();
  return j.content?.map((c) => c.text || '').join('') || '';
}

async function callOpenAICompatible(text) {
  const gemini = !process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY;
  const base = gemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const key = gemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  const model = gemini ? process.env.GEMINI_MODEL || 'gemini-2.5-flash' : process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: text }], temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

export function llmName() {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai-compatible';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}

export async function narrate(r) {
  const fallback = templateStory(r);
  const which = llmName();
  if (!which) return fallback;
  try {
    const raw = await withTimeout(which === 'claude' ? callAnthropic(prompt(r)) : callOpenAICompatible(prompt(r)), 14000);
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const hops = Array.isArray(json.hops) && json.hops.length === r.edges.length ? json.hops.map((h) => ({ text: String(h.text || h) })) : fallback.hops;
    return {
      headline: String(json.headline || fallback.headline),
      hops,
      starters: Array.isArray(json.starters) && json.starters.length ? json.starters.slice(0, 3).map(String) : fallback.starters,
      plan: String(json.plan || fallback.plan),
      by: which,
    };
  } catch (e) {
    return { ...fallback, by: 'template', llmError: e.message };
  }
}
