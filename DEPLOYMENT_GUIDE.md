# 🚀 Deployment Guide - Tradr Production

Vollständiger Guide für das Production Deployment auf **Vercel** (empfohlen) oder anderen Plattformen.

---

## 📋 Pre-Deployment Checklist

Bevor Sie deployen, stellen Sie sicher:

- ✅ **Credentials:** Alle Environment Variables aus `CREDENTIALS_SETUP.md` eingerichtet
- ✅ **Build:** Lokaler Build erfolgreich (`npm run build`)
- ✅ **Tests:** E2E Tests bestanden (optional)
- ✅ **Stripe:** Live Mode Keys bereit (wenn Sie live gehen wollen)
- ✅ **Database:** Supabase Production-Datenbank bereit

---

## 🎯 Option 1: Vercel Deployment (Empfohlen)

### Warum Vercel?
- ✅ Optimiert für Next.js
- ✅ Automatische HTTPS
- ✅ Globales CDN
- ✅ Kostenloser Hobby-Plan
- ✅ Einfache Environment Variables

### Schritt 1: Vercel Account & Projekt erstellen

1. **Gehen Sie zu:** https://vercel.com/signup
2. **Verbinden Sie** Ihr GitHub/GitLab/Bitbucket
3. **Import Project:** Klicken Sie "Add New..." → "Project"
4. **Select Repository:** Wählen Sie Ihr Tradr Repository
5. **Configure Project:**
   - **Framework Preset:** Next.js ✅ (auto-detected)
   - **Root Directory:** `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### Schritt 2: Environment Variables setzen

⚠️ **WICHTIG:** Bevor Sie deployen!

1. **Im Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Fügen Sie ALLE hinzu:**

```bash
# STRIPE (Live Mode für Production!)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...

# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# SITE (wird automatisch gesetzt, aber Sie können überschreiben)
NEXT_PUBLIC_SITE_URL=https://ihr-projekt.vercel.app
```

3. **Environment:** Wählen Sie "Production" (und optional Preview + Development)
4. **Klicken Sie:** "Save"

### Schritt 3: Deploy!

1. **Klicken Sie:** "Deploy" (oben rechts)
2. **Warten Sie** ~2-3 Minuten
3. **Öffnen Sie** die Production URL: `https://ihr-projekt.vercel.app`

### Schritt 4: Custom Domain (Optional)

1. **Settings** → **Domains**
2. **Add Domain:** z.B. `tradr.ihre-domain.com`
3. **Folgen Sie** den DNS-Anweisungen
4. **Warten Sie** auf SSL Certificate (automatisch)

### Schritt 5: Stripe Webhook konfigurieren

⚠️ **Nur für Production mit Live Keys nötig**

1. **Gehen Sie zu:** https://dashboard.stripe.com/webhooks
2. **Add endpoint:**
   ```
   URL: https://ihr-projekt.vercel.app/api/webhook
   Events to send: checkout.session.completed
   ```
3. **Reveal Signing Secret:** `whsec_...`
4. **Fügen Sie zu Vercel hinzu:**
   - Variable: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...`
5. **Redeploy** Vercel (Settings → Deployments → Latest → Redeploy)

---

## 🎯 Option 2: Railway Deployment

### Warum Railway?
- ✅ Einfaches Setup
- ✅ Automatische HTTPS
- ✅ Günstiger Preis
- ✅ Gute Performance

### Schritt 1: Railway Account erstellen

1. **Gehen Sie zu:** https://railway.app
2. **Sign up** mit GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Select:** Ihr Tradr Repository

### Schritt 2: Konfigurieren

1. **Settings:**
   - **Root Directory:** `/web`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

2. **Environment Variables:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_PRICE_ID=price_...
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   NEXT_PUBLIC_SITE_URL=https://ihr-projekt.railway.app
   ```

3. **Deploy:** Automatisch bei jedem Push

---

## 🎯 Option 3: Self-Hosted (VPS/Cloud)

### Für AWS, DigitalOcean, Hetzner, etc.

