# PWA Integration Examples

Praktische Beispiele zur Integration der PWA-Funktionen in Spiel-Komponenten.

## 1. Offline-Status in Komponenten anzeigen

### Basic Offline Indicator

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function GameHeader() {
  const isOnline = useOnlineStatus();
  
  return (
    <header>
      <h1>Tradr Game</h1>
      {!isOnline && (
        <span className="offline-badge">
          🔌 Offline-Modus
        </span>
      )}
    </header>
  );
}
```

### Offline-Warning beim Multiplayer

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function MultiplayerLobby() {
  const isOnline = useOnlineStatus();
  
  if (!isOnline) {
    return (
      <div className="offline-warning">
        <h2>Offline</h2>
        <p>Multiplayer benötigt eine Internet-Verbindung.</p>
        <p>Probiere stattdessen den Solo-Modus!</p>
      </div>
    );
  }
  
  return <MultiplayerGame />;
}
```

## 2. Spielstand offline speichern

### Auto-Save während des Spiels

```tsx
import { useEffect } from 'react';
import { offlineStorage } from '@/lib/pwa/offline-storage';

export function useGameAutoSave(gameState: GameState, gameId: string) {
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      try {
        await offlineStorage.saveGameState(gameId, gameState);
        console.log('[AutoSave] Game state saved');
      } catch (error) {
        console.error('[AutoSave] Failed:', error);
      }
    }, 10000); // Alle 10 Sekunden
    
    return () => clearInterval(saveInterval);
  }, [gameState, gameId]);
}

// Verwendung:
function GameComponent() {
  const [gameState, setGameState] = useState(initialState);
  const gameId = useGameId();
  
  useGameAutoSave(gameState, gameId);
  
  return <Game state={gameState} />;
}
```

### Spielstand wiederherstellen

```tsx
import { useEffect, useState } from 'react';
import { offlineStorage } from '@/lib/pwa/offline-storage';

export function useRestoreGameState(gameId: string) {
  const [restoredState, setRestoredState] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function restore() {
      try {
        const state = await offlineStorage.getGameState(gameId);
        if (state) {
          setRestoredState(state);
          console.log('[Restore] Game state restored');
        }
      } catch (error) {
        console.error('[Restore] Failed:', error);
      } finally {
        setLoading(false);
      }
    }
    
    restore();
  }, [gameId]);
  
  return { restoredState, loading };
}

// Verwendung:
function GameResume() {
  const gameId = 'current-game';
  const { restoredState, loading } = useRestoreGameState(gameId);
  
  if (loading) return <Loading />;
  
  if (restoredState) {
    return (
      <div>
        <h2>Möchtest du dein letztes Spiel fortsetzen?</h2>
        <button onClick={() => continueGame(restoredState)}>
          Fortsetzen
        </button>
        <button onClick={() => startNewGame()}>
          Neu starten
        </button>
      </div>
    );
  }
  
  return <NewGame />;
}
```

## 3. Spiel-Historie speichern

### Historie nach Spiel speichern

```tsx
import { offlineStorage } from '@/lib/pwa/offline-storage';

export async function saveGameResult(result: GameResult) {
  try {
    const historyId = await offlineStorage.saveGameHistory({
      timestamp: Date.now(),
      score: result.finalBalance,
      symbol: result.symbol,
      result: {
        profit: result.profit,
        returnPct: result.returnPct,
        trades: result.trades,
        rank: result.rank
      }
    });
    
    console.log('[History] Saved with ID:', historyId);
    return historyId;
  } catch (error) {
    console.error('[History] Save failed:', error);
    return null;
  }
}

// Verwendung nach Spiel:
function GameOver({ result }: { result: GameResult }) {
  useEffect(() => {
    saveGameResult(result);
  }, [result]);
  
  return <GameOverScreen result={result} />;
}
```

### Historie anzeigen

