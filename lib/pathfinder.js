// The Six Degrees of Taste pathfinder.
//
// A meet-in-the-middle search over Qloo's taste graph:
//   1. Map each person's "taste neighbourhood" across every domain (music, film, TV, books, games).
//   2. Ask Qloo what BOTH tastes jointly point at, and pick the bridge entity that sits closest to
//      both neighbourhoods (maximising the weaker side, so nobody is left behind).
//   3. Map the bridge's own neighbourhood, then find the stepping stones that connect each person
//      to the bridge (entities that are high-affinity for the person AND for the bridge).
//   4. If a hop can't be found, the agent re-plans: it widens the search and adds domains.
// Every hop is explained only with data Qloo returned: affinity scores and shared Qloo tags.

import { insights, PATH_TYPES, DOMAINS, QlooError } from './qloo.js';

const EXTRA_TYPES = ['urn:entity:podcast'];

function scoreMap(list) {
  // id -> { e, s } where s is a 0..1 closeness score.
  const m = new Map();
  const n = list.length || 1;
  list.forEach((e, i) => {
    const rankScore = 1 - i / (n + 1);
    const s = typeof e.affinity === 'number' ? 0.65 * e.affinity + 0.35 * rankScore : rankScore;
    if (!m.has(e.id)) m.set(e.id, { e, s });
  });
  return m;
}

function merge(maps) {
  const out = new Map();
  for (const m of maps) for (const [k, v] of m) if (!out.has(k) || out.get(k).s < v.s) out.set(k, v);
  return out;
}

async function neighbourhood(ids, types, take, trace, label, steps) {
  const settled = await Promise.allSettled(types.map((type) => insights({ type, entityIds: ids, take }, trace)));
  const maps = [];
  let failures = 0;
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') maps.push(scoreMap(r.value));
    else {
      failures++;
      if (r.reason instanceof QlooError && r.reason.status === 401) throw r.reason;
      if (r.reason instanceof QlooError && r.reason.status === 403) throw r.reason;
    }
  });
  const merged = merge(maps);
  steps.push({
    kind: 'map',
    text: `Mapped ${label === '__joint' ? 'the combined' : label + "'s"} taste neighbourhood: ${merged.size} entities across ${types.length - failures} domains`,
  });
  return merged;
}

const lower = (s) => String(s || '').toLowerCase().trim();

export function sharedTags(x, y, limit = 4) {
  if (!x?.tags?.length || !y?.tags?.length) return [];
  const ys = new Map(y.tags.map((t) => [lower(t.name), t]));
  const out = [];
  const seen = new Set();
  for (const t of x.tags) {
    const k = lower(t.name);
    if (ys.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(t.name);
    }
    if (out.length >= limit) break;
  }
  return out;
}

function pickStepping(fromMap, toMap, exclude, avoidType) {
  let best = null;
  for (const [id, a] of fromMap) {
    if (exclude.has(id)) continue;
    const b = toMap.get(id);
    if (!b) continue;
    let s = Math.sqrt(a.s * b.s);
    if (avoidType && a.e.type === avoidType) s *= 0.85; // prefer cross-domain hops
    if (!best || s > best.s) best = { e: richer(a.e, b.e), s, sFrom: a.s, sTo: b.s };
  }
  return best;
}

function richer(a, b) {
  // keep the copy with more metadata
  const score = (e) => (e.tags?.length || 0) + (e.image ? 3 : 0) + (e.description ? 2 : 0);
  return score(a) >= score(b) ? a : b;
}

function chooseEndpoint(seeds, neighbour) {
  if (!neighbour) return seeds[0];
  let best = seeds[0];
  let bestN = -1;
  for (const s of seeds) {
    const n = sharedTags(s, neighbour).length;
    if (n > bestN) {
      best = s;
      bestN = n;
    }
  }
  return best;
}

