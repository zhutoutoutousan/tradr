# Tradr API / MCP — agent learning & planets

Status: **proposal** (not shipped).

**Product north star:** every user can plug **Tradr API** and **Tradr MCP** into
their own agent stack (**Cursor**, **Claude Code**, and similar), to **record
learning**, work the Academy loop, and eventually **share / invade planets**.
Advanced capabilities sit behind a **paywall**.

**mindcraft** is **not** a v1 dependency. It is a later optional path and a
**format reference** (graph V/E, PROBE → ANSWER → ASSESS, DualSubtitle) so Tradr
stays compatible when that ecosystem matures. Shipping order: Tradr-first.

Related shipped surfaces: `/academy`, `/academy/planet`, Meta + polyglot tracks
(PR #54). Design contracts: `web/src/lib/academy/connectors.ts`.

---

## 1. Problem / opportunity

Tradr Academy already has a teaching ontology (Planet, drills, meta, bilingual
lexicon). Users study in the browser, but serious learners live in **agents**.

We want:

1. **BYO agent** — Cursor / Claude Code / other MCP clients call Tradr; Tradr
   does not pay their LLM bills.
2. **Learning memory on Tradr** — probes, answers, lesson XP, planet overlays
   persist to the user’s account via API/MCP.
3. **Social planets** — publish a planet, let others **share** or **invade**
   (read / contest / graft fragments under rules).
4. **Monetization** — free core connect + read; advanced sync, invade, larger
   overlays, team features behind Pro (or similar).

---

## 2. Design principles

| Principle | Meaning |
|-----------|---------|
| Tradr is the product membrane | Accounts, keys, planets, races, paywall live on Tradr |
| BYO compute | User’s Cursor / Claude Code / model keys stay with the user |
| API ≡ MCP surface | Same auth, scopes, and resources; MCP is a thin tool façade over REST |
| Format-stable graph | V/E + CLAIM/SOURCE + study ritual match mindcraft-shaped schemas **later**; no runtime mindcraft required now |
| Least privilege keys | Default read; write / share / invade are explicit scopes |
| No answer dumps | Interview tools expose probes + short ASSESS notes, never pirated banks |
| Free compete, pay for tools | Align with Tradr: races stay free; Pro sells power tools / sync / invade |

---

## 3. Target architecture

```text
User agents: Cursor · Claude Code · other MCP / HTTP clients
        | MCP (Streamable HTTP)          | REST Bearer
        v                                v
Tradr edge:  /api/mcp  ·  /api/v1/academy/*
  Auth: OAuth PKCE (Cursor)  ·  API keys trad_… (Claude Code / CLI)
        | scoped by user_id + plan tier
        v
Data: academy_api_keys · learning_events · user_planets
      planet_shares · planet_invasions · academy progress
        |
        v
Skins: Learning Planet GUI · Meta/polyglot · Tradili · races

Later (not blocking): optional mindcraft import/export via the same
fragment JSON schema — format bridge only.
```

### Client modes (all first-class)

| Mode | Client | Auth | Notes |
|------|--------|------|-------|
| **Remote MCP** | Cursor (and any Streamable HTTP MCP client) | OAuth PKCE preferred | “Connect Cursor” deeplink — URL only, no secrets |
| **API key + MCP/HTTP** | Claude Code, scripts, CI | `TRADR_API_KEY` / Bearer | Same scopes as OAuth token |
| **stdio helper** (optional) | Local `npx @tradr/mcp` | env key | Thin proxy to remote API; not a second product |

---

## 4. Core product loops

### 4.1 Record learning (free tier core)

Agent (or UI) writes structured events:

- opened lesson / completed quiz / PROBE opened / ANSWER submitted
- lexicon unit reviewed (lang pair)
- drill result on Planet

Stored as `learning_events` (+ existing Academy progress). MCP tools:
`study.open_probe`, `study.submit_answer`, `progress.record`, `lexicon.pair_texts`.

### 4.2 Personal planet

Each user gets a **user planet** overlay on top of the shared Tradr teaching
core (Market Making paper star, Meta, etc.):

- private stars (concepts, notes with SOURCE)
- links to races / bots / lessons

### 4.3 Share planet

Owner publishes a **share slice** (visibility: link / followers / public):

- fragment JSON: nodes + edges + SOURCE
- invite code or public slug on Learning Planet galaxy view

### 4.4 Invade planet (advanced / paywalled)

**Invade** = enter another user’s published planet under rules:

| Invade mode | Behavior | Tier sketch |
|-------------|----------|-------------|
| Scout | read-only tour + PROBE against their public drills | Free or soft cap |
| Graft | copy allowed fragments into your overlay (attribution edge) | Pro |
| Contest | timed challenge on their drill set; scores on Tradili-style tape | Pro |

Hard rules: no access to private nodes; no private-shaped payloads; rate
limits; owner can revoke share / ban invader.

---

## 5. API key management

### UX (Profile / Academy → Developers)

1. Create key — name, scopes, optional expiry.
2. Show plaintext **once**; persist `sha256` + prefix `trad_…`.
3. Rotate / revoke; show last-used-at.
4. Buttons: **Connect Cursor** (deeplink), **Claude Code snippet** (`export TRADR_API_KEY=…` + MCP JSON).

### Scopes

| Scope | Purpose | Default key | Paywall |
|-------|---------|-------------|---------|
| `planet:read` | Search / get teaching + own public nodes | yes | free |
| `lexicon:read` | Dual-subtitle lexicon | yes | free |
| `study:write` | PROBE / ANSWER / progress events | opt-in | free (rate-limited) |
| `planet:share` | Publish share slice | opt-in | free soft cap / Pro unlimited |
| `planet:invade` | Scout+ / graft / contest | opt-in | **Pro** |
| `vault:sync` | Bulk fragment import/export (incl. future mindcraft format) | opt-in | **Pro** |

### Storage sketch

```sql
-- proposal only
create table academy_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{planet:read,lexicon:read}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table user_planets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  slug text unique,
  title text not null,
  visibility text not null default 'private', -- private|unlisted|public
  created_at timestamptz not null default now()
);

create table planet_nodes (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references user_planets(id) on delete cascade,
  node_key text not null,
  kind text not null,
  payload jsonb not null, -- label, gloss, claim, source
  unique (planet_id, node_key)
);

create table planet_shares (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references user_planets(id) on delete cascade,
  mode text not null default 'scout', -- scout|graft|contest
  invite_code text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  source text not null default 'api', -- api|mcp|web
  created_at timestamptz not null default now()
);
```

RLS: `user_id = auth.uid()` for private rows; public planet reads via
`visibility` / share invite policies.

---

## 6. MCP tool surface (v1 → v1.1)

| Tool | Scope | Tier | Notes |
|------|-------|------|-------|
| `planet.search` | `planet:read` | free | Teaching core + permitted overlays |
| `planet.get_node` | `planet:read` | free | CLAIM + SOURCE |
| `lexicon.pair_texts` | `lexicon:read` | free | User lang pair |
| `study.open_probe` | `study:write` | free* | Never invent ANSWER |
| `study.submit_answer` | `study:write` | free* | Persist ANSWER event |
| `progress.record` | `study:write` | free* | Lesson / drill telemetry |
| `planet.publish_share` | `planet:share` | soft / Pro | Create share slice |
| `planet.invade` | `planet:invade` | **Pro** | scout \| graft \| contest |
| `vault.export_fragment` | `vault:sync` | **Pro** | Format-stable JSON |
| `vault.import_fragment` | `vault:sync` | **Pro** | Merge overlay; PII guard |

\* free with rate limits; abuse → soft paywall.

REST mirrors the same operations under `/api/v1/academy/...` so Claude Code can
skip MCP and call HTTP if preferred.

---

## 7. Paywall sketch

Aligned with existing Tradr stance: **competition free; tools paid**.

| Capability | Free | Pro (sketch) |
|------------|------|----------------|
| Connect Cursor / Claude Code (read MCP) | ✓ | ✓ |
| Record learning events | ✓ rate-limited | ✓ higher limits |
| Personal planet (private) | ✓ small node cap | ✓ larger cap |
| Share planet (unlisted/public) | ✓ 1 active share | ✓ many + analytics |
| Invade (graft / contest) | scout only / demo | ✓ full |
| Vault bulk sync / format export | — | ✓ |
| Team / multi-planet org | — | later |

Exact Stripe price mapping TBD; reuse existing checkout patterns.

---

## 8. mindcraft role (later only)

| Now | Later |
|-----|--------|
| Steal **format ideas**: V/E lines, CLAIM+SOURCE, PROBE ritual, DualSubtitle pairing | Optional import/export of fragment JSON that round-trips to mindcraft `universe.graph.md` |
| Do **not** require mindcraft install, git vault, or cron | Optional “format bridge” skill / docs for power users |
| Tradr GUI is the durable skin | mindcraft tmp GUI remains their local skin |

Compatibility tests (when we get there): fixture fragments validate against a
shared JSON schema checked into Tradr (`vault-fragment.schema.json`).

---

## 9. Phased delivery

| Phase | Ship | Paywall |
|-------|------|---------|
| **P0** | This design + TS contracts | — |
| **P1** | API keys mint/revoke UI + hashed storage | — |
| **P2** | REST + remote MCP read (`planet.*`, `lexicon.*`) + Cursor deeplink + Claude Code docs | free |
| **P3** | `study.*` / `progress.record` learning journal | free rate limit |
| **P4** | User planets + share (scout) | soft caps |
| **P5** | Invade graft/contest + vault sync + Pro gate | **Pro** |
| **P6** | mindcraft format bridge (optional) | Pro |

---

## 10. Security checklist

- [ ] No secrets in deeplinks, docs snippets, or git
- [ ] Key shown once; revoke under 60s; hash-at-rest
- [ ] Invade never returns private nodes
- [ ] Fragment import rejects private-looking payloads
- [ ] Rate-limit by user + key; audit tool name (not full ANSWER bodies by default)
- [ ] Cursor OAuth redirects (desktop + web agents) registered
- [ ] Plan tier enforced server-side on `planet:invade` / `vault:sync`

---

## 11. Open questions

1. MCP host: `/api/mcp` on Vercel vs `mcp.` subdomain?
2. Invade scoring: reuse Tradili / race ELO or a separate “planet contest” ladder?
3. Free scout depth — full public planet or teaser nodes only?
4. Claude Code: ship official MCP config snippet in docs vs npm package name?

---

## 12. Code pointer

Contracts: `web/src/lib/academy/connectors.ts` (scopes, tools, deeplink,
fragment privacy guard, plan gate). MCP server + migrations intentionally out of
scope for the design PR.
