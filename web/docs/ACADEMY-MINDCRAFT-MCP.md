# Academy × mindcraft × Cursor MCP — technical design

Status: **proposal** (not shipped). Target: let each Tradr user attach their own
mindcraft-style second brain / Cursor agent loop to Academy Learning Planet,
with **per-user API keys** and optional **Cursor MCP / plugin** install.

Related shipped surfaces: `/academy`, `/academy/planet`, Meta + polyglot tracks.

---

## 1. Problem

Academy already mirrors a **teaching ontology** (Planet V/E, PROBE ritual, paper
muscle, bilingual lexicon). mindcraft-zttts is a **local-first personal OS**:
`pedagogy/universe.graph.md`, STUDY protocol, skills, cron. Today the link is
conceptual (inspired graph + SOURCE), not a live connector.

Users want:

1. Study quant on Tradr **and** continue the same graph / PROBE loop in Cursor.
2. Bring their **own** Cursor / AI learning stack (BYO agent), not a Tradr-hosted LLM bill.
3. Safe **API key management** — mint, rotate, revoke; never commit secrets.

---

## 2. Design principles

| Principle | Meaning |
|-----------|---------|
| Local-first truth stays local | mindcraft vault (git / disk) remains source of truth for private CLAIMs |
| Tradr holds a **shareable membrane** | Teaching fragments + race/lesson links, not `.private/` PII |
| BYO compute | User’s Cursor / OpenAI / Anthropic keys stay in their agent; Tradr keys only authorize vault sync |
| OAuth preferred for remote MCP | Cursor remote MCP → Tradr OAuth (PKCE); API keys for CLI / stdio |
| Least privilege | Scopes: `planet:read`, `study:write`, `lexicon:read`, `vault:sync` |
| No answer dumps | Interview probes stay prompts + ASSESS notes; never paste proprietary banks |

---

## 3. Target architecture

```text
┌──────────────────┐     Connect Cursor (deeplink)      ┌─────────────────┐
│  Tradr Academy   │ ─────────────────────────────────► │ Cursor Desktop  │
│  Web + Supabase  │     or marketplace plugin          │ / Cloud Agents  │
│                  │                                    └────────┬────────┘
│  • Planet KG     │                                             │ MCP
│  • Meta / polyglot│                                            │ Streamable HTTP
│  • User API keys │                                    ┌────────▼────────┐
│  • Vault links   │◄──── OAuth / Bearer ───────────────│ tradr-academy   │
└────────┬─────────┘                                    │ MCP server      │
         │                                              └────────┬────────┘
         │ REST / Edge                                           │ tools
         ▼                                                       ▼
┌──────────────────┐                              ┌──────────────────────┐
│ academy_connectors│                              │ Tools (v1):          │
│ academy_api_keys  │                              │  planet.search       │
│ academy_vault_frags│                             │  planet.get_node     │
│ (RLS by user_id)  │                              │  study.open_probe    │
└──────────────────┘                              │  study.submit_answer │
                                                  │  lexicon.pair_texts  │
                                                  │  vault.export_fragment│
         optional                                 └──────────────────────┘
┌──────────────────┐
│ User mindcraft   │  stdio MCP bridge (optional)
│ git vault        │  reads TRADR_API_KEY + local pedagogy/
└──────────────────┘
```

### Three connector modes

| Mode | Who runs agent | Auth | Best for |
|------|----------------|------|----------|
| **A. Remote MCP** | Cursor → `https://mcp.<host>/academy` | OAuth PKCE (preferred) | Default “Connect Cursor” |
| **B. stdio bridge** | `npx @tradr/academy-mcp` local | `TRADR_API_KEY` env | Offline / vault-on-disk |
| **C. Plugin pack** | Cursor Marketplace / deeplink | Same as A or B | Skills + rules + MCP URL bundled |

Mode B can also **push/pull graph fragments** between local mindcraft `universe.graph.md`
and Tradr `academy_vault_fragments` (user-scoped), never `.private/`.

---

## 4. API key management

### Product UX (Academy → Profile / Academy settings)

1. **Create key** — label + scopes + optional expiry.
2. Show **plaintext once**; store only `sha256` hash + prefix (`trad_…`).
3. **Rotate / revoke**; list last-used-at.
4. **Connect Cursor** button →
   `cursor://anysphere.cursor-deeplink/mcp/install?name=tradr-academy&config=<base64>`
   with **URL only** (no secret in the link). User completes OAuth in Cursor.

### Storage (Supabase sketch)