### Voraussetzungen:
- Node.js 20+
- PM2 oder ähnlicher Process Manager
- Nginx als Reverse Proxy
- SSL Certificate (Let's Encrypt)

### Deployment Steps:

#### 1. Server vorbereiten

```bash
# Node.js installieren (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 installieren
sudo npm install -g pm2

# Nginx installieren
sudo apt-get install nginx

# Certbot für SSL
sudo apt-get install certbot python3-certbot-nginx
```

#### 2. Code deployen

```bash
# Clone Repository
cd /var/www
git clone https://github.com/your/tradr.git
cd tradr/web

# Install dependencies
npm ci --production

# Environment Variables
nano .env.local
# Fügen Sie alle Variablen ein (siehe oben)

# Build
npm run build
```

#### 3. PM2 Process starten

```bash
# PM2 Ecosystem File
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tradr',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/tradr/web',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start App
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4. Nginx konfigurieren

```bash
sudo nano /etc/nginx/sites-available/tradr
```

```nginx
server {
    listen 80;
    server_name ihre-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tradr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL Certificate
sudo certbot --nginx -d ihre-domain.com
```

#### 5. Auto-Deploy Setup (Optional)

```bash
# GitHub Webhook + Auto-Deploy Script
cat > /var/www/tradr/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/tradr
git pull origin main
cd web
npm ci --production
npm run build
pm2 reload tradr
EOF

chmod +x /var/www/tradr/deploy.sh
```

---

## 🔍 Post-Deployment Checklist

Nach dem Deployment, testen Sie:

### 1. Basic Functionality
- [ ] Homepage lädt: `https://ihre-domain.com/`
- [ ] PWA installierbar (Chrome: Adressleiste → Install Icon)
- [ ] Service Worker registriert (DevTools → Application → Service Workers)

### 2. Game Features
- [ ] `/play` lädt korrekt
- [ ] Chart rendered
- [ ] Trading funktioniert (Buy/Sell/Close)
- [ ] Leaderboard Submit funktioniert
- [ ] Daten erscheinen in Supabase

### 3. Multiplayer
- [ ] `/multiplayer` lädt
- [ ] Room erstellen funktioniert
- [ ] Zwei Browser-Tabs synchronisieren
- [ ] Realtime Updates funktionieren

### 4. Stripe
- [ ] `/register` lädt
- [ ] Checkout öffnet bei "Go Pro"
- [ ] Test-Payment funktioniert (`4242 4242 4242 4242`)
- [ ] Redirect zurück zur Site nach Payment

### 5. Performance
- [ ] Lighthouse Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s

---

## 📊 Monitoring & Analytics

### Vercel Analytics (kostenlos)

Bereits integriert via `@vercel/analytics`!

1. **Vercel Dashboard** → Your Project → Analytics
2. **Sehen Sie:**
   - Page Views
   - Unique Visitors
   - Performance Scores
   - Core Web Vitals

### Stripe Dashboard

1. **Monitor Payments:** https://dashboard.stripe.com/payments
2. **Check Customers:** https://dashboard.stripe.com/customers
3. **Enable Email Receipts:** Settings → Customer emails

### Supabase Dashboard

1. **Database Activity:** https://supabase.com/dashboard/project/_/database/tables
2. **Monitor Tables:**
   - `anonymous_games` für Leaderboard
   - `multiplayer_rooms` für Rooms
3. **Set up Alerts:** Project Settings → Alerting

---

## 🐛 Common Deployment Issues

### ❌ Build fails: "Module not found"

**Lösung:**
```bash
# Lokal
cd web
rm -rf node_modules package-lock.json
npm install
npm run build

# Dann neu deployen
```

### ❌ "Internal Server Error" 500

**Problem:** Environment Variables fehlen oder falsch

**Check:**
1. Vercel: Settings → Environment Variables
2. Alle 6 Variablen gesetzt?
3. Korrekte Werte? (keine Tippfehler)
4. Redeploy nach Änderungen

### ❌ Stripe Checkout lädt nicht

**Problem:** `NEXT_PUBLIC_SITE_URL` falsch oder `STRIPE_PRICE_ID` fehlt

**Lösung:**
```bash
# Prüfen Sie in Vercel Environment Variables:
NEXT_PUBLIC_SITE_URL=https://ihr-projekt.vercel.app # Ohne trailing /
STRIPE_PRICE_ID=price_... # Muss existieren
```

### ❌ Multiplayer synchronisiert nicht

**Problem:** Realtime nicht aktiviert oder CORS Issue

**Lösung:**
1. Supabase: Database → Replication → `multiplayer_rooms` → Toggle ON
2. Warten Sie 30 Sekunden
3. Clear Browser Cache
4. Test erneut

### ❌ PWA installiert nicht

**Problem:** Manifest oder Service Worker Fehler

**Check:**
1. DevTools → Application → Manifest
2. DevTools → Application → Service Workers
3. HTTPS aktiv? (required für PWA)
4. Manifest URL: `https://ihre-domain.com/manifest.json`

---

## 🔄 CI/CD Setup (Advanced)

### GitHub Actions für automatisches Deployment

Erstellen Sie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: ./web
        run: npm ci
        
      - name: Run tests
        working-directory: ./web
        run: npm test || true
        
      - name: Build
        working-directory: ./web
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./web
```

### Secrets Setup:

1. **Vercel:** Settings → Tokens → Create Token
2. **GitHub:** Repository → Settings → Secrets → Actions
3. **Add:**
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

---

## 🔒 Security Best Practices

### Production Checklist:

- [ ] **HTTPS aktiviert** (automatisch bei Vercel/Railway)
- [ ] **Environment Variables** niemals im Code
- [ ] **Stripe Live Keys** nur in Production Environment
- [ ] **Supabase RLS** aktiviert und getestet
- [ ] **Rate Limiting** für API Routes (optional)
- [ ] **CSP Headers** konfiguriert (optional)
- [ ] **CORS** richtig konfiguriert
- [ ] **Error Tracking** eingerichtet (Sentry optional)

### Content Security Policy (Optional)

Fügen Sie zu `next.config.js` hinzu:

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  }
}
```

---

## 📈 Scaling Considerations

### Wenn Sie viel Traffic erwarten:

1. **Vercel:**
   - Pro Plan für mehr Bandwidth
   - Edge Functions für bessere Latenz
   - ISR (Incremental Static Regeneration) für statische Seiten

2. **Supabase:**
   - Pro Plan für mehr Connections
   - Connection Pooling aktivieren
   - Indizes optimieren

3. **Stripe:**
   - Webhook Retry Logic implementieren
   - Idempotency Keys verwenden
   - Rate Limits beachten

---

## ✅ Success Criteria

Ihr Deployment ist erfolgreich, wenn:

- ✅ **Site läuft** unter Production URL
- ✅ **HTTPS aktiviert** und Zertifikat gültig
- ✅ **PWA installierbar** auf Mobile + Desktop
- ✅ **Stripe Checkout** funktioniert
- ✅ **Multiplayer** synchronisiert in Realtime
- ✅ **Leaderboard** speichert Scores
- ✅ **Analytics** trackt Visitors
- ✅ **Performance** > 90 Lighthouse Score

---

## 🎉 Go Live Checklist

Finale Schritte vor dem Launch:

1. **Domain:**
   - [ ] Custom Domain konfiguriert
   - [ ] SSL Certificate aktiv
   - [ ] DNS propagated (check mit `dig`)

2. **SEO:**
   - [ ] Meta Tags gesetzt
   - [ ] OG Images vorhanden
   - [ ] Sitemap.xml generiert
   - [ ] robots.txt konfiguriert

3. **Social:**
   - [ ] Twitter Card Preview funktioniert
   - [ ] Facebook OG Preview funktioniert
   - [ ] LinkedIn Preview funktioniert

4. **Marketing:**
   - [ ] Google Analytics (optional)
   - [ ] Plausible Analytics (optional)
   - [ ] Mixpanel Events (optional)

5. **Support:**
   - [ ] Fehler-Tracking (Sentry optional)
   - [ ] User Feedback Mechanism
   - [ ] Help/FAQ Page

---

## 📞 Support & Resources

### Vercel:
- **Docs:** https://vercel.com/docs
- **Support:** https://vercel.com/support
- **Status:** https://www.vercel-status.com

### Next.js:
- **Docs:** https://nextjs.org/docs
- **Deployment:** https://nextjs.org/docs/deployment

### Community:
- **Vercel Discord:** https://vercel.com/discord
- **Next.js Discussions:** https://github.com/vercel/next.js/discussions

---

## 🚀 Ready to Deploy?

### Quick Deploy Command (Vercel CLI):

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from web/ directory)
cd web
vercel --prod

# Follow prompts
# Enter environment variables when asked
```

---

**Viel Erfolg mit Ihrem Deployment! 🎉**

Nach erfolgreichem Deployment:
1. Testen Sie alle Features in Production
2. Monitoren Sie Analytics
3. Sammeln Sie User Feedback
4. Iterieren Sie basierend auf Daten

**Let's go live! 🚀**
