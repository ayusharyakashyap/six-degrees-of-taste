import { search, SEARCH_TYPES, QlooError, mode } from './qloo.js';
import { findPath } from './pathfinder.js';
import { narrate, llmName } from './narrate.js';

const HINTS = {
  music: 'urn:entity:artist', artist: 'urn:entity:artist', band: 'urn:entity:artist', singer: 'urn:entity:artist',
  movie: 'urn:entity:movie', film: 'urn:entity:movie',
  tv: 'urn:entity:tv_show', show: 'urn:entity:tv_show', series: 'urn:entity:tv_show',
  book: 'urn:entity:book', novel: 'urn:entity:book',
  game: 'urn:entity:videogame', videogame: 'urn:entity:videogame',
  podcast: 'urn:entity:podcast', brand: 'urn:entity:brand',
};

export function parseHint(raw) {
  const m = String(raw).match(/^\s*([a-z]+)\s*:\s*(.+)$/i);
  if (m && HINTS[m[1].toLowerCase()]) return { query: m[2].trim(), types: [HINTS[m[1].toLowerCase()]] };
  return { query: String(raw).trim(), types: SEARCH_TYPES };
}

export async function resolveText(raw, trace, take = 6) {
  const { query, types } = parseHint(raw);
  if (!query) return [];
  const results = await search(query, { types, take }, trace);
  const q = query.toLowerCase();
  // exact title match first, then Qloo's own order
  return results.sort((x, y) => (y.name.toLowerCase() === q) - (x.name.toLowerCase() === q));
}

async function resolveSide(side, trace) {
  const label = String(side?.label || '').trim().slice(0, 40) || 'Someone';
  const items = (side?.items || []).slice(0, 5);
  const seeds = await Promise.all(
    items.map(async (it) => {
      if (it && typeof it === 'object' && it.id) return { ...it, tags: it.tags || [] };
      const text = typeof it === 'string' ? it : it?.name;
      if (!text) return null;
      const r = await resolveText(text, trace, 3);
      return r[0] || null;
    })
  );
  return { label, seeds: seeds.filter(Boolean) };
}

export async function runPath(body) {
  const trace = [];
  const [a, b] = await Promise.all([resolveSide(body.a, trace), resolveSide(body.b, trace)]);
  const hint = mode() === 'demo' ? ' (Demo mode has a small sample graph — pick from the dropdown suggestions, or add a Qloo key for the full graph.)' : ' Try different favourites.';
  if (!a.seeds.length) throw new QlooError(`Couldn't find anything ${a.label} loves in the graph.${hint}`, 422);
  if (!b.seeds.length) throw new QlooError(`Couldn't find anything ${b.label} loves in the graph.${hint}`, 422);
  const city = String(body.city || '').trim().slice(0, 60) || null;
  const result = await findPath({ a, b, city }, trace);
  const story = await narrate(result);
  result.story = story;
  result.trace = trace.map((t) => ({ tool: t.tool, type: t.params?.['filter.type'] || null, cached: !!t.cached, ms: t.ms, status: t.status }));
  result.stats.qlooCalls = trace.length;
  result.mode = mode();
  return result;
}

export function status() {
  return { ok: true, mode: mode(), serverKey: Boolean(process.env.QLOO_API_KEY), llm: llmName() || 'template' };
}
