# 🚀 Tradr - Quick Start Guide

**Von Null zu Production in 30 Minuten** ⚡

---

## ⚡ 30-Minuten-Setup

### 1. Repository klonen & Dependencies installieren (2 min)

```bash
git clone <repo-url>
cd tradr/web
npm install
```

### 2. Credentials einrichten (15 min)

#### Option A: Interaktives Setup (Empfohlen) ✨

```bash
npm run setup
```

Das interaktive Script führt Sie durch alle Schritte!

#### Option B: Manuelles Setup

Folgen Sie [`CREDENTIALS_SETUP.md`](../CREDENTIALS_SETUP.md) für detaillierte Anweisungen.

**Benötigte Accounts:**
- Stripe Account → https://dashboard.stripe.com/register
- Supabase Account → https://supabase.com/dashboard

### 3. Database Migration (2 min)

```bash
npm run db:migrate
```

### 4. Lokal testen (5 min)

```bash
npm run dev
```

Öffnen Sie: http://localhost:3000

**Testen Sie:**
- ✅ `/play` - Solo Trading Game
- ✅ `/multiplayer` - Multiplayer Rooms
- ✅ `/register` - Stripe Checkout (Testkarte: 4242 4242 4242 4242)

### 5. Production Build (3 min)

```bash
npm run build
npm start
```

### 6. Deploy (5-10 min)

```bash
npm i -g vercel
vercel --prod
```

Folgen Sie den Prompts und geben Sie Ihre Environment Variables ein.

---

## 📚 Vollständige Dokumentation

- **[SETUP_COMPLETE.md](../SETUP_COMPLETE.md)** - Master Setup Guide
- **[CREDENTIALS_SETUP.md](../CREDENTIALS_SETUP.md)** - Schritt-für-Schritt Credentials
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Production Deployment
- **[web/docs/README.md](./docs/README.md)** - PWA Dokumentation

---

## 🔑 Environment Variables Cheat Sheet

Erstellen Sie `.env.local` im `web/` Ordner:

