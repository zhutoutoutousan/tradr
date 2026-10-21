# 🎮 Tradr Quick Start Guide

**Stand:** Wednesday, Oct 21, 2026  
**Status:** ✅ Build erfolgreich | ⏳ Credentials teilweise konfiguriert

---

## 🎯 Was funktioniert JETZT

### ✅ Sofort spielbar (ohne weitere Setup)

```bash
cd web
npm install
npm run dev
# → http://localhost:3000/play
```

**Features die funktionieren:**
- ✅ **Solo Trading Game** (`/play`)
  - Real 5-Jahre historische Daten
  - 6 Trading Bots als Gegner
  - Fast Forward 1x/2x/5x/20x
  - Keyboard Shortcuts (B/S/C/Space)
  - Mobile-optimiert

**Keine Credentials benötigt!** 🎉

---

## ⏳ Was noch Credentials braucht

### 1. Multiplayer Mode ⏳

**Status:** Code ready, wartet auf Supabase

**Benötigt:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**Setup Zeit:** ~10 Minuten

**Schnellste Methode:**

#### A) Via Vercel Integration (2 Minuten) ⚡

```bash
# 1. Deploy zu Vercel
cd web
vercel --prod

# 2. Während Setup: Add Supabase Integration
# → Credentials werden automatisch hinzugefügt

# 3. Fertig!
```

#### B) Manuell (10 Minuten)

1. **Supabase Projekt erstellen:**
   - https://supabase.com/dashboard → New Project
   - Name: `tradr-production`
   - Wait ~2 min

2. **SQL Schema erstellen:**
   - SQL Editor → New Query
   - Kopieren Sie SQL aus `SETUP_STATUS.md` (Zeile 117-165)
   - Run ✅

3. **Credentials holen:**
   - Settings → API
   - Kopieren: `Project URL` + `anon public key`

4. **Zu Cursor Cloud Secrets hinzufügen:**
   ```
   https://cursor.com/dashboard/cloud-agents/secrets
   
   Add Secret #1:
     Key: SUPABASE_URL
     Value: https://xxxxx.supabase.co
   
   Add Secret #2:
     Key: SUPABASE_ANON_KEY
     Value: eyJhbGci...
   ```

5. **Regenerate .env.local:**
   ```bash
   /workspace/scripts/setup-env.sh
   ```

6. **Rebuild:**
   ```bash
   cd web && npm run build
   ```

---

### 2. Stripe Checkout ⏳

**Status:** 66% fertig, braucht nur Price ID

**Benötigt:**
- `STRIPE_PRICE_ID`

**Setup Zeit:** ~5 Minuten

**Quick Fix:**

1. **Produkt erstellen:**
   - https://dashboard.stripe.com/products
   - Add Product: "Tradr Pro"
   - Price: $9.99 / month (oder Ihr Wunschpreis)
   - Save

2. **Price ID kopieren:**
   - Sieht aus wie: `price_1AbCdEfGhIjKlMnO`

3. **Zu Cursor Cloud Secrets hinzufügen:**
   ```
   https://cursor.com/dashboard/cloud-agents/secrets
   
   Add Secret:
     Key: STRIPE_PRICE_ID
     Value: price_xxxxxxxxxxxxx
   ```

4. **Regenerate .env.local:**
   ```bash
   /workspace/scripts/setup-env.sh
   cd web && npm run build
   ```

---

## 🚀 Empfohlener Workflow

### Szenario A: "Ich will JETZT spielen" ⚡

```bash
cd web
npm run dev
# → http://localhost:3000/play

# ✅ Solo Game funktioniert sofort!
```

---

### Szenario B: "Ich will volle Funktionalität" 🎯

**Zeitaufwand:** ~15 Minuten

```bash
# 1. Setup Supabase (10 min)
# → Siehe "Option B) Manuell" oben

# 2. Setup Stripe Price ID (5 min)
# → Siehe "Quick Fix" oben

# 3. Regenerate .env.local
/workspace/scripts/setup-env.sh

# 4. Rebuild & Start
cd web
npm run build
npm run dev

# 5. Test alles:
# → http://localhost:3000/play ✅
# → http://localhost:3000/multiplayer ✅
# → http://localhost:3000/register ✅
```

---

### Szenario C: "Ich will auf Vercel deployen" 🚀

**Zeitaufwand:** ~5 Minuten (mit Supabase Integration)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy mit Integrations
cd web
vercel --prod

# Während Setup:
# → Add Supabase Integration ✅
# → Credentials automatisch hinzugefügt

# 3. Nur noch Stripe Price ID manuell hinzufügen
# → Vercel Dashboard → Settings → Environment Variables
# → Add: STRIPE_PRICE_ID=price_xxxxx

# 4. Redeploy
vercel --prod