```tsx
import { useEffect, useState } from 'react';
import { offlineStorage } from '@/lib/pwa/offline-storage';

export function GameHistoryList() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadHistory() {
      try {
        const games = await offlineStorage.getGameHistory(20);
        setHistory(games);
      } catch (error) {
        console.error('[History] Load failed:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadHistory();
  }, []);
  
  if (loading) return <Loading />;
  
  return (
    <div className="history-list">
      <h2>Letzte Spiele</h2>
      {history.map(game => (
        <div key={game.id} className="history-item">
          <span>{game.symbol}</span>
          <span>{game.score}</span>
          <span>{new Date(game.timestamp).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}
```

## 4. Marktdaten offline laden

### Fallback zu gecachten Daten

```tsx
import { getCachedMarketData } from '@/lib/pwa/precache-data';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export async function loadMarketData(symbol: string): Promise<Candle[]> {
  const isOnline = navigator.onLine;
  
  try {
    if (isOnline) {
      const response = await fetch(`/data/${symbol}.json`);
      if (!response.ok) throw new Error('Network error');
      return await response.json();
    }
  } catch (error) {
    console.log('[Market] Falling back to cache');
  }
  
  // Fallback zu gecachten Daten
  const cached = await getCachedMarketData(symbol);
  if (cached) {
    console.log('[Market] Using cached data for', symbol);
    return cached;
  }
  
  throw new Error('No data available offline');
}

// Verwendung in Komponente:
function MarketChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Candle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    loadMarketData(symbol)
      .then(setData)
      .catch(err => {
        setError(isOnline 
          ? 'Fehler beim Laden der Daten'
          : 'Keine Offline-Daten verfügbar'
        );
      });
  }, [symbol, isOnline]);
  
  if (error) return <Error message={error} />;
  if (!data.length) return <Loading />;
  
  return <Chart data={data} />;
}
```

## 5. PWA Installation promoten

### Install-Button in UI

```tsx
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallButton() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  
  if (isInstalled) {
    return (
      <div className="installed-badge">
        ✓ Als App installiert
      </div>
    );
  }
  
  if (!canInstall) {
    return null;
  }
  
  return (
    <button 
      onClick={promptInstall}
      className="install-button"
    >
      📱 App installieren
    </button>
  );
}
```

### Install-Promotion Banner

```tsx
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export function InstallPromotion() {
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  
  if (!canInstall || dismissed) return null;
  
  return (
    <div className="install-promo">
      <div className="promo-content">
        <h3>📱 Tradr als App installieren</h3>
        <p>Spielen Sie offline, schnellerer Start, natives App-Gefühl!</p>
        <div className="promo-actions">
          <button onClick={promptInstall}>
            Jetzt installieren
          </button>
          <button onClick={() => setDismissed(true)}>
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 6. Service Worker Updates handhaben

### Update-Banner mit Reload

```tsx
import { useServiceWorkerUpdate } from '@/lib/pwa/sw-register';

export function UpdateNotification() {
  const { isUpdateAvailable, skipWaiting } = useServiceWorkerUpdate();
  
  if (!isUpdateAvailable) return null;
  
  return (
    <div className="update-banner">
      <span>🎉 Neue Version verfügbar!</span>
      <button onClick={skipWaiting}>
        Jetzt aktualisieren
      </button>
    </div>
  );
}
```

## 7. Daten exportieren

### Export-Button für Backup

```tsx
import { offlineSync } from '@/lib/pwa/offline-sync';

