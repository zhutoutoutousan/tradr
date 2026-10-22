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

  const startScanning = async () => {
    try {
      // iOS requires explicit camera permission request
      console.log('[LocalMP Join] Requesting camera access...');
      
      // Try to access camera first to trigger permission dialog
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        console.log('[LocalMP Join] Camera permission granted');
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        console.error('[LocalMP Join] Permission denied:', permErr);
        setCameraPermission(false);
        setError('Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen und lade die Seite neu.');
        return;
      }

      // Now start the QR scanner
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // iOS-compatible configuration
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0, // iOS likes square aspect ratio
        },
        async (decodedText) => {
          console.log('[LocalMP Join] QR code scanned');
          await handleOfferCode(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignore frequent scanning errors
        }
      );

      setScanning(true);
      setCameraPermission(true);
      setError('');
    } catch (err: any) {
      console.error('[LocalMP Join] Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission(false);
        setError('Kamera-Zugriff verweigert. Bitte erlaube den Zugriff oder nutze manuelle Eingabe.');
      } else if (err.name === 'NotFoundError') {
        setError('Keine Kamera gefunden. Nutze bitte manuelle Eingabe.');
      } else if (err.name === 'NotReadableError') {
        setError('Kamera wird bereits verwendet. Schließe andere Apps und versuche es erneut.');
      } else {
        setError(`Kamera-Fehler: ${err.message || 'Unbekannter Fehler'}. Nutze bitte manuelle Eingabe.`);
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setScanning(false);
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
          {!scanning ? (
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