```bash
# STRIPE (https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...

# SUPABASE (https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# SITE
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🎮 Game Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Long (Buy) | B or Left-Click | Long Button |
| Short (Sell) | S or Right-Click | Short Button |
| Close Position | C or Middle-Click | Close Button |
| Pause/Resume | Space | Pause Icon |
| Fast-Forward | F | FF Icon |
| Speed Select | 1-4 | Speed Buttons |

---

## 🐛 Common Issues

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Multiplayer funktioniert nicht
1. Check `.env.local` für Supabase Credentials
2. Aktivieren Sie Realtime in Supabase Dashboard
3. Führen Sie `npm run db:migrate` aus

### Stripe Checkout öffnet nicht
1. Check `STRIPE_SECRET_KEY` in `.env.local`
2. Check `STRIPE_PRICE_ID` existiert
3. Prüfen Sie Network Tab: `/api/checkout` Response

---

## 📦 npm Scripts Übersicht

```bash
npm run setup          # Interaktives Credentials Setup
npm run dev            # Development Server (localhost)
npm run build          # Production Build
npm run start          # Production Server (localhost)
npm run db:migrate     # Database Migrations
npm run fetch-data     # Market Data aktualisieren
npm run test:e2e       # E2E Tests
npm run lint           # ESLint
```

---

## ✅ Success Checklist

Nach dem Setup sollten Sie haben:

- ✅ `.env.local` mit 6 Variablen
- ✅ Supabase Tabellen erstellt
- ✅ Realtime aktiviert
- ✅ App läuft lokal
- ✅ Solo Game funktioniert
- ✅ Multiplayer synchronisiert
- ✅ Stripe Checkout funktioniert
- ✅ PWA installierbar (nach `npm run build`)

---

## 🚀 Deploy Checklist

Vor dem Deployment:

- [ ] Test Mode Keys funktionieren lokal
- [ ] Wechseln zu Live Mode Keys für Production
- [ ] Erstellen Sie Stripe Produkt mit realem Preis
- [ ] Verifizieren Sie Supabase Production DB
- [ ] Testen Sie alle Features

---

## 🎯 Architecture Overview

```
Tradr Game
├── Frontend: Next.js 16 + React 19 + Tailwind CSS v4
├── State: React Hooks + Context
├── Charts: Custom Canvas Renderer
├── PWA: Service Workers + IndexedDB
├── Payments: Stripe Checkout
├── Database: Supabase (PostgreSQL)
├── Realtime: Supabase Realtime
└── Hosting: Vercel (recommended)
```

---

## 🔐 Security Notes

- ✅ `.env.local` ist in `.gitignore`
- ✅ Verwenden Sie Test Keys für Entwicklung
- ✅ Niemals Secrets im Code hardcoden
- ✅ Nutzen Sie `anon` Key für Supabase (nicht `service_role`)
- ✅ HTTPS für Production (automatisch bei Vercel)

---

## 📈 Next Steps nach Launch

1. **Monitor Analytics:** Vercel Dashboard
2. **Track Payments:** Stripe Dashboard
3. **Database Activity:** Supabase Dashboard
4. **User Feedback:** Implementieren Sie Feedback-Formular
5. **Iterate:** Basierend auf User-Daten

---

## 💡 Pro Tips

### Entwicklung
- Nutzen Sie `npm run dev:lan` für Mobile Testing im lokalen Netzwerk
- PWA Features benötigen Production Build (`npm run build && npm start`)
- Stripe Test Card: 4242 4242 4242 4242

### Production
- Aktivieren Sie Stripe Live Mode erst nach Testing
- Konfigurieren Sie Stripe Webhooks für Production URL
- Monitoren Sie Supabase Database Usage
- Nutzen Sie Vercel Analytics für User Insights

### Performance
- Bilder sind optimiert via Next.js Image
- Code-Splitting ist automatisch aktiviert
- Service Worker cached statische Assets
- IndexedDB speichert Profildaten offline

---

## 🤝 Support

### Schnelle Hilfe
1. Check [`CREDENTIALS_SETUP.md`](../CREDENTIALS_SETUP.md) Troubleshooting
2. Check [`DEPLOYMENT_GUIDE.md`](../DEPLOYMENT_GUIDE.md) Common Issues
3. Check Browser DevTools Console für Errors

### Dokumentation
- **Setup:** `CREDENTIALS_SETUP.md`
- **Deployment:** `DEPLOYMENT_GUIDE.md`
- **Complete Guide:** `SETUP_COMPLETE.md`
- **PWA:** `web/docs/README.md`

### External Resources
- **Next.js Docs:** https://nextjs.org/docs
- **Stripe Docs:** https://stripe.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs

---

## 🎉 Ready to Launch?

```bash
cd web

# Setup
npm run setup           # Interactive credentials
npm run db:migrate      # Database setup
npm run dev             # Test locally

# Deploy
npm run build           # Production build
vercel --prod           # Deploy to Vercel

# Or use the complete guide:
# → ../DEPLOYMENT_GUIDE.md
```

---

**Total Setup Zeit: ~30 Minuten**  
**Deploy Zeit: ~5-10 Minuten**  
**Total bis Production: ~40 Minuten** ⚡

---

**Let's build something awesome! 🚀**

---

## 📊 What's Included

### Features
- ✅ Real-time Trading Game mit historischen Daten
- ✅ 3 AI Trading Bots (RSI, Darvas, EMA)
- ✅ Multiplayer mit Supabase Realtime
- ✅ Leaderboard & Statistics
- ✅ PWA mit Offline Support
- ✅ Stripe Payments
- ✅ Mobile Responsive
- ✅ Keyboard & Mouse Controls

### Tech Stack
- ✅ Next.js 16 (App Router)
- ✅ React 19
- ✅ TypeScript
- ✅ Tailwind CSS v4
- ✅ Stripe
- ✅ Supabase
- ✅ Service Workers
- ✅ IndexedDB

### Documentation
- ✅ 4 vollständige Setup Guides
- ✅ PWA Dokumentation (4 Dokumente)
- ✅ API Referenz
- ✅ Code Examples
- ✅ Troubleshooting Guides

---

**Viel Erfolg! 🎮**
