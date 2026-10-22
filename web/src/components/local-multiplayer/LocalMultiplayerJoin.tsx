"use client";

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { webrtcManager } from '@/lib/p2p/webrtc-manager';
import type { ConnectionState } from '@/lib/p2p/webrtc-manager';

interface LocalMultiplayerJoinProps {
  username: string;
  onConnected: (hostUsername: string) => void;
  onCancel: () => void;
}

export function LocalMultiplayerJoin({ username, onConnected, onCancel }: LocalMultiplayerJoinProps) {
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [shouldStartScanner, setShouldStartScanner] = useState(false);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = webrtcManager.onStateChange((state) => {
      setConnectionState(state);
      if (state === 'connected') {
        const remoteInfo = webrtcManager.getRemoteInfo();
        if (remoteInfo) {
          onConnected(remoteInfo.username);
        }
      }
    });

    return () => {
      unsubscribe();
      stopScanning();
    };
  }, [onConnected]);

  // Initialize scanner after DOM is ready
  useEffect(() => {
    if (!shouldStartScanner || scanning || scannerRef.current) return;

    const initScanner = async () => {
      setError('');
      
      try {
        console.log('[LocalMP Join] Requesting camera access...');
        
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported on this browser');
        }
        
        // iOS requires explicit camera permission request
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          console.log('[LocalMP Join] Camera permission granted');
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr: any) {
          console.error('[LocalMP Join] Permission error:', permErr);
          setCameraPermission(false);
          setShouldStartScanner(false);
          
          if (permErr.name === 'NotAllowedError') {
            setError('❌ Kamera-Zugriff verweigert. Tippe auf "Erlauben" wenn Safari nach Erlaubnis fragt.');
            return;
          } else if (permErr.name === 'NotFoundError') {
            setError('❌ Keine Kamera gefunden. Dein Gerät hat keine Kamera oder sie ist deaktiviert.');
            return;
          } else if (permErr.name === 'NotReadableError') {
            setError('❌ Kamera ist blockiert oder wird von einer anderen App verwendet. Schließe andere Kamera-Apps.');
            return;
          } else {
            setError(`❌ Kamera-Zugriff fehlgeschlagen: ${permErr.message || permErr.name}. Nutze "⌨️ Manuell" Modus.`);
            return;
          }
        }

        // Wait for DOM using multiple strategies
        let element = document.getElementById('qr-reader');
        let retries = 0;
        while (!element && retries < 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
          element = document.getElementById('qr-reader');
          retries++;
          console.log(`[LocalMP Join] Waiting for qr-reader element... retry ${retries}`);
        }

        if (!element) {
          console.error('[LocalMP Join] qr-reader element not found after retries');
          setError('❌ Scanner konnte nicht initialisiert werden. Nutze "⌨️ Manuell" Modus.');
          setShouldStartScanner(false);
          return;
        }

        console.log('[LocalMP Join] Starting QR scanner...');
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            console.log('[LocalMP Join] QR code scanned successfully');
            await handleOfferCode(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Ignore frequent scanning errors (not finding QR codes)
          }
        );

        setScanning(true);
        setCameraPermission(true);
        setError('');
        console.log('[LocalMP Join] Scanner started successfully');
        
      } catch (err: any) {
        console.error('[LocalMP Join] Scanner initialization failed:', err);
        setShouldStartScanner(false);
        
        const errorName = err.name || 'Unknown';
        const errorMsg = err.message || 'Unbekannter Fehler';
        
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          setCameraPermission(false);
          setError('❌ Kamera-Zugriff wurde blockiert. Bitte in Safari-Einstellungen → Kamera → Erlauben.');
        } else if (errorName === 'NotFoundError' || errorMsg.includes('camera')) {
          setError('❌ Keine Kamera verfügbar. Nutze bitte "⌨️ Manuell" Modus.');
        } else if (errorName === 'NotReadableError' || errorMsg.includes('use')) {
          setError('❌ Kamera wird bereits verwendet. Schließe andere Apps (Instagram, Snapchat, etc.).');
        } else if (errorMsg.includes('HTTPS') || errorMsg.includes('secure')) {
          setError('❌ Kamera benötigt HTTPS. Lade die Seite über https:// neu.');
        } else {
          setError(`❌ Scanner-Fehler (${errorName}): ${errorMsg}. Bitte nutze "⌨️ Manuell" Modus.`);
        }
      }
    };

    initScanner();
  }, [shouldStartScanner]);

  const startScanning = () => {
    setShouldStartScanner(true);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setScanning(false);
    setShouldStartScanner(false);
  };

  const handleOfferCode = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      console.log('[LocalMP Join] Processing offer...');
      const answer = await webrtcManager.acceptOffer(code, username);
      setAnswerCode(answer);
      console.log('[LocalMP Join] Answer created, waiting for host...');
    } catch (err) {
      console.error('[LocalMP Join] Failed to process offer:', err);
      setError('Ungültiger QR-Code');
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!offerInput.trim()) return;
    handleOfferCode(offerInput.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOfferInput(text);
    } catch (err) {
      console.error('[LocalMP Join] Failed to paste:', err);
    }
  };

  const copyAnswerCode = async () => {
    try {
      await navigator.clipboard.writeText(answerCode);
      alert('Antwort-Code kopiert! Sende ihn dem Host.');
    } catch (err) {
      console.error('[LocalMP Join] Failed to copy:', err);
    }
  };

  if (connectionState === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-pulse text-4xl mb-4">🔗</div>
        <p className="text-lg font-semibold text-white mb-2">Verbindung wird hergestellt...</p>
        <p className="text-sm text-slate-400">Dies kann einige Sekunden dauern</p>
      </div>
    );
  }

  if (answerCode) {
    return (
      <div className="flex flex-col items-center p-4 md:p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">
          ✅ Antwort-Code erstellt
        </h2>
        <p className="text-slate-400 mb-6 text-center">
          Zeige diesen QR-Code dem Host
        </p>

        {/* Answer QR Code - Main Feature for Airplane Mode */}
        <div className="bg-white p-6 rounded-lg mb-6 shadow-lg">
          <QRCodeSVG
            value={answerCode}
            size={256}
            level="M"
            includeMargin={true}
          />
        </div>

        {/* Network Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6 w-full max-w-md">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📡</span>
            <div>
              <p className="font-semibold text-blue-300 mb-2">Nächster Schritt:</p>
              <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                <li>Host scannt <strong>diesen QR-Code</strong></li>
                <li>Verbindung wird hergestellt</li>
                <li>Spiel startet! 🎮</li>
              </ol>
              <p className="text-xs text-blue-200 mt-2">
                💡 Tipp: Stelle sicher, dass beide Geräte im gleichen Netzwerk sind
              </p>
            </div>
          </div>
        </div>

        {/* Alternative: Text Code for Manual Entry */}
        <details className="w-full max-w-md">
          <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 mb-2">
            ⌨️ Oder Code manuell kopieren...
          </summary>
          <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Antwort-Code (manuell):</div>
            <div className="font-mono text-xs text-white break-all bg-slate-900 p-3 rounded mb-3">
              {answerCode}
            </div>
            <button
              onClick={copyAnswerCode}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded transition-colors"
            >
              📋 Code kopieren
            </button>
          </div>
        </details>

        {/* Connection Status */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-sm text-slate-300">Warte auf Host...</span>
        </div>

        <button
          onClick={onCancel}
          className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 max-w-2xl mx-auto">
      {/* Connection Info Banner */}
      <div className="mb-6 w-full max-w-md rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold text-blue-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verbindungsoptionen
        </div>
        <ul className="ml-7 space-y-1 text-slate-300">
          <li>✓ <strong>WiFi-Netzwerk</strong>: Beide Geräte im selben WLAN</li>
          <li>✓ <strong>Hotspot</strong>: Ein Gerät öffnet Hotspot, anderes verbindet</li>
          <li>✓ <strong>Bluetooth-Tethering</strong> (Android): Netzwerk über Bluetooth teilen</li>
          <li className="text-amber-400">⚠️ Flugmodus deaktiviert meist Hotspot-Funktion</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        🎮 Spiel beitreten
      </h2>
      <p className="text-slate-400 mb-6 text-center">
        Scanne den QR-Code des Hosts
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setManualMode(false);
            stopScanning();
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            !manualMode
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          📷 QR-Scanner
        </button>
        <button
          onClick={() => {
            setManualMode(true);
            stopScanning();
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            manualMode
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          ⌨️ Manuell
        </button>
      </div>

      {/* QR Scanner */}
      {!manualMode && (
        <div className="w-full max-w-md">
          {!shouldStartScanner ? (
            <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700">
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-slate-300 mb-4">
                  Kamera wird benötigt um QR-Code zu scannen
                </p>
                
                {/* iOS specific instructions */}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-left">
                  <p className="text-xs font-semibold text-blue-300 mb-2">📱 iOS Nutzer:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Erlaube Kamera-Zugriff wenn gefragt</li>
                    <li>• Falls blockiert: Safari Einstellungen → Kamera</li>
                    <li>• Oder nutze "⌨️ Manuell" Modus</li>
                  </ul>
                </div>
                
                {cameraPermission === false && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <p className="text-sm text-red-400 mb-2">
                      ❌ Kamera-Zugriff wurde verweigert
                    </p>
                    <p className="text-xs text-red-300">
                      Lösung: Nutze den "⌨️ Manuell" Modus oder erlaube Kamera-Zugriff in den Einstellungen.
                    </p>
                  </div>
                )}
                
                <button
                  onClick={startScanning}
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                >
                  📷 Kamera starten
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-2">
                <div id="qr-reader" className="rounded-lg overflow-hidden" style={{ minHeight: '300px' }} />
              </div>
              <button
                onClick={stopScanning}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Scannen abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Input */}
      {manualMode && (
        <div className="w-full max-w-md">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              QR-Code Text:
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={offerInput}
                onChange={(e) => setOfferInput(e.target.value)}
                placeholder="Code hier einfügen..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handlePaste}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
                title="Einfügen"
              >
                📋
              </button>
            </div>
            <button
              onClick={handleManualSubmit}
              disabled={!offerInput.trim() || loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
            >
              {loading ? 'Verbinde...' : 'Beitreten'}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm text-center max-w-md">
          {error}
        </div>
      )}

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
      >
        ← Zurück
      </button>
    </div>
  );
}
