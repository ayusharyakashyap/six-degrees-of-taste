// Stateless MCP server (Streamable HTTP, JSON responses) so ANY agent can use the taste pathfinder.
// Add to an MCP client as a remote server: https://<your-app>/api/mcp
import { runPath, resolveText } from '../lib/service.js';
import { insights } from '../lib/qloo.js';
import { send, readBody } from './_http.js';

export const config = { maxDuration: 60 };

const PROTOCOL = '2025-06-18';

const TOOLS = [
  {
    name: 'find_taste_path',
    description:
      "Find the cultural path between two people using Qloo's taste graph. Returns a multi-hop chain of real entities (music, film, TV, books, games) linking what person A loves to what person B loves, with Qloo affinity scores, shared taste tags, a bridge entity, conversation starters and optional places in a city. Use it to help people connect: families, couples, teams, teachers and students, brands and new audiences.",
    inputSchema: {
      type: 'object',
      properties: {
        person_a: { type: 'string', description: 'Name or label for person A' },
        loves_a: { type: 'array', items: { type: 'string' }, description: 'Things A loves (artists, films, shows, books, games). Prefix with "movie:", "book:" etc. to disambiguate.' },
        person_b: { type: 'string' },
        loves_b: { type: 'array', items: { type: 'string' } },
        city: { type: 'string', description: 'Optional city to suggest a place to go together' },
      },
      required: ['loves_a', 'loves_b'],
    },
  },
  {
    name: 'qloo_search',
    description: 'Resolve a name to Qloo entities (id, type, tags).',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'qloo_recommend',
    description: 'Taste-based recommendations of one entity type from seed Qloo entity ids.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_ids: { type: 'array', items: { type: 'string' } },
        type: { type: 'string', enum: ['artist', 'movie', 'tv_show', 'book', 'videogame', 'podcast', 'place', 'brand', 'destination'] },
        location: { type: 'string' },
        take: { type: 'number' },
      },
      required: ['entity_ids', 'type'],
    },
  },
];

async function callTool(name, args = {}) {
  if (name === 'find_taste_path') {
    const r = await runPath({
      a: { label: args.person_a || 'Person A', items: args.loves_a || [] },
      b: { label: args.person_b || 'Person B', items: args.loves_b || [] },
      city: args.city,
    });
    const slim = {
      headline: r.story.headline,
      path: r.nodes.map((n, i) => ({ step: i, name: n.name, domain: n.domain, role: n.role, why_next: r.story.hops[i]?.text || null, shared_tags_with_next: r.edges[i]?.shared || [] })),
      bridge: r.bridge.name,
      degrees: r.stats.degrees,
      path_strength: r.stats.pathScore,
      taste_overlap_pct: r.stats.overlapPct,
      shared_taste_dna: r.dna,
      conversation_starters: r.story.starters,
      plan: r.story.plan,
      places: r.places.map((p) => p.name),
      other_bridges: r.alternates.map((x) => x.name),
    };
    return JSON.stringify(slim, null, 2);
  }
  if (name === 'qloo_search') {
    const r = await resolveText(String(args.query || ''), null, 6);
    return JSON.stringify(r.map(({ id, name, type, year, tags }) => ({ id, name, type, year, tags: tags.slice(0, 8).map((t) => t.name) })), null, 2);
  }
  if (name === 'qloo_recommend') {
    const r = await insights({
      type: `urn:entity:${args.type}`,
      entityIds: (args.entity_ids || []).slice(0, 10),
      location: args.location,
      take: Math.min(Number(args.take) || 10, 30),
    });
    return JSON.stringify(r.map(({ id, name, year, affinity }) => ({ id, name, year, affinity })), null, 2);
  }
  throw Object.assign(new Error(`Unknown tool ${name}`), { code: -32602 });
}

async function handleMessage(msg) {
  const { id, method, params } = msg || {};
  if (id === undefined || id === null) return null; // notification
  try {
    if (method === 'initialize')
      return { jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'six-degrees-of-taste', version: '1.0.0' } } };
    if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    if (method === 'tools/call') {
      try {
        const text = await callTool(params?.name, params?.arguments);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } };
      } catch (e) {
        if (e.code) throw e;
        return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: e.message }] } };
      }
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  } catch (e) {
    return { jsonrpc: '2.0', id, error: { code: e.code || -32603, message: e.message } };
  }
}

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, mcp-session-id, mcp-protocol-version, accept');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET') return send(res, 200, { name: 'six-degrees-of-taste', transport: 'streamable-http (POST JSON-RPC)', tools: TOOLS.map((t) => t.name) });
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleMessage))).filter(Boolean);
    if (!out.length) { res.statusCode = 202; return res.end(); }
    return send(res, 200, out);
  }
  const out = await handleMessage(body);
  if (!out) { res.statusCode = 202; return res.end(); }
  send(res, 200, out);
}
