# Six Degrees of Taste

**An agent that finds the cultural path between any two people — powered by Qloo's taste graph.**

Tell it what Grandpa loves (*Frank Sinatra, Casablanca*) and what your teenager loves (*Travis Scott, Fortnite*). The agent walks Qloo's Taste AI graph hop by hop — across music, film, TV, books and games — and returns a **stepping-stone path** between them: where they meet, why every hop holds, what to talk about, and a real place in your city to go together.

> Agents are culturally blind. Ask an LLM to connect Sinatra to Fortnite and it free-associates. Six Degrees of Taste *searches* — every stop is a real Qloo entity with measured affinity to the stop before it and the stop after it.

---

## What it does

| Feature | How Qloo powers it |
|---|---|
| **Smart favourites** | Live autocomplete against Qloo `/search` across artists, films, TV, books, games, podcasts, brands. Type `movie:`, `book:`, `tv:`, `game:` or `music:` to disambiguate. |
| **Taste neighbourhoods** | For each person, parallel `/v2/insights` calls across 5 domains map hundreds of entities they over-index on. |
| **Fair bridge** | A joint-signal insights call proposes meeting points; each is scored by the **weaker** side's affinity, so the bridge is somewhere both people genuinely lean in. |
| **Stepping stones** | The bridge's own neighbourhood is mapped; the agent picks entities that are high-affinity for the person *and* for the bridge, preferring cross-domain hops. |
| **Self-correcting** | If a side has no clean stepping stone, the agent re-plans: widens the search and adds domains. |
| **Grounded explanations** | Every hop shows the **shared Qloo taste tags** and an affinity-based link strength. An optional LLM narrates, but is constrained to entities/tags Qloo returned. |
| **Shared taste DNA** | `urn:tag` insights on both people's signals. |
| **Make it real** | `urn:entity:place` insights filtered by city → a place where the path comes alive. |
| **MCP server** | `/api/mcp` exposes `find_taste_path`, `qloo_search`, `qloo_recommend` to any agent (Claude, etc.). |
| **Shareable** | Every result has a permalink (`?a=Name~fav1|fav2&b=...`), and a one-click "reverse the journey". |

Use cases: families across generations, first dates, new teammates, teachers and students, therapists and clients, brands crossing into a new audience.

## The algorithm (meet-in-the-middle over the taste graph)

```
A seeds ──insights×5 domains──▶ N(A)          N(B) ◀──insights×5── B seeds
             └──── joint insights(A+B) ──▶ bridge candidates
                    score = 0.6·min(sA,sB) + 0.25·√(sA·sB) + 0.15·joint
                              │
                        bridge M ──insights×5──▶ N(M)
   X1 = argmax √(N(A)·N(M))            X2 = argmax √(N(M)·N(B))
   Path:  A ─▶ X1 ─▶ M ─▶ X2 ─▶ B     (re-plan with wider search if X1/X2 missing)
```

~25 Qloo calls per path, run in parallel, cached per instance.

## Run locally

```bash
cp .env.example .env        # put your QLOO_API_KEY in it
npm run dev                 # http://localhost:3000  (no dependencies to install)
```

Offline testing with the bundled **mock** Qloo (synthetic data, for development only):

```bash
npm test
# or: npm run mock  &  QLOO_API_KEY=mock-key QLOO_BASE_URL=http://localhost:4010 npm run dev
```

## Live mode vs demo mode

- **Live:** set `QLOO_API_KEY` on the server, **or** click *Use my Qloo key* in the app and paste one. A visitor key is kept in that browser tab only and sent per request in an `x-qloo-key` header. It is never stored or logged. The MCP endpoint accepts the same header.
- **Demo:** with no key anywhere, the full agent runs on a small hand-built **illustrative** sample graph (`lib/demo-graph.js`, ~80 entities, not Qloo data), so anyone can try the experience end to end. Every demo result is clearly labelled.

## Deploy (Vercel, ~2 minutes)

1. Import this repo at <https://vercel.com/new> (Framework preset: **Other**, no build command).
2. Add environment variable `QLOO_API_KEY` (optional: without it the app runs in labelled demo mode and visitors can paste their own key) (and optionally `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`).
3. Deploy. Static UI is served from `public/`, serverless functions from `api/`.

## Use it from any agent (MCP)

Add a remote MCP server pointing at `https://<your-deployment>/api/mcp` (Streamable HTTP, JSON responses). Then ask your agent:

> "My dad loves Metallica and Mad Max, my daughter loves BTS and Squid Game — find the path between them."

## Project layout

```
api/        Vercel serverless routes: path, resolve, health, mcp
lib/        qloo.js (client) · pathfinder.js (graph search) · narrate.js (grounded narration) · service.js
public/     index.html — the whole UI, zero build step
scripts/    dev server, mock Qloo, smoke test
```

## License

MIT — see [LICENSE](LICENSE). Qloo data and service access are subject to Qloo's terms.
