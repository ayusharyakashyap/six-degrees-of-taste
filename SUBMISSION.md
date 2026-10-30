# Six Degrees of Taste — submission text

**Tagline:** An agent that finds the cultural path between any two people.

## What it does

Two people, two different worlds. You tell Six Degrees of Taste what each person loves — Grandpa: Frank Sinatra, Casablanca. Your teenager: Travis Scott, Fortnite. The agent walks Qloo's taste graph and returns a stepping-stone path between them across music, film, TV, books and games: where they meet, why each hop holds, three conversation starters, and a real place in your city where the path comes alive.

It's built for the moments where culture is the gap: grandparents and grandkids, first dates, new teammates, a teacher and a classroom, a brand reaching a new audience.

## Why it only works with Qloo

An LLM asked to "connect Sinatra to Fortnite" free-associates. This agent **searches**:

1. **Anchors** each favourite to a real Qloo entity (`/search`, with live autocomplete).
2. **Maps taste neighbourhoods** for each person across 5 domains (`/v2/insights`, parallel).
3. **Picks a fair bridge** from a joint-signal insights call, scoring every candidate by the *weaker* person's affinity, so nobody's taste is just being imposed on the other.
4. **Finds stepping stones** — entities with high affinity to the person *and* the bridge — preferring cross-domain hops.
5. **Re-plans** when a hop is missing: widens the search and adds domains.
6. **Explains every hop with Qloo data only**: shared taste tags + affinity-based link strength. An optional LLM narrator (Claude/OpenAI/Gemini) is constrained to entities and tags Qloo returned.
7. **Makes it real**: shared taste DNA (`urn:tag` insights) and places in your city (`urn:entity:place` + location filter).

Roughly 25 Qloo calls per path, in parallel. Without Qloo there is no graph to walk — the product doesn't exist.

## Agentic

- The pathfinder is a plan → act → evaluate → re-plan loop whose full trace is shown in the UI ("What the agent did").
- It ships as an **MCP server** at `/api/mcp` with `find_taste_path`, `qloo_search` and `qloo_recommend`, so Claude or any agent can find common ground between people.

## Try it

Pick a preset ("Grandpa & teen", "Metal dad & K-pop kid", "Bookworm & gamer", "CEO & Gen-Z intern") or type your own. Add a city. Hit **Find the path**. Then hit **Reverse the journey** or share the permalink.

## Built with

Qloo Taste AI API (`/search`, `/v2/insights` for entities, tags and places), Node serverless functions on Vercel, zero-dependency frontend, Model Context Protocol. MIT licensed.
