import { AsyncLocalStorage } from 'node:async_hooks';
import { demoQloo } from './demo-graph.js';

// Minimal, dependency-free Qloo client (Node 18+ global fetch).
// Hackathon keys only work against https://hackathon.api.qloo.com and use the X-Api-Key header.

const BASE = (process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.QLOO_TIMEOUT_MS || 15000);

export const DOMAINS = {
  'urn:entity:artist': { key: 'artist', label: 'Music', noun: 'artist' },
  'urn:entity:movie': { key: 'movie', label: 'Film', noun: 'film' },
  'urn:entity:tv_show': { key: 'tv_show', label: 'TV', noun: 'show' },
  'urn:entity:book': { key: 'book', label: 'Books', noun: 'book' },
  'urn:entity:videogame': { key: 'videogame', label: 'Games', noun: 'game' },
  'urn:entity:podcast': { key: 'podcast', label: 'Podcasts', noun: 'podcast' },
  'urn:entity:person': { key: 'person', label: 'People', noun: 'person' },
  'urn:entity:brand': { key: 'brand', label: 'Brands', noun: 'brand' },
  'urn:entity:place': { key: 'place', label: 'Places', noun: 'place' },
  'urn:entity:destination': { key: 'destination', label: 'Travel', noun: 'destination' },
};

// The cultural "rails" the pathfinder is allowed to travel on.
export const PATH_TYPES = [
  'urn:entity:artist',
  'urn:entity:movie',
  'urn:entity:tv_show',
  'urn:entity:book',
  'urn:entity:videogame',
];

export const SEARCH_TYPES = [...PATH_TYPES, 'urn:entity:podcast', 'urn:entity:brand', 'urn:entity:person'];

const cache = new Map(); // tiny per-instance cache
const CACHE_MAX = 300;
const CACHE_TTL = 10 * 60 * 1000;

export class QlooError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Per-request context: a visitor (e.g. a judge) may supply their own Qloo key, which is used for
// that request only and never stored. With no key anywhere, the app runs on the demo graph.
const ctx = new AsyncLocalStorage();

export function withRequestKey(key, fn) {
  const clean = typeof key === 'string' && /^[\w.\-]{8,200}$/.test(key.trim()) ? key.trim() : null;
  return ctx.run({ key: clean }, fn);
}

function activeKey() {
  return ctx.getStore()?.key || process.env.QLOO_API_KEY || null;
}

export function hasKey() {
  return Boolean(activeKey());
}

export function mode() {
  return activeKey() ? 'live' : 'demo';
}

export async function qlooGet(path, params = {}, trace) {
  const key = activeKey();
  if (!key) {
    const t0 = Date.now();
    const json = demoQloo(path, params);
    trace?.push({ tool: path, params, status: 200, ms: Date.now() - t0, demo: true });
    return json;
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const url = `${BASE}${path}?${qs.toString()}`;
  const cacheKey = key.slice(-6) + url;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.t < CACHE_TTL) {
    trace?.push({ tool: path, params, cached: true, ms: 0 });
    return hit.v;
  }
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { headers: { 'X-Api-Key': key, accept: 'application/json' }, signal: ctrl.signal });
  } catch (e) {
    throw new QlooError(`Qloo request failed: ${e.name === 'AbortError' ? 'timeout' : e.message}`, 504);
  } finally {
    clearTimeout(timer);
  }
  const ms = Date.now() - t0;
  if (!res.ok) {
    trace?.push({ tool: path, params, status: res.status, ms });
    throw new QlooError(`Qloo ${path} returned HTTP ${res.status}`, res.status);
  }
  const json = await res.json();
  trace?.push({ tool: path, params, status: res.status, ms });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, { t: Date.now(), v: json });
  return json;
}

// ---- normalisation -------------------------------------------------------

function pickArray(json) {
  if (!json) return [];
  if (Array.isArray(json.results)) return json.results;
  if (json.results && Array.isArray(json.results.entities)) return json.results.entities;
  if (json.results && Array.isArray(json.results.tags)) return json.results.tags;
  if (Array.isArray(json.entities)) return json.entities;
  return [];
}

export function typeOf(e) {
  if (!e) return null;
  if (typeof e.type === 'string' && e.type.startsWith('urn:entity')) return e.type;
  if (Array.isArray(e.types)) {
    const t = e.types.find((x) => DOMAINS[x]) || e.types.find((x) => String(x).startsWith('urn:entity'));
    if (t) return t;
  }
  if (typeof e.subtype === 'string' && DOMAINS[e.subtype]) return e.subtype;
  return null;
}

function imageOf(p = {}) {
  const img = p.image;
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.url || null;
}

function yearOf(p = {}) {
  const y = p.release_year || p.publication_year || (p.release_date ? String(p.release_date).slice(0, 4) : null);
  return y ? Number(y) || null : null;
}

export function normEntity(e) {
  const p = e.properties || {};
  const tags = (e.tags || [])
    .map((t) => ({ id: t.id || t.tag_id, name: t.name, type: t.type || t.subtype || '' }))
    .filter((t) => t.name);
  const type = typeOf(e);
  return {
    id: e.entity_id || e.id || e.tag_id,
    name: e.name,
    type,
    domain: DOMAINS[type]?.label || 'Culture',
    image: imageOf(p),
    year: yearOf(p),
    description: (p.short_description || p.description || '').slice(0, 280) || null,
    popularity: typeof e.popularity === 'number' ? e.popularity : null,
    affinity: typeof e.query?.affinity === 'number' ? e.query.affinity : null,
    tags,
  };
}

// ---- endpoints -----------------------------------------------------------

export async function search(query, { types = SEARCH_TYPES, take = 6 } = {}, trace) {
  let json;
  try {
    json = await qlooGet('/search', { query, types, take }, trace);
  } catch (e) {
    // Some deployments reject the multi-type filter; retry without it.
    if (e.status === 400 || e.status === 422) json = await qlooGet('/search', { query, take }, trace);
    else throw e;
  }
  return pickArray(json).map(normEntity).filter((e) => e.id && e.name);
}

export async function insights({ type, entityIds = [], tagIds = [], take = 30, location, extra = {} }, trace) {
  const params = { 'filter.type': type, take, ...extra };
  if (entityIds.length) params['signal.interests.entities'] = entityIds;
  if (tagIds.length) params['signal.interests.tags'] = tagIds;
  if (location) params['filter.location.query'] = location;
  const json = await qlooGet('/v2/insights', params, trace);
  return pickArray(json).map(normEntity).filter((e) => e.id && e.name);
}