export function DataExportButton() {
  const [exporting, setExporting] = useState(false);
  
  async function handleExport() {
    setExporting(true);
    
    try {
      const data = await offlineSync.exportAllData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradr-backup-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      console.log('[Export] Success');
    } catch (error) {
      console.error('[Export] Failed:', error);
      alert('Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  }
  
  return (
    <button 
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? '⏳ Exportiere...' : '💾 Daten exportieren'}
    </button>
  );
}
```

## 8. Complete Game Component Beispiel

### Vollständige Integration

```tsx
import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { offlineStorage } from '@/lib/pwa/offline-storage';
import { loadMarketData } from '@/lib/game/market';

export function OfflineAwareGame() {
  const isOnline = useOnlineStatus();
  const { canInstall, promptInstall } = usePWAInstall();
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Spielstand beim Start wiederherstellen
  useEffect(() => {
    async function init() {
      try {
        const saved = await offlineStorage.getGameState('active-game');
        if (saved) {
          setGameState(saved);
        } else {
          setGameState(createNewGame());
        }
      } catch (error) {
        console.error('Init failed:', error);
        setGameState(createNewGame());
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, []);
  
  // Auto-Save
  useEffect(() => {
    if (!gameState) return;
    
    const saveInterval = setInterval(async () => {
      await offlineStorage.saveGameState('active-game', gameState);
    }, 10000);
    
    return () => clearInterval(saveInterval);
  }, [gameState]);
  
  // Speichern beim Schließen
  useEffect(() => {
    const handleUnload = () => {
      if (gameState) {
        offlineStorage.saveGameState('active-game', gameState);
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [gameState]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="game-container">
      {/* Status-Indikatoren */}
      <div className="status-bar">
        {!isOnline && (
          <span className="offline">🔌 Offline</span>
        )}
        {canInstall && (
          <button onClick={promptInstall} className="mini-install">
            📱
          </button>
        )}
      </div>
      
      {/* Hauptspiel */}
      <GameView 
        state={gameState}
        onStateChange={setGameState}
        isOnline={isOnline}
      />
      
      {/* Warnung wenn offline und Multiplayer */}
      {!isOnline && gameState?.mode === 'multiplayer' && (
        <div className="warning">
          Multiplayer benötigt Internet-Verbindung
        </div>
      )}
    </div>
  );
}
```

## 9. Performance-Optimierungen

### Lazy Loading von PWA Features

```tsx
import { lazy, Suspense } from 'react';

const PWAProvider = lazy(() => import('@/components/PWAProvider'));

export function App() {
  return (
    <Suspense fallback={null}>
      <PWAProvider>
        <YourApp />
      </PWAProvider>
    </Suspense>
  );
}
```

### Conditional Import

```tsx
// Nur laden wenn PWA-Features unterstützt werden
async function initPWA() {
  if ('serviceWorker' in navigator) {
    const { registerServiceWorker } = await import('@/lib/pwa/sw-register');
    await registerServiceWorker();
  }
}
```

## 10. Testing

### Mock für Tests

```tsx
// __mocks__/pwa.ts
export const mockUseOnlineStatus = jest.fn(() => true);
export const mockUsePWAInstall = jest.fn(() => ({
  canInstall: false,
  isInstalled: true,
  promptInstall: jest.fn()
}));

// Verwendung in Tests:
jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockUseOnlineStatus()
}));

test('shows offline warning when offline', () => {
  mockUseOnlineStatus.mockReturnValue(false);
  
  render(<GameComponent />);
  
  expect(screen.getByText(/offline/i)).toBeInTheDocument();
});
```

## Best Practices

1. **Graceful Degradation**: App muss auch ohne PWA-Features funktionieren
2. **Progressive Enhancement**: PWA-Features sind ein Plus, kein Muss
3. **Feedback geben**: User über Offline-Status und Cache-Updates informieren
4. **Fehler behandeln**: Quota-Exceeded, IndexedDB-Fehler, etc.
5. **Performance**: Nicht zu oft cachen, alte Daten aufräumen
6. **Testing**: Offline-Szenarien testen

## Hilfreiche Snippets

### Debug-Konsole für Storage

```tsx
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    (window as any).debugStorage = {
      async show() {
        const data = await offlineStorage.exportData();
        console.table(data.gameHistory);
        return data;
      },
      async clear() {
        await offlineStorage.clearOldData(0);
        console.log('All data cleared');
      }
    };
  }
}, []);

// Verwendung in Browser Console:
// debugStorage.show()
// debugStorage.clear()
```
