#!/usr/bin/env node

/**
 * Interactive Credentials Setup Script für Tradr
 * 
 * Dieser Script hilft Ihnen, .env.local interaktiv zu erstellen
 * mit allen benötigten Environment Variables.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.local');
const examplePath = join(root, '.env.local.example');

// Colors für Terminal Output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Header
console.log('\n' + c('cyan', '═'.repeat(70)));
console.log(c('bright', '🔐 Tradr - Interactive Credentials Setup'));
console.log(c('cyan', '═'.repeat(70)) + '\n');

// Check if .env.local already exists
if (existsSync(envPath)) {
  console.log(c('yellow', '⚠️  .env.local existiert bereits!'));
  console.log(c('yellow', '   Dieser Script wird die Datei ÜBERSCHREIBEN.\n'));
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const continueSetup = await new Promise((resolve) => {
    rl.question(c('bright', 'Fortfahren? (y/N): '), (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
  
  if (!continueSetup) {
    console.log(c('red', '\n❌ Setup abgebrochen.\n'));
    process.exit(0);
  }
  console.log();
}

// Helper für interaktive Eingabe
function ask(question, defaultValue = '') {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const prompt = defaultValue 
      ? `${question} ${c('blue', `[${defaultValue}]`)}: `
      : `${question}: `;
    
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Sammle alle Credentials
const credentials = {};

console.log(c('bright', '📦 SCHRITT 1: STRIPE CONFIGURATION\n'));
console.log(c('blue', '   Wo zu finden: https://dashboard.stripe.com/apikeys\n'));

// Stripe Secret Key
credentials.STRIPE_SECRET_KEY = await ask(
  c('bright', '   Stripe Secret Key (sk_test_... oder sk_live_...)')
);

// Stripe Publishable Key
const defaultPubKey = 'pk_live_51N99JsEfawZzu7YhUbVYGDBYUk77WbVsVWvBEYU0DNP6uQcuNiwqGnlVT7YWJ69svRG8LqcWI01HnYLLVacfuYou00Toq24xNF';
credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = await ask(
  c('bright', '   Stripe Publishable Key (pk_test_... oder pk_live_...)'),
  defaultPubKey
);

// Stripe Price ID
credentials.STRIPE_PRICE_ID = await ask(
  c('bright', '   Stripe Price ID (price_...)')
);

console.log(c('green', '\n   ✅ Stripe konfiguriert\n'));

console.log(c('bright', '📦 SCHRITT 2: SUPABASE CONFIGURATION\n'));
console.log(c('blue', '   Wo zu finden: https://supabase.com/dashboard/project/_/settings/api\n'));

// Supabase URL
credentials.NEXT_PUBLIC_SUPABASE_URL = await ask(
  c('bright', '   Supabase Project URL (https://xxxxx.supabase.co)')
);

// Supabase Anon Key
credentials.NEXT_PUBLIC_SUPABASE_ANON_KEY = await ask(
  c('bright', '   Supabase Anon Key (eyJhbGci...)')
);

console.log(c('green', '\n   ✅ Supabase konfiguriert\n'));

console.log(c('bright', '📦 SCHRITT 3: SITE CONFIGURATION\n'));

// Site URL
const isProduction = credentials.STRIPE_SECRET_KEY?.startsWith('sk_live');
const defaultSiteUrl = isProduction 
  ? 'https://ihre-domain.com' 
  : 'http://localhost:3000';

credentials.NEXT_PUBLIC_SITE_URL = await ask(
  c('bright', '   Site URL (für Stripe Redirects)'),
  defaultSiteUrl
);

console.log(c('green', '\n   ✅ Site konfiguriert\n'));

// Validierung
console.log(c('cyan', '═'.repeat(70)));
console.log(c('bright', '🔍 VALIDIERUNG\n'));

const errors = [];

if (!credentials.STRIPE_SECRET_KEY) {
  errors.push('❌ STRIPE_SECRET_KEY fehlt');
} else if (!credentials.STRIPE_SECRET_KEY.startsWith('sk_')) {
  errors.push('⚠️  STRIPE_SECRET_KEY sollte mit "sk_" beginnen');
}

if (!credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  errors.push('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY fehlt');
} else if (!credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
  errors.push('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY sollte mit "pk_" beginnen');
}

if (!credentials.STRIPE_PRICE_ID) {
  errors.push('❌ STRIPE_PRICE_ID fehlt');
} else if (!credentials.STRIPE_PRICE_ID.startsWith('price_')) {
  errors.push('⚠️  STRIPE_PRICE_ID sollte mit "price_" beginnen');
}

if (!credentials.NEXT_PUBLIC_SUPABASE_URL) {
  errors.push('❌ NEXT_PUBLIC_SUPABASE_URL fehlt');
} else if (!credentials.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
  errors.push('⚠️  NEXT_PUBLIC_SUPABASE_URL sollte mit "https://" beginnen');
}

if (!credentials.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  errors.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt');
}

if (!credentials.NEXT_PUBLIC_SITE_URL) {
  errors.push('❌ NEXT_PUBLIC_SITE_URL fehlt');
}

// Mode Detection
const testMode = credentials.STRIPE_SECRET_KEY?.startsWith('sk_test');
const liveMode = credentials.STRIPE_SECRET_KEY?.startsWith('sk_live');
const pubKeyTestMode = credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test');
const pubKeyLiveMode = credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live');

if (testMode && !pubKeyTestMode) {
  errors.push('⚠️  Stripe Mode mismatch: Secret ist Test, aber Publishable ist nicht Test');
}

if (liveMode && !pubKeyLiveMode) {
  errors.push('⚠️  Stripe Mode mismatch: Secret ist Live, aber Publishable ist nicht Live');
}

if (errors.length > 0) {
  console.log(c('red', '⚠️  Validierungs-Warnungen:\n'));
  errors.forEach(err => console.log(c('yellow', `   ${err}`)));
  console.log();
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const proceed = await new Promise((resolve) => {
    rl.question(c('bright', 'Trotzdem fortfahren? (y/N): '), (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
  
  if (!proceed) {
    console.log(c('red', '\n❌ Setup abgebrochen.\n'));
    process.exit(0);
  }
  console.log();
} else {
  console.log(c('green', '   ✅ Alle Werte valide\n'));
}

// Zusammenfassung
console.log(c('cyan', '═'.repeat(70)));
console.log(c('bright', '📋 ZUSAMMENFASSUNG\n'));

console.log(c('bright', '   Stripe:'));
console.log(`      Mode: ${testMode ? c('yellow', 'TEST MODE') : liveMode ? c('green', 'LIVE MODE') : c('red', 'UNKNOWN')}`);
console.log(`      Secret Key: ${credentials.STRIPE_SECRET_KEY?.slice(0, 15)}...`);
console.log(`      Publishable Key: ${credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.slice(0, 15)}...`);
console.log(`      Price ID: ${credentials.STRIPE_PRICE_ID}`);

console.log(c('bright', '\n   Supabase:'));
console.log(`      URL: ${credentials.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`      Anon Key: ${credentials.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 30)}...`);

console.log(c('bright', '\n   Site:'));
console.log(`      URL: ${credentials.NEXT_PUBLIC_SITE_URL}`);
console.log();

// Generiere .env.local Content
const envContent = `# =============================================================================
# TRADR - Environment Variables
# =============================================================================
# Generiert von setup-credentials.mjs am ${new Date().toISOString()}
# =============================================================================

# -----------------------------------------------------------------------------
# STRIPE CONFIGURATION
# -----------------------------------------------------------------------------
STRIPE_SECRET_KEY=${credentials.STRIPE_SECRET_KEY}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${credentials.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
STRIPE_PRICE_ID=${credentials.STRIPE_PRICE_ID}

# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=${credentials.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${credentials.NEXT_PUBLIC_SUPABASE_ANON_KEY}

# -----------------------------------------------------------------------------
# SITE CONFIGURATION
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SITE_URL=${credentials.NEXT_PUBLIC_SITE_URL}

# =============================================================================
# NOTES
# =============================================================================
# - Mode: ${testMode ? 'TEST MODE (für Entwicklung)' : liveMode ? 'LIVE MODE (Production)' : 'Unknown'}
# - Test Card: 4242 4242 4242 4242 (nur im Test Mode)
# - Diese Datei ist in .gitignore - NIE committen!
# =============================================================================
`;

// Schreibe .env.local
try {
  writeFileSync(envPath, envContent, 'utf8');
  console.log(c('green', '✅ .env.local erfolgreich erstellt!\n'));
} catch (error) {
  console.log(c('red', `❌ Fehler beim Schreiben von .env.local: ${error.message}\n`));
  process.exit(1);
}

// Next Steps
console.log(c('cyan', '═'.repeat(70)));
console.log(c('bright', '🚀 NÄCHSTE SCHRITTE\n'));

console.log(c('bright', '1. Database Migration ausführen:'));
console.log(c('blue', '   npm run db:migrate\n'));

console.log(c('bright', '2. Development Server starten:'));
console.log(c('blue', '   npm run dev\n'));

console.log(c('bright', '3. Testen Sie:'));
console.log(c('blue', '   - http://localhost:3000/play (Solo Game)'));
console.log(c('blue', '   - http://localhost:3000/multiplayer (Multiplayer)'));
console.log(c('blue', '   - http://localhost:3000/register (Stripe Checkout)\n'));

console.log(c('bright', '4. Production Build:'));
console.log(c('blue', '   npm run build'));
console.log(c('blue', '   npm start\n'));

console.log(c('bright', '5. Deployment:'));
console.log(c('blue', '   Siehe: ../DEPLOYMENT_GUIDE.md\n'));

console.log(c('cyan', '═'.repeat(70)));
console.log(c('green', '\n🎉 Setup abgeschlossen! Viel Erfolg!\n'));

// Warnings am Ende
if (testMode) {
  console.log(c('yellow', '⚠️  TEST MODE aktiviert - Nutzen Sie Stripe Testkarten:'));
  console.log(c('yellow', '   Card: 4242 4242 4242 4242'));
  console.log(c('yellow', '   Exp: Beliebiges zukünftiges Datum'));
  console.log(c('yellow', '   CVC: Beliebige 3 Ziffern\n'));
}

if (liveMode) {
  console.log(c('red', '⚠️  LIVE MODE aktiviert - Echte Zahlungen werden verarbeitet!'));
  console.log(c('red', '   Stellen Sie sicher, dass Stripe Webhooks konfiguriert sind.\n'));
}
