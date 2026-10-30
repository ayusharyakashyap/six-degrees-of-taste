// A tiny fake Qloo API for local testing ONLY (no network, no real Qloo data).
// Entities get synthetic tags; insights rank by tag overlap with the signal entities.
import http from 'node:http';

const T = {
  artist: 'urn:entity:artist', movie: 'urn:entity:movie', tv: 'urn:entity:tv_show',
  book: 'urn:entity:book', game: 'urn:entity:videogame', podcast: 'urn:entity:podcast', place: 'urn:entity:place',
};
const raw = [
  [T.artist, 'Frank Sinatra', 'crooner,jazz,nostalgia,new york,romance'],
  [T.artist, 'Travis Scott', 'hip hop,psychedelic,hype,houston,spectacle'],
  [T.artist, 'Kendrick Lamar', 'hip hop,storytelling,jazz,los angeles,poetry'],
  [T.artist, 'Amy Winehouse', 'jazz,soul,nostalgia,heartbreak,london'],
  [T.artist, 'Daft Punk', 'electronic,retro-futurism,spectacle,french,robots'],
  [T.movie, 'Casablanca', 'classic,romance,war,nostalgia,noir'],
  [T.movie, 'The Godfather', 'crime,family,new york,classic,mafia'],
  [T.movie, 'Whiplash', 'jazz,obsession,drums,coming of age'],
  [T.movie, 'La La Land', 'jazz,romance,los angeles,musical,nostalgia'],
  [T.movie, 'Baby Driver', 'heist,soundtrack,hype,crime,romance'],
  [T.movie, 'Tron: Legacy', 'retro-futurism,electronic,spectacle,games'],
  [T.tv, 'Euphoria', 'coming of age,psychedelic,hype,drama,spectacle'],
  [T.tv, 'The Sopranos', 'crime,family,mafia,new york,therapy'],
  [T.tv, 'Atlanta', 'hip hop,surreal,storytelling,coming of age'],
  [T.tv, 'Mad Men', 'nostalgia,new york,classic,style,romance'],
  [T.book, 'The Great Gatsby', 'jazz,nostalgia,romance,new york,classic'],
  [T.book, 'Ready Player One', 'games,retro-futurism,nostalgia,spectacle'],
  [T.game, 'Fortnite', 'games,hype,spectacle,battle royale,concerts'],
  [T.game, 'Grand Theft Auto V', 'crime,games,los angeles,heist,soundtrack'],
  [T.game, 'Mafia: Definitive Edition', 'crime,mafia,family,games,classic'],
  [T.podcast, 'Song Exploder', 'storytelling,music,jazz,hip hop'],
  [T.place, 'Blu Jaz Cafe', 'jazz,nostalgia,live music,soul'],
  [T.place, 'Marquee Singapore', 'hype,electronic,spectacle,hip hop'],
];
const E = raw.map(([type, name, tags], i) => ({
  entity_id: 'MOCK-' + i.toString(16).padStart(4, '0'),
  name, type, types: [type], popularity: 0.9,
  properties: { release_year: 1940 + ((i * 7) % 80), short_description: `${name} (synthetic test entity)` },
  tags: tags.split(',').map((t) => ({ id: 'urn:tag:mock:' + t.replace(/\W+/g, '_'), name: t, type: 'urn:tag:keyword' })),
}));
const byId = new Map(E.map((e) => [e.entity_id, e]));

function json(res, s, d) { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); }

http.createServer((req, res) => {
  if (req.headers['x-api-key'] !== 'mock-key') return json(res, 401, { error: 'bad key' });
  const u = new URL(req.url, 'http://x');
  const p = Object.fromEntries(u.searchParams);
  if (u.pathname === '/search') {
    const q = (p.query || '').toLowerCase();
    const types = p.types ? p.types.split(',') : null;
    const r = E.filter((e) => e.name.toLowerCase().includes(q) && (!types || types.includes(e.type)));
    return json(res, 200, { success: true, results: r.slice(0, Number(p.take) || 5) });
  }
  if (u.pathname === '/v2/insights') {
    const ids = (p['signal.interests.entities'] || '').split(',').filter(Boolean);
    const sigTags = new Map();
    ids.forEach((id) => byId.get(id)?.tags.forEach((t) => sigTags.set(t.name, (sigTags.get(t.name) || 0) + 1)));
    if (p['filter.type'] === 'urn:tag') {
      const tags = [...sigTags.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => ({ tag_id: 'urn:tag:mock:' + name, name }));
      return json(res, 200, { success: true, results: { tags: tags.slice(0, Number(p.take) || 10) } });
    }
    const pool = E.filter((e) => e.type === p['filter.type'] && !ids.includes(e.entity_id));
    const scored = pool.map((e) => {
      const s = e.tags.reduce((a, t) => a + (sigTags.get(t.name) || 0), 0);
      return { ...e, query: { affinity: Math.min(0.99, 0.2 + s / 6) }, _s: s };
    }).filter((e) => e._s > 0).sort((a, b) => b._s - a._s);
    return json(res, 200, { success: true, results: { entities: scored.slice(0, Number(p.take) || 20).map(({ _s, ...e }) => e) } });
  }
  json(res, 404, { error: 'not found' });
}).listen(4010, () => console.log('mock qloo on :4010'));
