# 🔐 Credentials Setup Guide - Tradr

Diese Anleitung zeigt Ihnen **Schritt-für-Schritt**, wie Sie alle benötigten Credentials bekommen und einrichten.

---

## 📋 Übersicht: Was wird benötigt?

| Service | Warum? | Status |
|---------|--------|--------|
| **Stripe** | Zahlungen für Pro-Registrierung | ⏳ Setup nötig |
| **Supabase** | Multiplayer Realtime + Leaderboard Datenbank | ⏳ Setup nötig |
| **Site URL** | Redirect nach Stripe Checkout | ⏳ Setup nötig |

**Zeitaufwand:** ~15-20 Minuten für beide Services

---

## 🎯 Schritt 1: Stripe Credentials einrichten

### 1.1 Stripe Account erstellen (falls noch nicht vorhanden)

1. Gehen Sie zu: https://dashboard.stripe.com/register
2. Erstellen Sie einen Account
3. Bestätigen Sie Ihre E-Mail

### 1.2 API Keys holen

1. **Gehen Sie zu:** https://dashboard.stripe.com/apikeys
2. **Sie sehen zwei Tabs:**
   - **Test mode** (für Entwicklung) ✅ Empfohlen für Start
   - **Live mode** (für Production)

3. **Kopieren Sie diese Keys:**

   **Test Mode Keys (zum Testen):**
   ```
   Publishable key: pk_test_...
   Secret key: sk_test_... (Click "Reveal test key")
   ```

   **ODER Live Mode Keys (für Production):**
   ```
   Publishable key: pk_live_...
   Secret key: sk_live_... (Click "Reveal live key")
   ```

### 1.3 Produkt & Price erstellen

1. **Gehen Sie zu:** https://dashboard.stripe.com/products
2. **Klicken Sie:** "+ Add product"
3. **Füllen Sie aus:**
   - **Name:** "Tradr Pro" (oder Ihr Wunschname)
   - **Description:** "Premium membership for Tradr game"
   - **Pricing:** 
     - **Model:** Recurring (monatlich/jährlich) ODER One-time
     - **Price:** z.B. $9.99 / Monat
4. **Speichern Sie das Produkt**
5. **Kopieren Sie die Price ID:** (sieht aus wie `price_1234567890abcdef`)

### 1.4 Webhook konfigurieren (Optional, für Production)

Für lokale Entwicklung nicht nötig. Für Production:

1. **Gehen Sie zu:** https://dashboard.stripe.com/webhooks
2. **Add endpoint:** `https://ihre-domain.com/api/webhook`
3. **Events:** `checkout.session.completed`

---

## 🗄️ Schritt 2: Supabase Datenbank einrichten

### 2.1 Supabase Projekt erstellen

1. **Gehen Sie zu:** https://supabase.com/dashboard
2. **Klicken Sie:** "New project"
3. **Füllen Sie aus:**
   - **Organization:** Erstellen Sie eine neue (z.B. "Tradr")
   - **Name:** z.B. "tradr-production"
   - **Database Password:** Generieren Sie ein starkes Passwort (speichern Sie es!)
   - **Region:** Wählen Sie die nächstgelegene zu Ihren Usern
4. **Create project** (dauert ~2 Minuten)

### 2.2 API Credentials holen

1. **Warten Sie bis "Project is ready"**
2. **Gehen Sie zu:** Settings → API (in der linken Sidebar)
3. **Kopieren Sie:**

   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   ⚠️ **Nutzen Sie die `anon` key, NICHT die `service_role` key!**

### 2.3 Datenbank Schema erstellen

1. **Gehen Sie zu:** SQL Editor (in der linken Sidebar)
2. **Klicken Sie:** "New query"
3. **Führen Sie dieses SQL aus:**

