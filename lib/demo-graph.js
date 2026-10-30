// DEMO MODE ONLY — a small, hand-written, ILLUSTRATIVE taste graph used when no Qloo API key is
// configured. These tags and scores are NOT Qloo data. The UI labels every demo result as such.
// It mimics the response shapes of Qloo's /search and /v2/insights so the full agent runs end to end.

const A = 'urn:entity:artist', M = 'urn:entity:movie', T = 'urn:entity:tv_show', B = 'urn:entity:book',
  G = 'urn:entity:videogame', P = 'urn:entity:podcast', PL = 'urn:entity:place';

const RAW = [
  // music
  [A, 'Frank Sinatra', 1915, 'crooner,jazz,nostalgia,new york,romance,swagger,classic'],
  [A, 'Travis Scott', 1991, 'hip hop,psychedelic,hype,spectacle,concerts,youth culture,swagger'],
  [A, 'Kendrick Lamar', 1987, 'hip hop,storytelling,jazz,poetry,los angeles,social commentary'],
  [A, 'Amy Winehouse', 1983, 'jazz,soul,nostalgia,heartbreak,retro,swagger'],
  [A, 'Daft Punk', 1993, 'electronic,retro-futurism,spectacle,robots,dance'],
  [A, 'Metallica', 1981, 'metal,intensity,stadium,rebellion,dystopia,power'],
  [A, 'BTS', 2013, 'k-pop,choreography,fandom,youth culture,spectacle,korean'],
  [A, 'Bruce Springsteen', 1949, 'heartland rock,working class,storytelling,stadium,nostalgia,america'],
  [A, 'Olivia Rodrigo', 2003, 'pop punk,heartbreak,coming of age,youth culture,confessional'],
  [A, 'Taylor Swift', 1989, 'pop,storytelling,heartbreak,fandom,confessional,coming of age'],
  [A, 'Billie Eilish', 2001, 'alt pop,dark,youth culture,confessional,gothic'],
  [A, 'Beyoncé', 1981, 'r&b,spectacle,power,choreography,stadium,empowerment'],
  [A, 'The Beatles', 1960, 'classic,british,nostalgia,psychedelic,songwriting'],
  [A, 'Queen', 1970, 'stadium,spectacle,rock,classic,british,anthems'],
  [A, 'Ludwig Göransson', 1984, 'film score,epic,electronic,spectacle,sci-fi'],
  [A, 'Hans Zimmer', 1957, 'film score,epic,intensity,sci-fi,spectacle,stadium'],
  [A, 'Lady Gaga', 1986, 'pop,spectacle,jazz,gothic,choreography,empowerment'],
  // film
  [M, 'Casablanca', 1942, 'classic,romance,war,nostalgia,noir,sacrifice'],
  [M, 'The Godfather', 1972, 'crime,family,new york,classic,mafia,power,loyalty'],
  [M, 'Whiplash', 2014, 'jazz,obsession,intensity,coming of age,mentorship'],
  [M, 'La La Land', 2016, 'jazz,romance,los angeles,musical,nostalgia,dreamers'],
  [M, 'Baby Driver', 2017, 'heist,soundtrack,hype,crime,romance,cars'],
  [M, 'Tron: Legacy', 2010, 'retro-futurism,electronic,spectacle,games,sci-fi'],
  [M, 'Mad Max: Fury Road', 2015, 'dystopia,intensity,cars,spectacle,survival,rebellion'],
  [M, 'John Wick', 2014, 'action,revenge,choreography,intensity,loyalty,stylized'],
  [M, 'Pride & Prejudice', 2005, 'period drama,romance,british,class,wit'],
  [M, 'Interstellar', 2014, 'sci-fi,family,epic,space,film score,sacrifice'],
  [M, 'Dune: Part Two', 2024, 'sci-fi,epic,desert,power,film score,survival,spectacle'],
  [M, 'Top Gun: Maverick', 2022, 'action,nostalgia,mentorship,spectacle,america,loyalty'],
  [M, 'Spirited Away', 2001, 'anime,fantasy,coming of age,japanese,wonder'],
  [M, 'Everything Everywhere All at Once', 2022, 'multiverse,family,martial arts,absurd,choreography,immigrant'],
  [M, 'Rocky', 1976, 'underdog,working class,boxing,mentorship,america,classic'],
  [M, 'Elvis', 2022, 'musical,spectacle,nostalgia,america,fame,swagger'],
  [M, 'Bohemian Rhapsody', 2018, 'musical,stadium,british,rock,anthems,fame'],
  [M, 'Oppenheimer', 2023, 'history,power,film score,epic,intensity,war'],
  [M, 'The Social Network', 2010, 'startups,ambition,power,wit,youth culture'],
  [M, 'The Lord of the Rings', 2001, 'fantasy,epic,quest,loyalty,survival,film score'],
  [M, 'Ready Player One', 2018, 'games,retro-futurism,nostalgia,spectacle,quest'],
  // tv
  [T, 'Euphoria', 2019, 'coming of age,psychedelic,hype,youth culture,spectacle,confessional'],
  [T, 'The Sopranos', 1999, 'crime,family,mafia,new york,therapy,power'],
  [T, 'Mad Men', 2007, 'nostalgia,new york,classic,style,ambition,swagger'],
  [T, 'Squid Game', 2021, 'korean,survival,dystopia,class,games,intensity'],
  [T, 'Downton Abbey', 2010, 'period drama,british,class,family,romance'],
  [T, 'Succession', 2018, 'power,family,wit,ambition,dynasty,class'],
  [T, 'Wednesday', 2022, 'gothic,coming of age,dark,wit,youth culture,choreography'],
  [T, 'Stranger Things', 2016, 'nostalgia,coming of age,sci-fi,games,friendship,retro'],
  [T, 'The Last of Us', 2023, 'survival,dystopia,family,games,loyalty,sacrifice'],
  [T, 'Peaky Blinders', 2013, 'crime,family,british,period drama,power,style'],
  [T, 'Bridgerton', 2020, 'period drama,romance,british,class,pop covers'],
  [T, 'The Bear', 2022, 'family,intensity,working class,food,mentorship'],
  [T, 'Arcane', 2021, 'games,animation,class,dystopia,sisters,stylized'],
  [T, 'The Crown', 2016, 'british,power,period drama,dynasty,history'],
  // books
  [B, 'The Great Gatsby', 1925, 'jazz,nostalgia,romance,new york,classic,ambition'],
  [B, 'Pride and Prejudice', 1813, 'period drama,romance,british,class,wit,classic'],
  [B, 'Shoe Dog', 2016, 'startups,ambition,underdog,memoir,america'],
  [B, 'Dune', 1965, 'sci-fi,epic,desert,power,survival,dynasty'],
  [B, 'The Hunger Games', 2008, 'dystopia,survival,games,rebellion,coming of age,class'],
  [B, 'Born to Run', 2016, 'memoir,heartland rock,working class,america,storytelling'],
  [B, 'The Hobbit', 1937, 'fantasy,quest,classic,wonder,friendship'],
  [B, 'Wuthering Heights', 1847, 'gothic,romance,dark,british,classic,heartbreak'],
  [B, 'Ready Player One (novel)', 2011, 'games,retro-futurism,nostalgia,quest,youth culture'],
  [B, 'Just Kids', 2010, 'memoir,new york,rock,coming of age,friendship,poetry'],
  // games
  [G, 'Fortnite', 2017, 'games,hype,spectacle,battle royale,concerts,youth culture,survival'],
  [G, 'Grand Theft Auto V', 2013, 'crime,games,los angeles,heist,soundtrack,cars'],
  [G, 'Mafia: Definitive Edition', 2020, 'crime,mafia,family,games,classic,loyalty,nostalgia'],
  [G, 'Elden Ring', 2022, 'fantasy,epic,games,dark,quest,survival,intensity'],
  [G, 'Minecraft', 2011, 'games,creativity,building,friendship,youth culture,wonder'],
  [G, 'The Legend of Zelda: Tears of the Kingdom', 2023, 'fantasy,quest,games,wonder,creativity'],
  [G, 'Red Dead Redemption 2', 2018, 'western,loyalty,games,epic,america,family'],
  [G, 'Beat Saber', 2018, 'games,rhythm,electronic,dance,choreography'],
  [G, 'Cyberpunk 2077', 2020, 'dystopia,games,retro-futurism,electronic,rebellion'],
  [G, 'Hogwarts Legacy', 2023, 'fantasy,british,games,wonder,coming of age,gothic'],
  // podcasts
  [P, 'Song Exploder', 2014, 'storytelling,songwriting,music,jazz,hip hop'],
  [P, 'How I Built This', 2016, 'startups,ambition,underdog,storytelling'],
];

