# 🚀 Vercel + Supabase Integration Guide

**Automatische Credentials via Vercel Integration** ✨

---

## 🎯 Übersicht

Mit der **Vercel Supabase Integration** können Sie Supabase Credentials automatisch zu Ihrem Vercel-Projekt hinzufügen - keine manuelle Konfiguration nötig!

---

## ⚡ Quick Start (2 Minuten)

### Option 1: Während Vercel Deployment

Wenn Sie Ihr Projekt zu Vercel deployen:

1. **Gehen Sie zu:** https://vercel.com/new
2. **Import Repository:** `zhutoutoutousan/tradr`
3. **Configure Project:** Root Directory = `web`
4. **Klicken Sie:** "Add Integrations" (unten)
5. **Suchen Sie:** "Supabase"
6. **Install:** Vercel Supabase Integration
7. **Authentifizieren Sie** mit Ihrem Supabase Account
8. **Wählen Sie** Ihr Supabase Projekt (oder erstellen Sie ein neues)
9. **Deploy!**

**Fertig!** ✅ Credentials werden automatisch injiziert.

---

### Option 2: Für existierendes Vercel Projekt

Wenn Ihr Projekt bereits auf Vercel deployed ist:

1. **Gehen Sie zu:** https://vercel.com/dashboard
2. **Wählen Sie** Ihr Projekt
3. **Settings** → **Integrations**
4. **Browse Marketplace** → Suchen Sie "Supabase"
5. **Add Integration**
6. **Authentifizieren** mit Supabase
7. **Wählen Sie** Ihr Supabase Projekt
8. **Speichern**

Die Integration fügt automatisch hinzu:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (optional)
```

9. **Redeploy** Ihr Projekt (Settings → Deployments → Redeploy)

---

## 📋 Was die Integration macht

### Automatisch hinzugefügte Environment Variables:

```bash
# PUBLIC (Client-sicher)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PRIVATE (Server-only, optional)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Wichtig:** Tradr nutzt nur `NEXT_PUBLIC_*` Variables. `SERVICE_ROLE_KEY` wird NICHT benötigt.

---

## ✅ Fehlende Credentials nach Integration

**Sie haben jetzt:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Sie brauchen noch (manuell hinzufügen):**
- ❌ `STRIPE_SECRET_KEY`
- ❌ `STRIPE_PRICE_ID`
- ❌ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (siehe REQUIREMENTS.md)
- ❌ `NEXT_PUBLIC_SITE_URL` (automatisch gesetzt, aber überprüfen)

---

## 🔧 Stripe Credentials manuell hinzufügen

Nach der Supabase Integration:

1. **Vercel Dashboard** → Ihr Projekt → **Settings** → **Environment Variables**

2. **Fügen Sie hinzu:**

   ```bash
   # Stripe Secret Key
   Name: STRIPE_SECRET_KEY
   Value: sk_test_... (von Stripe Dashboard)
   Environment: Production, Preview, Development
   
   # Stripe Publishable Key
   Name: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   Value: pk_live_51N99JsEfawZzu7YhUbVYGDBYUk77WbVsVWvBEYU0DNP6uQcuNiwqGnlVT7YWJ69svRG8LqcWI01HnYLLVacfuYou00Toq24xNF
   Environment: Production, Preview, Development
   
   # Stripe Price ID
   Name: STRIPE_PRICE_ID
   Value: price_... (erstellen Sie ein Produkt in Stripe)
   Environment: Production, Preview, Development
   
   # Site URL (falls nicht automatisch)
   Name: NEXT_PUBLIC_SITE_URL
   Value: https://ihr-projekt.vercel.app
   Environment: Production
   ```

3. **Speichern**

4. **Redeploy** (Settings → Deployments → Latest → Redeploy)

---

## 🗃️ Supabase Database Setup

**Die Vercel Integration fügt KEINE Tabellen hinzu!** Sie müssen noch:

### 1. SQL Schema ausführen

**Option A: Supabase Dashboard (Empfohlen)**

1. **Gehen Sie zu:** https://supabase.com/dashboard
2. **Wählen Sie** Ihr Projekt
3. **SQL Editor** (linke Sidebar)
4. **Neue Query**
5. **Kopieren Sie** beide SQL Dateien:

**`001_anonymous_games.sql`:**
```sql
-- Anonymous solo/multiplayer round saves for statistics and community replay.

create table if not exists public.anonymous_games (
  id text primary key,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  mode text not null default 'solo' check (mode in ('solo', 'multiplayer')),
  market_id text not null,
  market_label text not null,
  seed bigint not null,
  rank smallint not null,
  return_pct numeric not null,
  profit numeric not null,
  trades smallint not null default 0,
  review_json jsonb not null,
  setup_json jsonb
);

create index if not exists anonymous_games_created_at_idx
  on public.anonymous_games (created_at desc);

alter table public.anonymous_games enable row level security;

create policy "anon_insert_games"
  on public.anonymous_games for insert
  to anon, authenticated
  with check (true);

create policy "anon_select_games"
  on public.anonymous_games for select
  to anon, authenticated
  using (true);
```

6. **Run** (unten rechts)

7. **Neue Query** für zweite Tabelle:

**`002_active_mp_rooms.sql`:**
```sql
-- Live multiplayer room directory (heartbeat while at least one trader is in lobby/game).

create table if not exists public.active_mp_rooms (
  room_code text primary key,
  traders smallint not null default 0 check (traders >= 0),
  spectators smallint not null default 0 check (spectators >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists active_mp_rooms_updated_at_idx
  on public.active_mp_rooms (updated_at desc);

alter table public.active_mp_rooms enable row level security;

create policy "anon_select_active_mp_rooms"
  on public.active_mp_rooms for select
  to anon, authenticated
  using (true);

create policy "anon_insert_active_mp_rooms"
  on public.active_mp_rooms for insert
  to anon, authenticated
  with check (true);

create policy "anon_update_active_mp_rooms"
  on public.active_mp_rooms for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "anon_delete_active_mp_rooms"
  on public.active_mp_rooms for delete
  to anon, authenticated
  using (true);
```

8. **Run**

**Option B: Lokal mit Migration Script**

Wenn Sie die Credentials bereits in `.env.local` haben:

```bash
cd web
npm run db:migrate
```

### 2. Realtime aktivieren

1. **Supabase Dashboard** → **Database** → **Replication**
2. **Finden Sie:** `active_mp_rooms` Tabelle
3. **Toggle:** Realtime **ON** ✅
4. **Speichern**

---

## 🧪 Testen der Integration

### Nach Vercel Deployment:

```bash
# 1. Öffnen Sie Ihre Vercel URL
https://ihr-projekt.vercel.app

# 2. Testen Sie Multiplayer
https://ihr-projekt.vercel.app/multiplayer

# Sollte NICHT zeigen:
❌ "Multiplayer is not configured"

# Sollte zeigen:
✅ Room Lobby mit "Create Room" Button

# 3. Erstellen Sie einen Room
# 4. Share mit QR-Code Button
# 5. Join in zweitem Browser Tab
# 6. Beide sollten synchronisiert sein ✅
```

### Lokales Testing mit Vercel Credentials:

```bash
# 1. Pull Environment Variables von Vercel
cd web
vercel env pull .env.local

# 2. Development
npm run dev

# 3. Test
open http://localhost:3000/multiplayer
```

---

## 📊 Integration Status Check

### In Vercel Dashboard:

1. **Projekt** → **Settings** → **Integrations**
2. **Supabase** sollte als "Installed" erscheinen ✅
3. **Settings** → **Environment Variables**
4. Sollte zeigen:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
⚠️ STRIPE_SECRET_KEY (manuell hinzufügen)
⚠️ STRIPE_PRICE_ID (manuell hinzufügen)
⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (manuell hinzufügen)
✅ NEXT_PUBLIC_SITE_URL (automatisch oder manuell)
```

---

## 🔄 Credentials Update/Rotation

### Wenn Sie Supabase Keys rotieren:

Die Integration updated automatisch bei Key-Rotation in Supabase!

**Manual Update:**
1. **Vercel** → **Integrations** → **Supabase** → **Configure**
2. **Refresh Credentials**
3. **Redeploy**

### Wenn Sie Stripe Keys ändern:

1. **Vercel** → **Settings** → **Environment Variables**
2. **Edit** die Stripe-Variables
3. **Speichern**
4. **Redeploy**

---

## 🐛 Troubleshooting

### "Multiplayer not configured" nach Integration

**Problem:** Credentials wurden nicht korrekt injiziert

**Lösung:**
1. Prüfen Sie **Vercel** → **Settings** → **Environment Variables**
2. Verifizieren Sie `NEXT_PUBLIC_SUPABASE_*` existieren
3. **Redeploy** das Projekt
4. Hard-Refresh Browser (`Ctrl+Shift+R`)

### Integration zeigt "Not Connected"

**Problem:** Supabase Auth fehlgeschlagen

**Lösung:**
1. **Remove Integration** in Vercel
2. **Re-add** Supabase Integration
3. **Authentifizieren** erneut mit Supabase
4. **Wählen Sie** korrektes Projekt

### Database Tables nicht gefunden

**Problem:** SQL Schema nicht ausgeführt

**Lösung:**
1. Gehen Sie zu Supabase Dashboard → SQL Editor
2. Führen Sie beide Migrations aus (siehe oben)
3. Prüfen Sie: **Table Editor** sollte beide Tabellen zeigen
4. Aktivieren Sie Realtime für `active_mp_rooms`

### Vercel Deployment funktioniert, aber lokales Dev nicht

**Problem:** Lokale `.env.local` fehlt

**Lösung:**
```bash
cd web
vercel env pull .env.local
npm run dev
```

---

## 🎯 Finale Checklist

Nach erfolgreicher Integration:

- [ ] Vercel Supabase Integration installiert
- [ ] `NEXT_PUBLIC_SUPABASE_URL` in Environment Variables ✅
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Environment Variables ✅
- [ ] Stripe Keys manuell hinzugefügt
- [ ] Beide SQL Migrations ausgeführt
- [ ] Realtime aktiviert für `active_mp_rooms`
- [ ] Production Deployment getestet
- [ ] Multiplayer funktioniert
- [ ] QR-Code Share funktioniert
- [ ] Lokale `.env.local` via `vercel env pull`

---

## 📞 Support Links

### Vercel:
- **Integrations Marketplace:** https://vercel.com/integrations
- **Supabase Integration:** https://vercel.com/integrations/supabase
- **Environment Variables:** https://vercel.com/docs/environment-variables

### Supabase:
- **Dashboard:** https://supabase.com/dashboard
- **Vercel Integration Docs:** https://supabase.com/docs/guides/platform/vercel

---

## 🚀 Next Steps

Nach erfolgreicher Integration:

1. ✅ **Test Multiplayer:** `/multiplayer` sollte funktionieren
2. ✅ **Test QR Share:** Room mit QR-Code teilen
3. ✅ **Test Leaderboard:** Score submission nach Game
4. ⏳ **Setup Stripe:** Für Pro Registration (`/register`)
5. ⏳ **Custom Domain:** Optional in Vercel Settings

---

**Mit Vercel + Supabase Integration haben Sie 2 von 6 Credentials automatisch!** 🎉

**Noch nötig:** Stripe Setup (3 Variables) - siehe [`CREDENTIALS_SETUP.md`](./CREDENTIALS_SETUP.md)

---

**Zeit gespart:** ~5-10 Minuten (keine manuelle Supabase Setup) ⚡
