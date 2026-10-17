# PWA Quick Start Guide

## 🚀 Schnellstart für Entwickler

### 1. Development Server starten

```bash
cd web
npm install
npm run dev
```

**Wichtig:** Service Worker funktionieren nur über HTTPS oder `localhost`!

### 2. PWA lokal testen

#### Build-Modus (empfohlen für PWA-Tests):
```bash
npm run build
npm start
```

Die App läuft auf `http://localhost:3000`

#### Im Browser testen:

**Chrome DevTools:**
1. Öffne DevTools (F12)
2. Application Tab
3. Service Workers → Prüfe Registration
4. Storage → IndexedDB → `tradr-game-db`
5. Cache Storage → Prüfe Caches

**Offline-Modus simulieren:**
1. DevTools → Network Tab
2. Dropdown "No throttling" → "Offline"
3. Seite neu laden
4. Spiel sollte weiterhin funktionieren! ✅

### 3. Installation testen

#### Desktop (Chrome/Edge):
1. Öffne `http://localhost:3000`
2. Nach wenigen Sekunden erscheint Install-Banner
3. Klicke "Installieren"
4. App öffnet sich in neuem Fenster

**Manuell installieren:**
- Chrome: Adressleiste → ⊕ Symbol
- Edge: ... Menü → Apps → App installieren

#### Mobile Testing:

**Android (Chrome):**
```bash
# Expose dev server to local network
npm run dev:lan

# Oder production:
npm run build && npm run start:lan
```

1. Öffne auf Handy: `http://[YOUR-IP]:3000`
2. Chrome: ... → "Zum Startbildschirm hinzufügen"

**iOS (Safari):**
1. Öffne in Safari
2. Teilen-Button → "Zum Home-Bildschirm"

## 📱 Features testen

### Offline-Spiel

1. Öffne die App online
2. Spiele ein paar Runden (Daten werden gecacht)
3. Aktiviere Offline-Modus (DevTools oder Flugmodus)
4. Navigiere zu `/play`
5. Starte Solo-Spiel
6. ✅ Sollte funktionieren!

**Was du sehen solltest:**
- Gelbes "Offline-Modus" Banner unten
- Kleiner "Offline" Indikator oben rechts
- Spiel lädt und funktioniert normal

### Daten-Caching testen

```javascript
// In Browser Console:

// Prüfe ob IndexedDB funktioniert
indexedDB.databases().then(dbs => console.log(dbs))

// Prüfe Service Worker Status
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))

// Prüfe Caches
caches.keys().then(keys => console.log(keys))
```

### Profil-Synchronisation testen

```javascript
// In Browser Console:

// Import der Offline Storage
const { offlineStorage } = await import('/src/lib/pwa/offline-storage.ts')

// Gespeicherte Daten anzeigen
await offlineStorage.exportData()

// Profil manuell synchronisieren
const { offlineSync } = await import('/src/lib/pwa/offline-sync.ts')
await offlineSync.syncProfile()
```

## 🧪 Test-Szenarien

### Szenario 1: Erstbesuch
1. Leere Cache und Storage (DevTools → Application → Clear storage)
2. Lade Seite neu
3. Service Worker registriert sich
4. Daten werden im Hintergrund gecacht
5. Install-Prompt erscheint nach ~5 Sekunden

### Szenario 2: Wiederkehrender Besucher
1. Seite bereits besucht
2. Service Worker ist aktiv
3. Seite lädt instant (aus Cache)
4. Daten werden im Hintergrund aktualisiert

### Szenario 3: Offline-Modus
1. Normaler Besuch online
2. Spiele ein paar Runden
3. Gehe offline
4. Navigiere durch App
5. Starte neues Spiel
6. ✅ Alles funktioniert

### Szenario 4: Update verfügbar
1. App ist installiert und läuft
2. Neue Version wird deployed
3. Service Worker erkennt Update
4. Blaues "Update verfügbar" Banner erscheint
5. Klick auf "Aktualisieren"
6. Page reloadet mit neuer Version

## 🐛 Debugging

### Service Worker registriert sich nicht

```bash
# Prüfe ob über HTTPS/localhost:
console.log(location.protocol) # Sollte "http:" oder "https:" sein

# Prüfe ob Service Worker verfügbar:
console.log('serviceWorker' in navigator)

# Prüfe Registrierung:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registrierungen:', regs)
})
```

### Cache wird nicht aktualisiert

```javascript
// Cache manuell löschen:
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key))
  console.log('Alle Caches gelöscht')
})

// Service Worker neu registrieren:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
  location.reload()
})
```

### IndexedDB Fehler

```javascript
// Prüfe ob IndexedDB verfügbar:
console.log('indexedDB' in window)

// Prüfe Quota:
navigator.storage.estimate().then(estimate => {
  const used = (estimate.usage / 1024 / 1024).toFixed(2)
  const quota = (estimate.quota / 1024 / 1024).toFixed(2)
  console.log(`Storage: ${used} MB / ${quota} MB`)
})

// DB manuell löschen:
indexedDB.deleteDatabase('tradr-game-db')
```

## 📊 Performance Monitoring

### Network Requests prüfen

```javascript
// In Service Worker Console:
self.addEventListener('fetch', (event) => {
  console.log('[SW] Fetch:', event.request.url, {
    mode: event.request.mode,
    cache: event.request.cache
  })
})
```

### Cache Hit Rate messen

```javascript
let cacheHits = 0
let cacheMisses = 0

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        cacheHits++
        console.log(`Cache Hit Rate: ${(cacheHits/(cacheHits+cacheMisses)*100).toFixed(1)}%`)
      } else {
        cacheMisses++
      }
      return response || fetch(event.request)
    })
  )
})
```

## 🔧 Entwicklungs-Tipps

### Hard Refresh während Development
- Chrome/Edge: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
- Oder: DevTools → Network → "Disable cache" aktivieren

### Service Worker Updates forcen
```javascript
// In Console:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.update())
})
```

### Bypass Service Worker
- DevTools → Application → Service Workers → "Bypass for network"
- Oder: DevTools → Network → "Bypass for network"

## 📝 Checkliste für Production

Vor dem Deployment:

- [ ] `CACHE_NAME` Version in `sw.js` erhöht?
- [ ] Alle kritischen Routes im Cache?
- [ ] Service Worker auf Fehler getestet?
- [ ] Offline-Modus funktioniert?
- [ ] Update-Mechanismus getestet?
- [ ] Icons für alle Plattformen vorhanden?
- [ ] Manifest.json korrekt?
- [ ] HTTPS aktiviert?

## 🎯 Nützliche Links

- [PWA Dokumentation](./PWA.md)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 💡 Quick Fixes

### "Failed to register service worker"
→ Prüfe ob über HTTPS/localhost  
→ Prüfe ob `/sw.js` erreichbar ist  
→ Prüfe Browser Console auf Syntax-Fehler

### "QuotaExceededError"
→ Speicher voll, alte Daten löschen:
```javascript
await offlineStorage.clearOldData(7) // Älter als 7 Tage
```

### Install-Prompt erscheint nicht
→ Warte 30 Sekunden nach Page Load  
→ Prüfe ob bereits installiert  
→ Chrome Flags: `chrome://flags/#bypass-app-banner-engagement-checks`