```sql
-- Multiplayer Rooms Tabelle
CREATE TABLE IF NOT EXISTS multiplayer_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  seed TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  players_count INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 10,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Anonymous Games Tabelle (für Leaderboard)
CREATE TABLE IF NOT EXISTS anonymous_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT,
  final_balance NUMERIC NOT NULL,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC,
  symbol TEXT,
  timeframe TEXT,
  game_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_rooms_status ON multiplayer_rooms(status);
CREATE INDEX IF NOT EXISTS idx_games_balance ON anonymous_games(final_balance DESC);
CREATE INDEX IF NOT EXISTS idx_games_created ON anonymous_games(created_at DESC);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE multiplayer_rooms;

-- Row Level Security (RLS) aktivieren
ALTER TABLE multiplayer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_games ENABLE ROW LEVEL SECURITY;

-- Public Read-Zugriff (für anonyme User)
CREATE POLICY "Public can read rooms"
  ON multiplayer_rooms FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read games"
  ON anonymous_games FOR SELECT
  TO anon
  USING (true);

-- Public Write-Zugriff
CREATE POLICY "Public can insert rooms"
  ON multiplayer_rooms FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can insert games"
  ON anonymous_games FOR INSERT
  TO anon
  WITH CHECK (true);

-- Public Update nur für eigene Rooms
CREATE POLICY "Public can update rooms"
  ON multiplayer_rooms FOR UPDATE
  TO anon
  USING (true);
```

4. **Klicken Sie:** "Run" (unten rechts)
5. **Prüfen Sie:** "Success. No rows returned" ✅

### 2.4 Realtime aktivieren (wichtig für Multiplayer!)

1. **Gehen Sie zu:** Database → Replication (in der linken Sidebar)
2. **Finden Sie:** `multiplayer_rooms` Tabelle
3. **Aktivieren Sie:** Den Toggle bei "Realtime"
4. **Klicken Sie:** "Save"

---

## 🌐 Schritt 3: Site URL konfigurieren

### Für lokale Entwicklung:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Für Production (z.B. Vercel):
```
NEXT_PUBLIC_SITE_URL=https://ihre-domain.vercel.app
```

---

## 📝 Schritt 4: .env.local Datei erstellen

1. **Navigieren Sie zu:** `web/` Ordner
2. **Kopieren Sie die Template-Datei:**
   ```bash
   cd web
   cp .env.local.example .env.local
   ```

3. **Öffnen Sie** `.env.local` und füllen Sie ALLE Werte aus:

```bash
# STRIPE
STRIPE_SECRET_KEY=sk_test_... # Ihr Secret Key von Schritt 1.2
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Ihr Publishable Key
STRIPE_PRICE_ID=price_... # Ihre Price ID von Schritt 1.3

# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co # Von Schritt 2.2
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... # Anon Key von Schritt 2.2

# SITE
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # Für lokal
```

4. **Speichern Sie die Datei**

---

## ✅ Schritt 5: Testen

### 5.1 Credentials prüfen

```bash
cd web
npm run build
npm start
```

Öffnen Sie: http://localhost:3000

### 5.2 Features testen

1. **Multiplayer:**
   - Gehen Sie zu `/multiplayer`
   - Sollte NICHT "Multiplayer not configured" zeigen ✅
   - Erstellen Sie einen Room
   - Öffnen Sie in zweitem Browser-Tab denselben Room
   - Beide sollten synchronisiert sein ✅

2. **Leaderboard:**
   - Spielen Sie ein Spiel auf `/play`
   - Klicken Sie "Submit to Leaderboard"
   - Ihr Score sollte erscheinen ✅

3. **Stripe Checkout:**
   - Gehen Sie zu `/register`
   - Klicken Sie auf "Go Pro"
   - Sollte Stripe Checkout öffnen ✅
   - **Test Mode:** Nutzen Sie Testkarte `4242 4242 4242 4242`

---

## 🐛 Troubleshooting

### ❌ "Multiplayer not configured"
**Problem:** Supabase Credentials fehlen oder falsch

**Lösung:**
1. Prüfen Sie `.env.local` auf Tippfehler
2. Prüfen Sie ob Variablen mit `NEXT_PUBLIC_` beginnen
3. Restart: `npm run build && npm start`
4. Check Browser Console für Fehler

