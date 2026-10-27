# Dogfood Tradr API from Cursor Cloud Agent

Use your Tradr account + API key so a Cursor Cloud Agent can pull Quant 2026
curriculum, Learning Planet nodes, free quant RSS, and record study events.

## 1. Apply DB migration (once)

Run `web/supabase/migrations/005_academy_api_keys.sql` on your Supabase project
(SQL editor or CLI). This creates `academy_api_keys`, `academy_learning_events`,
and security-definer RPCs for Bearer lookup.

## 2. Mint a key (your account)

1. Sign in on Tradr → **Profile**
2. **Developers · Tradr API** → **Mint dogfood key**
3. Copy the `trad_…` plaintext **once**

Scopes minted by default: `planet:read`, `lexicon:read`, `study:write`.

### Fast path without migration (owner dogfood)

On the Vercel / Next server env set:

```bash
TRADR_DOGFOOD_API_KEY=trad_your_long_secret_here
TRADR_DOGFOOD_USER_ID=<optional uuid>
TRADR_DOGFOOD_SCOPES=planet:read,lexicon:read,study:write,planet:share
TRADR_DOGFOOD_PLAN=pro
```

Use the **same** value as `TRADR_API_KEY` in Cursor Cloud Agent env.
Dogfood events are acknowledged without DB persistence.

## 3. Cursor Cloud Agent env

```bash
TRADR_API_KEY=trad_…
TRADR_API_BASE=https://<your-tradr-host>   # e.g. https://tradr-sigma.vercel.app
```

Optional MCP-style header config (when remote MCP ships):

```json
{
  "tradr-academy": {
    "url": "https://<host>/api/mcp",
    "headers": {
      "Authorization": "Bearer ${env:TRADR_API_KEY}"
    }
  }
}
```

Until MCP is live, the agent should call **REST** below with `curl` / `fetch`.

## 4. REST surface (v1)

All require `Authorization: Bearer $TRADR_API_KEY`.

| Method | Path | Scope | Purpose |
|--------|------|-------|---------|
| GET | `/api/v1/academy/planet?q=` | `planet:read` | Search / list Planet nodes |
| GET | `/api/v1/academy/planet/:id` | `planet:read` | Node + neighbors + drill |
| GET | `/api/v1/academy/lexicon?primary=zh&target=de` | `lexicon:read` | Dual-subtitle units |
| GET | `/api/v1/academy/curriculum?track=quant26` | `planet:read` | Tracks + lessons + paper list |
| GET | `/api/v1/academy/feeds` | `planet:read` | News + **quant blogs** + arXiv |
| POST | `/api/v1/academy/study/events` | `study:write` | Record learning JSON |

### Example study loop

```bash
BASE="${TRADR_API_BASE:-http://localhost:3000}"
AUTH="Authorization: Bearer $TRADR_API_KEY"

# 1) Pull fresh quant blogs + papers
curl -sS -H "$AUTH" "$BASE/api/v1/academy/feeds" | head -c 2000

# 2) Open Quant 2026 curriculum
curl -sS -H "$AUTH" "$BASE/api/v1/academy/curriculum?track=quant26"

# 3) Inspect a planet paper star
curl -sS -H "$AUTH" "$BASE/api/v1/academy/planet/paper-tradefm"

# 4) Dual subtitles for desk lexicon
curl -sS -H "$AUTH" "$BASE/api/v1/academy/lexicon?primary=zh&target=de"

# 5) Record that you PROBE'd a node
curl -sS -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"kind":"probe_answer","payload":{"nodeId":"paper-tradefm","note":"cold answer…"},"source":"cursor"}' \
  "$BASE/api/v1/academy/study/events"
```

## 5. Free RSS sources wired into Tradili + API

| Kind | Source | URL |
|------|--------|-----|
| news | BBC Business | `feeds.bbci.co.uk/news/business/rss.xml` |
| news | MarketWatch | Dow Jones public RSS |
| news | CNBC | CNBC combined RSS |
| blog | Quantocracy | `https://quantocracy.com/feed/` |
| blog | Robot Wealth | `https://robotwealth.com/feed/` |
| blog | QuantInsti | `https://blog.quantinsti.com/rss/` |
| blog | Alpha Architect | `https://alphaarchitect.com/feed/` |
| paper | arXiv q-fin RSS | `https://rss.arxiv.org/rss/q-fin` |
| paper | arXiv API TR/CP/ST/PR | export.arxiv.org query |

UI: Tradili → **Quant blogs** tab. API: `GET /api/v1/academy/feeds`.

Skipped for now (blocked / flaky under server UA): QuantStart (503), thequant.space (Cloudflare challenge). Revisit later.

## 6. Suggested agent prompt (paste into Cloud Agent)

```
You are my quant study agent using Tradr API.
Base: $TRADR_API_BASE  Header: Authorization Bearer $TRADR_API_KEY

Loop:
1. GET /api/v1/academy/feeds — pick 1 blog + 1 arXiv paper relevant to Quant 2026 / market making / LOB FMs.
2. GET /api/v1/academy/curriculum?track=quant26 — choose the lesson that matches.
3. GET /api/v1/academy/planet/<related-node> — answer the drill PROBE cold in chat.
4. POST /api/v1/academy/study/events with kind=probe_answer and your note.
5. GET /api/v1/academy/lexicon?primary=zh&target=de — dual-subtitle 2 concepts from the lesson.
Never invent ANSWER before retrieving; never paste pirated PDFs.
```

## 7. Key management endpoints (session JWT, not trad_ key)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/academy/keys` | Supabase access token |
| POST | `/api/v1/academy/keys` | Supabase access token |
| DELETE | `/api/v1/academy/keys/:id` | Supabase access token |