# ✅ Fertig!
```

---

## 🧪 Testing Checklist

### Phase 1: Solo Game (0 Credentials)

- [ ] `npm run dev` startet ohne Fehler
- [ ] `/play` lädt
- [ ] Chart rendert mit historischen Daten
- [ ] Trading Bots sind sichtbar
- [ ] Buy/Sell funktioniert
- [ ] Fast Forward funktioniert
- [ ] Keyboard Shortcuts funktionieren

**Expected:** ✅ Alles funktioniert

---

### Phase 2: Mit Supabase (2 Credentials)

- [ ] Supabase Credentials hinzugefügt
- [ ] `.env.local` regeneriert
- [ ] `npm run build` erfolgreich
- [ ] `/multiplayer` zeigt KEINE "not configured" Nachricht
- [ ] "Create Room" Button funktioniert
- [ ] Room wird erstellt
- [ ] Zweiter Browser-Tab kann joinen
- [ ] Beide Tabs sind synchronisiert
- [ ] QR Code Share Modal öffnet
- [ ] Leaderboard "Submit" Button ist enabled

**Expected:** ✅ Multiplayer + Leaderboard funktionieren

---

### Phase 3: Mit Stripe Price ID (3 Credentials)

- [ ] Stripe Price ID hinzugefügt
- [ ] `.env.local` regeneriert
- [ ] `npm run build` erfolgreich
- [ ] `/register` lädt
- [ ] "Go Pro" Button sichtbar
- [ ] Click öffnet Stripe Checkout
- [ ] Test Card `4242 4242 4242 4242` funktioniert

**Expected:** ✅ Alle Features funktionieren

---

## 📊 Current Status

```
✅ Configured Secrets (1/3):
  ✅ STRIPE_PRIVATEKEY

⏳ Missing Secrets (2/3):
  ⏳ STRIPE_PRICE_ID
  ⏳ SUPABASE_URL
  ⏳ SUPABASE_ANON_KEY

✅ Build Status: ✅ SUCCESS
✅ Solo Game: ✅ FUNCTIONAL
⏳ Multiplayer: ⏳ WAITING FOR SUPABASE
⏳ Checkout: ⏳ WAITING FOR PRICE_ID
```

---

## 🔧 Useful Commands

```bash
# Check current secrets
printenv | grep -E '(STRIPE|SUPABASE)'

# Regenerate .env.local from Cloud Secrets
/workspace/scripts/setup-env.sh

# Check .env.local content
cat /workspace/web/.env.local

# Test build
cd /workspace/web && npm run build

# Run development server
cd /workspace/web && npm run dev

# Run production build
cd /workspace/web && npm run build && npm start
```

---

## 📖 Alle Dokumentationen

| Dokument | Zweck |
|----------|-------|
| `QUICK_START.md` | Dieser Guide ⭐ |
| `SETUP_STATUS.md` | Detaillierter Status & Troubleshooting |
| `CREDENTIALS_SETUP.md` | Step-by-Step Credentials Guide |
| `VERCEL_SUPABASE_INTEGRATION.md` | Automatische Vercel Integration |
| `QR_SHARE_FEATURE.md` | QR Code Feature Dokumentation |
| `CURSOR_CLOUD_SECRETS.md` | Cloud Secrets Management |
| `REQUIREMENTS.md` | Original Requirements |

---

## 🎯 Was als Nächstes?

### Option 1: Jetzt spielen ⚡
```bash
cd web && npm run dev
# → http://localhost:3000/play
```

### Option 2: Volle Features freischalten 🎯
```bash
# 1. Add Supabase Secrets (10 min)
# 2. Add Stripe Price ID (5 min)
# 3. Run: /workspace/scripts/setup-env.sh
# 4. Run: cd web && npm run build
# 5. Test: npm run dev
```

### Option 3: Deploy zu Vercel 🚀
```bash
# 1. Install: npm i -g vercel
# 2. Deploy: cd web && vercel --prod
# 3. Add Supabase Integration (in Vercel Dashboard)
# 4. Add Stripe Price ID (in Environment Variables)
# 5. Redeploy: vercel --prod
```

---

## 💡 Pro Tips

1. **Testen Sie Solo Mode zuerst** - Braucht keine Credentials!
2. **Vercel Integration ist am schnellsten** - Supabase Credentials automatisch
3. **Test Mode für Stripe** - Nutzen Sie `sk_test_` Keys für Entwicklung
4. **Script ist Ihr Freund** - `scripts/setup-env.sh` nach jedem Secret-Update

---

## 🆘 Hilfe benötigt?

**Fehler beim Build?**
- Check: `SETUP_STATUS.md` → Troubleshooting Sektion

**Credentials falsch?**
- Run: `/workspace/scripts/setup-env.sh`
- Check: `cat web/.env.local`

**Multiplayer funktioniert nicht?**
- Check: SQL Schema erstellt? (SETUP_STATUS.md Zeile 117)
- Check: Realtime aktiviert? (Database → Replication)

**Stripe Checkout öffnet nicht?**
- Check: Price ID existiert? (dashboard.stripe.com/products)
- Check: Test Mode Keys matchen? (`sk_test_` mit `pk_test_`)

---

**Sie sind nur 3 Secrets entfernt von einem voll-funktionalen Multiplayer Trading Game!** 🚀

Secrets hinzufügen: https://cursor.com/dashboard/cloud-agents/secrets