### ❌ Stripe Checkout öffnet nicht
**Problem:** Stripe Keys fehlen oder Test/Live verwechselt

**Lösung:**
1. Prüfen Sie `STRIPE_SECRET_KEY` in `.env.local`
2. Prüfen Sie `STRIPE_PRICE_ID` existiert
3. Check Network Tab: `/api/checkout` sollte 200 returnen
4. Matchen Sie Test Mode Keys: `sk_test_` mit `pk_test_`

### ❌ Database Migration fails
**Problem:** SQL Schema noch nicht erstellt

**Lösung:**
1. Gehen Sie zurück zu **Schritt 2.3**
2. Führen Sie das komplette SQL aus
3. Prüfen Sie: Supabase Dashboard → Table Editor
4. Sie sollten `multiplayer_rooms` und `anonymous_games` sehen

### ❌ "Network error" im Multiplayer
**Problem:** Realtime nicht aktiviert

**Lösung:**
1. Gehen Sie zu **Schritt 2.4**
2. Aktivieren Sie Realtime für `multiplayer_rooms`
3. Warten Sie 30 Sekunden
4. Refreshen Sie die App

---

## 🚀 Production Deployment Checklist

Bevor Sie live gehen:

- [ ] **Stripe:** Wechseln Sie zu **Live Mode** Keys (`sk_live_`, `pk_live_`)
- [ ] **Stripe:** Erstellen Sie Live-Produkt mit realer Preisgestaltung
- [ ] **Stripe:** Konfigurieren Sie Webhook für Production-URL
- [ ] **Supabase:** Überprüfen Sie RLS Policies
- [ ] **Supabase:** Aktivieren Sie Email Auth (falls gewünscht)
- [ ] **Environment:** Setzen Sie `NEXT_PUBLIC_SITE_URL` auf Production-Domain
- [ ] **Test:** Kompletter E2E-Test auf Production
- [ ] **Monitoring:** Aktivieren Sie Stripe Dashboard Alerts
- [ ] **Backup:** Erstellen Sie Supabase Database Backup

---

## 🔒 Sicherheits-Hinweise

### ✅ DO:
- ✅ Verwenden Sie `.env.local` (ist in `.gitignore`)
- ✅ Rotieren Sie Keys bei Verdacht auf Leak
- ✅ Verwenden Sie Stripe Test Mode für Entwicklung
- ✅ Nutzen Sie `anon` Key für Supabase (nicht `service_role`)
- ✅ Setzen Sie starke RLS Policies in Supabase

### ❌ DON'T:
- ❌ Committen Sie NIE `.env.local` in Git
- ❌ Teilen Sie NIE `STRIPE_SECRET_KEY` öffentlich
- ❌ Nutzen Sie NIE `service_role` Key im Client
- ❌ Hardcoden Sie NIE Secrets im Source Code

---

## 📞 Support & Hilfe

### Stripe Dokumentation:
- https://stripe.com/docs/keys
- https://stripe.com/docs/products-prices

### Supabase Dokumentation:
- https://supabase.com/docs/guides/database
- https://supabase.com/docs/guides/realtime
- https://supabase.com/docs/guides/auth/row-level-security

### Community:
- Stripe Discord: https://stripe.com/discord
- Supabase Discord: https://discord.supabase.com

---

## ✅ Status Check

Nach Abschluss sollten Sie haben:

- ✅ `.env.local` mit allen 6 Variablen gefüllt
- ✅ Stripe Dashboard mit Produkt & Price
- ✅ Supabase Projekt mit 2 Tabellen
- ✅ Realtime aktiviert für `multiplayer_rooms`
- ✅ App läuft lokal ohne Fehler
- ✅ Multiplayer funktioniert
- ✅ Leaderboard funktioniert
- ✅ Stripe Checkout öffnet

**Geschätzter Zeitaufwand:** 15-20 Minuten ⚡

---

**Viel Erfolg! 🚀**

Wenn alles läuft, sind Sie bereit für:
- ✅ Database Migration (`npm run db:migrate`)
- ✅ Production Deployment (siehe nächster Guide)