```sql
-- proposal only
create table academy_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,          -- trad_ab12
  key_hash text not null,            -- sha256
  scopes text[] not null default '{planet:read,lexicon:read}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table academy_connectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  kind text not null check (kind in ('cursor_mcp','stdio_bridge','mindcraft_git')),
  display_name text,
  config jsonb not null default '{}', -- e.g. { "vaultRef": "github:user/mindcraft" } no secrets
  status text not null default 'active',
  created_at timestamptz not null default now()
);
```

RLS: `user_id = auth.uid()` for all rows. Edge MCP validates Bearer / OAuth →
maps to `user_id`, never trusts client-supplied user ids.

### What keys are **not**

- Not OpenAI/Anthropic keys for Tradr-hosted inference (v1).
- Optional later: “bring your own LLM” for Academy chat — separate product surface;
  store encrypted provider keys with explicit consent, or keep them only in Cursor.

---

## 5. MCP tool surface (v1)

| Tool | Scope | Side effect |
|------|-------|-------------|
| `planet.search` | `planet:read` | none |
| `planet.get_node` | `planet:read` | none |
| `lexicon.pair_texts` | `lexicon:read` | none — uses user’s lang pair |
| `study.open_probe` | `study:write` | creates / returns open PROBE for a node |
| `study.submit_answer` | `study:write` | stores ANSWER; does **not** invent ASSESS |
| `vault.export_fragment` | `vault:sync` | returns shareable V/E JSON (SOURCE required) |
| `vault.import_fragment` | `vault:sync` | merges user fragment into personal overlay |

Resources (optional): `academy://planet/{nodeId}`, `academy://lesson/{id}`.

Prompts: `meta/paper-muscle`, `meta/probe-ritual`, `polyglot/dual-subtitle`.

### Plugin contents (Cursor)

```text
tradr-academy-plugin/
  .cursor-plugin/plugin.json
  mcp.json                 # remote URL, OAuth metadata — no secrets
  skills/
    paper-muscle/SKILL.md  # thin wrapper pointing at Academy tools
    probe-study/SKILL.md
  rules/
    no-private-pii.mdc
```

Install path: deeplink from Academy first; Marketplace when stable.

---

## 6. mindcraft alignment

| mindcraft organ | Tradr mapping |
|-----------------|---------------|
| `universe.graph.md` V/E | Learning Planet + `academy_vault_fragments` |
| pedagogy-cpu PROBE/ANSWER/ASSESS | Planet drills + `study.*` tools |
| paper-muscle skill | Meta track + MCP prompt |
| polyglot DualSubtitle | Academy lang pair + lexicon tools |
| `.private/` | **never sync** |
| GUI / tmp skin | Academy React Planet (durable product skin) |

Sync direction (v1): **Academy teaching core → Cursor** (read). Optional
**user overlay → Academy** for personal stars (write, scoped). Shared “galaxy”
multiplayer worlds stay future outlook (mindcraft README), not v1.

---

## 7. Phased delivery

| Phase | Ship | Risk |
|-------|------|------|
| **P0** | Design + TypeScript connector contracts (this doc) | — |
| **P1** | `academy_api_keys` table + Profile UI mint/revoke | RLS mistakes |
| **P2** | Read-only MCP (`planet.*`, `lexicon.*`) + Cursor deeplink | OAuth redirect setup |
| **P3** | `study.*` write path + Meta track wiring | Invented ANSWER anti-pattern |
| **P4** | stdio bridge + optional mindcraft fragment sync | Path traversal / PII leak |
| **P5** | Marketplace plugin + skills pack | Review latency |

---

## 8. Security checklist

- [ ] No secrets in `.cursor/mcp.json`, deeplinks, or plugin git
- [ ] Key shown once; hash-at-rest; revoke works in &lt;60s
- [ ] OAuth redirects: Cursor desktop `localhost:8787` + web agents callback
- [ ] Cloud Agent MCP login ≠ desktop login (document for users)
- [ ] Fragment import rejects bodies with `.private` paths / PII heuristics
- [ ] Rate-limit MCP by `user_id` + key id
- [ ] Audit log: tool name, key id, timestamp (no ANSWER bodies in logs by default)

---

## 9. Open questions

1. Host MCP under Tradr Vercel (`/api/mcp`) vs dedicated subdomain?
2. Personal vault storage: Supabase JSON only, or optional GitHub App to user’s mindcraft fork?
3. Should Pro tier gate `vault:sync` / write scopes while read stays free?
4. Multi-mind “invade shared world” — defer until single-user sync is solid.

---

## 10. Code pointer

Type contracts for upcoming work live in `web/src/lib/academy/connectors.ts`.
Implementation of the MCP server and migrations is intentionally **out of scope**
for the design PR.