const PLACES = [
  ['Esplanade – Theatres on the Bay', 'concerts,classic,spectacle,jazz,musical'],
  ['Blu Jaz Cafe', 'jazz,nostalgia,soul,live music'],
  ['Timezone VivoCity', 'games,hype,rhythm,youth culture'],
  ['Kinokuniya Singapore', 'fantasy,classic,books,anime,period drama'],
  ['The Projector', 'classic,film score,sci-fi,anime,cult'],
  ['National Gallery Singapore', 'history,classic,period drama,creativity'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tagObj = (t) => ({ id: `urn:tag:demo:${slug(t)}`, name: t, type: 'urn:tag:keyword' });

const ENTITIES = RAW.map(([type, name, year, tags]) => ({
  entity_id: `DEMO-${slug(name)}`,
  name,
  type,
  types: [type],
  popularity: 0.9,
  properties: { release_year: year },
  tags: tags.split(',').map(tagObj),
}));
const PLACE_ENTITIES = PLACES.map(([name, tags]) => ({
  entity_id: `DEMO-${slug(name)}`,
  name,
  type: PL,
  types: [PL],
  properties: { short_description: 'Singapore · demo pick' },
  tags: tags.split(',').map(tagObj),
}));
const BY_ID = new Map([...ENTITIES, ...PLACE_ENTITIES].map((e) => [e.entity_id, e]));

// rarer tags carry more signal (idf)
const DF = new Map();
for (const e of ENTITIES) for (const t of e.tags) DF.set(t.name, (DF.get(t.name) || 0) + 1);
const idf = (t) => Math.log(1 + ENTITIES.length / (DF.get(t) || 1));

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function demoNames() {
  return ENTITIES.map((e) => e.name);
}

export function demoQloo(path, p) {
  if (path === '/search') {
    const q = norm(p.query || '');
    const types = p.types ? String(p.types).split(',') : null;
    const hits = ENTITIES.filter((e) => (!types || types.includes(e.type)) && (norm(e.name).includes(q) || (q.length > 3 && q.includes(norm(e.name)))))
      .sort((x, y) => (norm(y.name) === q) - (norm(x.name) === q) || norm(x.name).indexOf(q) - norm(y.name).indexOf(q));
    return { success: true, results: hits.slice(0, Number(p.take) || 5) };
  }
  if (path === '/v2/insights') {
    const ids = String(p['signal.interests.entities'] || '').split(',').filter(Boolean);
    const sig = new Map();
    for (const id of ids) for (const t of BY_ID.get(id)?.tags || []) sig.set(t.name, (sig.get(t.name) || 0) + 1);
    const take = Number(p.take) || 20;
    if (p['filter.type'] === 'urn:tag') {
      const tags = [...sig.entries()].sort((a, b) => b[1] * idf(b[0]) - a[1] * idf(a[0])).map(([t]) => ({ tag_id: tagObj(t).id, name: t }));
      return { success: true, results: { tags: tags.slice(0, take) } };
    }
    const isPlace = p['filter.type'] === PL;
    if (isPlace && !/singapore/i.test(String(p['filter.location.query'] || ''))) return { success: true, results: { entities: [] } };
    const pool = (isPlace ? PLACE_ENTITIES : ENTITIES).filter((e) => e.type === p['filter.type'] && !ids.includes(e.entity_id));
    const scored = pool
      .map((e) => ({ e, s: e.tags.reduce((a, t) => a + (sig.get(t.name) || 0) * idf(t.name), 0) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const max = scored[0]?.s || 1;
    return {
      success: true,
      results: { entities: scored.slice(0, take).map(({ e, s }) => ({ ...e, query: { affinity: Math.round((0.35 + 0.6 * (s / max)) * 1000) / 1000 } })) },
    };
  }
  return { success: false, results: [] };
}
