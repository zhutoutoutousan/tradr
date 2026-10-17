# Deployment Setup Guide

Schritt-für-Schritt Anleitung für Supabase + Vercel Deployment.

## 🎯 Schritt 1: Supabase Setup

### 1.1 Projekt erstellen (falls noch nicht vorhanden)

1. Gehen Sie zu [supabase.com](https://supabase.com)
2. "New Project" → Name: "tradr-game"
3. Wählen Sie Region (z.B. Frankfurt)
4. Warten Sie 2 Minuten bis Projekt bereit ist

### 1.2 Database Migration ausführen

**Option A: SQL Editor (Einfach)**

1. Gehen Sie zu SQL Editor im Dashboard
2. "New Query"
3. Kopieren Sie Inhalt von `web/supabase/migrations/003_user_profiles_and_leaderboard.sql`
4. Führen Sie aus (Run)
5. Prüfen Sie: Table Editor → Sollte `user_profiles`, `user_game_history`, `global_leaderboard` zeigen

**Option B: Supabase CLI (Fortgeschritten)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link Projekt
supabase link --project-ref your-project-ref

# Push Migration
supabase db push
```

### 1.3 API Keys holen

1. Settings → API
2. Kopieren Sie:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Langer JWT Token

---

## 🎯 Schritt 2: Vercel Setup

### 2.1 Vercel Account verbinden

1. Gehen Sie zu [vercel.com](https://vercel.com)
2. Login mit GitHub
3. Import Repository: `zhutoutoutousan/tradr`

### 2.2 Environment Variables setzen

Im Vercel Dashboard:

1. Projekt auswählen
2. Settings → Environment Variables
3. Hinzufügen:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Environment auswählen: **Production, Preview, Development**

### 2.3 Deployment-Settings

1. Settings → General
2. **Framework Preset**: Next.js
3. **Build Command**: `cd web && npm install && npm run build`
4. **Output Directory**: `web/.next`
5. **Install Command**: `cd web && npm install`
6. **Root Directory**: Leave empty (oder `./`)

---

## 🎯 Schritt 3: Deployment testen

### 3.1 Lokaler Test (Optional)

```bash
cd web

# Environment Variables setzen
cp .env.local.example .env.local
# Editieren und echte Werte einfügen

# Dependencies installieren
npm install

# Development Server
npm run dev

# Testen:
# 1. http://localhost:3000
# 2. Registrieren
# 3. Spiel spielen
# 4. /leaderboard besuchen
```

### 3.2 Production Deployment

**Option A: Automatisch via Git Push**
```bash
git push origin main
# Vercel deployed automatisch
```

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link Projekt
cd /workspace
vercel link

# Deploy
vercel --prod
```

### 3.3 Deployment prüfen

1. Warten Sie ~2 Minuten
2. Öffnen Sie URL: `https://tradr-game.vercel.app` (oder Ihre Custom Domain)
3. Testen Sie:
   - ✅ Seite lädt
   - ✅ Registrierung funktioniert
   - ✅ Login funktioniert
   - ✅ Leaderboard zeigt Daten
   - ✅ PWA-Installation möglich

---

## 🎯 Schritt 4: Custom Domain (Optional)

### 4.1 Domain hinzufügen

1. Vercel Dashboard → Projekt → Settings → Domains
2. "Add" → Ihre Domain eingeben
3. DNS-Einträge setzen (Vercel zeigt Anleitung)

### 4.2 SSL-Zertifikat

- ✅ Automatisch von Vercel (Let's Encrypt)
- Warten Sie ~5 Minuten

---

## 🔧 Troubleshooting

### "Supabase is not configured"

**Problem:** Environment Variables nicht gesetzt

**Lösung:**
1. Vercel Dashboard → Settings → Environment Variables
2. Prüfen Sie `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy: Deployments → ... → Redeploy

### "Row Level Security policy violation"

**Problem:** RLS-Policies nicht korrekt

**Lösung:**
1. Supabase Dashboard → SQL Editor
2. Migration nochmal ausführen
3. Prüfen: Table Editor → user_profiles → RLS ist enabled

### "Build failed"

**Problem:** Falsche Build-Settings

**Lösung:**
1. Vercel → Settings → General
2. Build Command: `cd web && npm run build`
3. Output Directory: `web/.next`
4. Install Command: `cd web && npm install`

### Service Worker nicht aktiv

**Problem:** HTTP statt HTTPS

**Lösung:**
- ✅ Vercel deployed automatisch mit HTTPS
- ✅ Prüfen: URL beginnt mit `https://`

---

## 📝 Checkliste

Vor Production-Deployment:

- [ ] Supabase Projekt erstellt
- [ ] Database Migration ausgeführt
- [ ] API Keys kopiert
- [ ] Vercel Projekt verlinkt
- [ ] Environment Variables gesetzt
- [ ] Lokaler Test erfolgreich (optional)
- [ ] Build erfolgreich
- [ ] Registrierung funktioniert
- [ ] Leaderboard zeigt Daten
- [ ] PWA installierbar
- [ ] HTTPS aktiv
- [ ] Service Worker aktiv

---

## 🚀 Quick Start (TL;DR)

**Für Cloud Agent:**

```bash
# 1. Setze Secrets in Cursor Dashboard:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
VERCEL_TOKEN

# 2. Der Agent kann dann deployen:
cd /workspace
vercel --prod --token=$VERCEL_TOKEN
```

**Manuell:**

```bash
# 1. Supabase: SQL Editor → 003_user_profiles.sql ausführen
# 2. Vercel: Import GitHub Repo → Set Env Vars
# 3. Git Push → Auto-Deploy
```

---

## 📞 Support

Bei Problemen:
1. Prüfen Sie Vercel Build Logs
2. Prüfen Sie Browser Console (F12)
3. Prüfen Sie Supabase Logs

**Common Issues:**
- Environment Variables vergessen
- Falsche Build-Directory
- Migration nicht ausgeführt
- RLS-Policies fehlen