export async function findPath({ a, b, city }, trace = []) {
  const t0 = Date.now();
  const steps = [];
  const seedsA = a.seeds.filter((s) => s?.id);
  const seedsB = b.seeds.filter((s) => s?.id);
  if (!seedsA.length || !seedsB.length) throw new QlooError('Each person needs at least one thing they love.', 400);
  const idsA = seedsA.map((s) => s.id);
  const idsB = seedsB.map((s) => s.id);
  const seedIds = new Set([...idsA, ...idsB]);
  steps.push({
    kind: 'resolve',
    text: `Anchored ${a.label} to ${seedsA.map((s) => s.name).join(', ')} and ${b.label} to ${seedsB.map((s) => s.name).join(', ')} in the taste graph`,
  });

  let types = [...PATH_TYPES];
  let take = 40;

  // 1 + 2: both neighbourhoods and the joint signal, in parallel.
  const [NA, NB, JOINT] = await Promise.all([
    neighbourhood(idsA, types, take, trace, a.label, steps),
    neighbourhood(idsB, types, take, trace, b.label, steps),
    neighbourhood([...idsA, ...idsB], types, 30, trace, '__joint', steps),
  ]);

  // Taste overlap: how much of each neighbourhood already overlaps.
  let overlap = 0;
  for (const id of NA.keys()) if (NB.has(id)) overlap++;
  const overlapPct = Math.round((100 * overlap) / Math.max(1, Math.min(NA.size, NB.size)));

  const seedTypes = new Set([...seedsA, ...seedsB].map((s) => s.type));
  const floor = 0.04;
  const bridgeCandidates = [];
  for (const [id, j] of JOINT) {
    if (seedIds.has(id)) continue;
    const sa = NA.get(id)?.s ?? floor;
    const sb = NB.get(id)?.s ?? floor;
    // Maximise the weaker side: a bridge is only as good as its worst end.
    let s = 0.6 * Math.min(sa, sb) + 0.25 * Math.sqrt(sa * sb) + 0.15 * j.s;
    if (!seedTypes.has(j.e.type)) s += 0.03;
    bridgeCandidates.push({ e: j.e, s, sa, sb });
  }
  bridgeCandidates.sort((x, y) => y.s - x.s);
  if (!bridgeCandidates.length) throw new QlooError('Qloo returned no shared signal for these two tastes. Try more well-known favourites.', 422);
  const bridge = bridgeCandidates[0];
  steps.push({
    kind: 'bridge',
    text: `Scored ${bridgeCandidates.length} bridge candidates; best meeting point is ${bridge.e.name} (${DOMAINS[bridge.e.type]?.label || 'culture'})`,
  });

  // 3: the bridge's own neighbourhood.
  let NM = await neighbourhood([bridge.e.id], types, take, trace, bridge.e.name, steps);
  const exclude = new Set([...seedIds, bridge.e.id]);
  let x1 = pickStepping(NA, NM, exclude, bridge.e.type);
  if (x1) exclude.add(x1.e.id);
  let x2 = pickStepping(NB, NM, exclude, bridge.e.type);

  // 4: re-plan if a side is missing a stepping stone.
  if (!x1 || !x2) {
    steps.push({ kind: 'replan', text: 'No clean stepping stone on one side — widening the search and adding podcasts' });
    types = [...PATH_TYPES, ...EXTRA_TYPES];
    take = 80;
    const [NA2, NB2, NM2] = await Promise.all([
      x1 ? Promise.resolve(NA) : neighbourhood(idsA, types, take, trace, a.label, steps),
      x2 ? Promise.resolve(NB) : neighbourhood(idsB, types, take, trace, b.label, steps),
      neighbourhood([bridge.e.id], types, take, trace, bridge.e.name, steps),
    ]);
    NM = merge([NM, NM2]);
    if (!x1) {
      x1 = pickStepping(NA2, NM, exclude, bridge.e.type);
      if (x1) exclude.add(x1.e.id);
    }
    if (!x2) x2 = pickStepping(NB2, NM, exclude, bridge.e.type);
  }

  const startA = chooseEndpoint(seedsA, x1?.e || bridge.e);
  const endB = chooseEndpoint(seedsB, x2?.e || bridge.e);

  const nodes = [{ ...startA, role: 'start', owner: a.label }];
  const edges = [];
  const push = (node, strength, role) => {
    const prev = nodes[nodes.length - 1];
    edges.push({ from: prev.id, to: node.id, strength: round(strength), shared: sharedTags(prev, node) });
    nodes.push({ ...node, role });
  };
  if (x1) push(x1.e, x1.sFrom, 'step');
  push(bridge.e, x1 ? x1.sTo : bridge.sa, 'bridge');
  if (x2) push(x2.e, x2.sTo, 'step');
  push({ ...endB, owner: b.label }, x2 ? x2.sFrom : bridge.sb, 'end');
  nodes[nodes.length - 1].owner = b.label;

  const pathScore = round(Math.pow(edges.reduce((p, e) => p * Math.max(0.05, e.strength), 1), 1 / edges.length));
  steps.push({
    kind: 'path',
    text: `Built a ${edges.length}-degree path through ${new Set(nodes.map((n) => n.domain)).size} cultural domains`,
  });

  const alternates = bridgeCandidates
    .slice(1)
    .filter((c) => !nodes.some((n) => n.id === c.e.id))
    .slice(0, 5)
    .map((c) => ({ ...c.e, score: round(c.s) }));

  // Shared taste DNA (Qloo tag insights for the joint signal) + places to meet. Both best-effort.
  const extras = await Promise.allSettled([
    insights({ type: 'urn:tag', entityIds: [...idsA, ...idsB], take: 12 }, trace),
    city
      ? insights(
          { type: 'urn:entity:place', entityIds: nodes.filter((n) => n.role !== 'start' && n.role !== 'end').map((n) => n.id), take: 6, location: city },
          trace
        )
      : Promise.resolve([]),
  ]);
  const dna = extras[0].status === 'fulfilled' ? extras[0].value.map((t) => t.name).filter(Boolean).slice(0, 10) : [];
  const places = extras[1].status === 'fulfilled' ? extras[1].value.slice(0, 5) : [];
  if (city) steps.push({ kind: 'places', text: places.length ? `Found ${places.length} places in ${city} where this path comes alive` : `No place matches came back for ${city}` });

  return {
    a: { label: a.label, seeds: seedsA },
    b: { label: b.label, seeds: seedsB },
    city: city || null,
    nodes,
    edges,
    bridge: { ...bridge.e, score: round(bridge.s) },
    alternates,
    dna,
    places,
    stats: {
      degrees: edges.length,
      pathScore,
      overlapPct,
      candidatesScanned: NA.size + NB.size + JOINT.size + NM.size,
      qlooCalls: trace.length,
      ms: Date.now() - t0,
    },
    steps,
  };
}

function round(x) {
  return Math.round(x * 1000) / 1000;
}
