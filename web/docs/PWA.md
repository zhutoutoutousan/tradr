# PWA (Progressive Web App) Funktionalität

Dieses Dokument beschreibt die PWA-Implementierung der Tradr-Game-Anwendung, die vollständige Offline-Unterstützung bietet.

## Features

### 1. **Offline-Funktionalität**
- Vollständige Spielbarkeit ohne Internetverbindung
- Automatisches Caching von Spieldaten und Assets
- Service Worker für intelligentes Caching
- IndexedDB für persistente Datenspeicherung

### 2. **Installierbarkeit**
- App kann auf dem Home-Screen installiert werden (iOS/Android)
- Standalone-Modus ohne Browser-UI
- Native App-ähnliches Erlebnis

### 3. **Automatische Updates**
- Service Worker erkennt neue Versionen automatisch
- Benutzerfreundliche Update-Benachrichtigung
- Nahtlose Aktualisierung ohne Datenverlust

### 4. **Daten-Synchronisation**
- Automatische Synchronisation von Spielprofilen
- Lokale Speicherung von Spiel-Historie
- Export/Import-Funktionalität für Daten

## Architektur

### Service Worker (`/public/sw.js`)
Der Service Worker implementiert drei Cache-Strategien:

1. **Static Assets Cache** - HTML, CSS, JS, Icons
2. **Data Cache** - Marktdaten (JSON)
3. **Runtime Cache** - Dynamisch geladene Ressourcen

#### Cache-Strategien:
- **Stale-While-Revalidate** für Marktdaten: Schnelle Antwort mit Cache, Update im Hintergrund
- **Cache-First** für statische Assets: Maximale Performance
- **Network-First** für Seiten: Immer aktuell wenn online

### Offline Storage (`/src/lib/pwa/offline-storage.ts`)
IndexedDB-basierte Speicherung mit drei Object Stores:

1. **gameStates** - Aktive Spielzustände
2. **gameHistory** - Abgeschlossene Spiele
3. **cachedData** - Marktdaten und Profil-Backups

#### API:
```typescript
// Spielstand speichern
await offlineStorage.saveGameState(id, state);

// Spielstand laden
const state = await offlineStorage.getGameState(id);

// Spiel-Historie speichern
await offlineStorage.saveGameHistory({
  timestamp: Date.now(),
  score: 1000,
  symbol: 'AAPL',
  result: {...}
});

// Daten cachen
await offlineStorage.cacheData('market-data-AAPL', data);
```

### Offline Sync (`/src/lib/pwa/offline-sync.ts`)
Automatische Synchronisation zwischen localStorage und IndexedDB:

- Auto-Sync alle 5 Sekunden
- Sync bei Page Unload
- Sync bei Visibility Change

#### API:
```typescript
import { offlineSync, startOfflineSync } from '@/lib/pwa/offline-sync';

// Auto-Sync starten
startOfflineSync();

// Profil manuell synchronisieren
await offlineSync.syncProfile();

// Daten exportieren
const exportData = await offlineSync.exportAllData();
```

### Hooks

#### `useOnlineStatus()`
Erkennt Online/Offline-Status:
```typescript
const isOnline = useOnlineStatus();
```

#### `usePWAInstall()`
PWA-Installation verwalten:
```typescript
const { canInstall, isInstalled, isStandalone, promptInstall } = usePWAInstall();

if (canInstall) {
  await promptInstall();
}
```

## Offline-Modus Features

### Was funktioniert offline:
✅ Solo-Spiel mit synthetischen Märkten  
✅ Solo-Spiel mit gecachten historischen Daten  
✅ Profil-Verwaltung (ELO, Achievements)  
✅ Spiel-Historie einsehen  
✅ App-Navigation  
✅ Tutorial und Hilfe  

### Was erfordert Online-Verbindung:
❌ Multiplayer-Spiele  
❌ Community-Replays  
❌ Neue historische Marktdaten laden  
❌ Leaderboard-Updates  

## Benutzer-Benachrichtigungen

Die App zeigt automatisch Benachrichtigungen für:

1. **Offline-Status**: Gelbe Banner unten wenn keine Verbindung
2. **Update verfügbar**: Blaues Banner oben mit "Aktualisieren"-Button
3. **Installation verfügbar**: Dunkles Banner oben mit "Installieren"-Button

## Installation auf Geräten

### iOS (Safari):
1. Öffne die App in Safari
2. Tippe auf das "Teilen"-Symbol
3. Wähle "Zum Home-Bildschirm"
4. Benenne die App und bestätige

### Android (Chrome):
1. Öffne die App in Chrome
2. Tippe auf das Menü (⋮)
3. Wähle "App installieren" oder "Zum Startbildschirm hinzufügen"
4. Bestätige die Installation

### Desktop (Chrome/Edge):
1. Öffne die App im Browser
2. Klicke auf das Install-Symbol in der Adressleiste (+)
3. Bestätige die Installation

## Entwicklung

### Service Worker lokal testen:
```bash
npm run build
npm run start
```

Service Worker funktionieren nur über HTTPS oder localhost!

### Cache aktualisieren:
1. Erhöhe die Version in `CACHE_NAME` in `/public/sw.js`
2. Build und Deploy
3. Der alte Cache wird automatisch gelöscht

### Debugging:
- Chrome DevTools → Application → Service Workers
- Chrome DevTools → Application → Storage → IndexedDB
- Chrome DevTools → Application → Cache Storage

### Cache leeren (Entwicklung):
```javascript
// In der Browser-Konsole:
caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
```

## Sicherheit & Privacy

- Alle Daten werden nur lokal gespeichert
- Kein automatisches Tracking offline
- Profile können jederzeit exportiert und gelöscht werden
- Service Worker kann deaktiviert werden

## Performance

### Cache-Größen (geschätzt):
- Static Assets: ~5 MB
- Marktdaten: ~2 MB (alle Symbole)
- Spiel-Historie: ~1 MB (100 Spiele)
- **Total: ~8 MB**

### Offline-First-Benefits:
- Sofortiges Laden der App
- Keine Ladezeiten für gecachte Daten
- Spielbar in Tunnels, Flugzeugen, etc.
- Reduzierter Datenverbrauch

## Browser-Support

| Browser | PWA Install | Service Worker | IndexedDB |
|---------|------------|----------------|-----------|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅ |
| Firefox 90+ | ⚠️ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ |

⚠️ Firefox unterstützt PWA-Installation nur auf Android

## Troubleshooting

### Service Worker registriert sich nicht:
- Prüfe, ob die App über HTTPS läuft (oder localhost)
- Prüfe Browser-Konsole auf Fehler
- Stelle sicher, dass `/public/sw.js` erreichbar ist

### Cache wird nicht aktualisiert:
- Erhöhe `CACHE_NAME` Version
- Lösche manuell alte Caches in DevTools
- Hard Refresh (Ctrl+Shift+R)

### IndexedDB Fehler:
- Prüfe ob genug Speicher verfügbar ist
- Prüfe Browser Privacy-Einstellungen
- Safari: Deaktiviere "Cross-Site Tracking verhindern" für die Domain

### Offline-Modus funktioniert nicht:
- Öffne DevTools → Network → Setze "Offline"
- Prüfe ob Service Worker "Activated" ist
- Prüfe Cache Storage auf gespeicherte Ressourcen

## Zukünftige Erweiterungen

Mögliche Verbesserungen:
- [ ] Background Sync für Multiplayer-Aktionen
- [ ] Push Notifications für Challenges
- [ ] Periodic Background Sync für Marktdaten
- [ ] Web Share API für Ergebnisse
- [ ] File System Access API für Daten-Export
