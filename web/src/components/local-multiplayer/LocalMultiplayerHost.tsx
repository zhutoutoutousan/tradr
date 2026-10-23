"use client";

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QrCameraView from '@/components/QrCameraView';
import { webrtcManager } from '@/lib/p2p/webrtc-manager';
import type { ConnectionDiagnostics, ConnectionState } from '@/lib/p2p/webrtc-manager';
import { ConnectionTrouble, reportConnectionTrouble } from './ConnectionTrouble';

const CONNECT_TIMEOUT_MS = 20_000;

interface LocalMultiplayerHostProps {
  username: string;
  onConnected: (remoteUsername: string) => void;
  onCancel: () => void;
}

export function LocalMultiplayerHost({ username, onConnected, onCancel }: LocalMultiplayerHostProps) {
  const [offerCode, setOfferCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [shouldStartAnswerScanner, setShouldStartAnswerScanner] = useState(false);
  const scanHandledRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [trouble, setTrouble] = useState<ConnectionDiagnostics | null>(null);
  const answerSubmittedRef = useRef(false);

  useEffect(() => {
    answerSubmittedRef.current = answerSubmitted;
    if (!answerSubmitted) return;
    const timer = window.setTimeout(() => {
      if (!webrtcManager.isConnected()) setTrouble(reportConnectionTrouble('host', 'timeout'));
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [answerSubmitted, attempt]);

  useEffect(() => {
    async function createOffer() {
      try {
        console.log('[LocalMP Host] Creating offer...');
        const code = await webrtcManager.createOffer(username);
        setOfferCode(code);
        setWaitingForAnswer(true);
        setLoading(false);
      } catch (err) {
        console.error('[LocalMP Host] Failed to create offer:', err);
        setError('Fehler beim Erstellen des Spiels');
        setLoading(false);
      }
    }

    createOffer();

    const unsubscribe = webrtcManager.onStateChange((state) => {
      setConnectionState(state);
      if (state === 'failed' && answerSubmittedRef.current) {
        setTrouble(reportConnectionTrouble('host', 'ice-failed'));
      }
      if (state === 'connected') {
        const remoteInfo = webrtcManager.getRemoteInfo();
        if (remoteInfo) {
          onConnected(remoteInfo.username);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [username, onConnected, attempt]);

  const retry = () => {
    webrtcManager.disconnect();
    scanHandledRef.current = false;
    answerSubmittedRef.current = false;
    setTrouble(null);
    setAnswerSubmitted(false);
    setAnswerInput('');
    setShouldStartAnswerScanner(false);
    setWaitingForAnswer(false);
    setOfferCode('');
    setError('');
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  const handleCameraError = (err: unknown) => {
    console.error('[LocalMP Host] Camera failed:', err);
    const { name, message } = (err ?? {}) as { name?: string; message?: string };
    setShouldStartAnswerScanner(false);
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      setError('❌ Kamera-Zugriff verweigert. Tippe auf "Erlauben" wenn Safari fragt.');
    } else if (name === 'NotFoundError') {
      setError('❌ Keine Kamera gefunden. Nutze "⌨️ Manuell" Modus.');
    } else if (name === 'NotReadableError') {
      setError('❌ Kamera blockiert. Schließe andere Kamera-Apps.');
    } else {
      setError(`❌ Kamera-Fehler: ${message || name || 'Unbekannter Fehler'}. Nutze manuelle Eingabe.`);
    }
  };

  const handleAnswerScanned = (text: string) => {
    // The camera keeps decoding every frame while the code is in view
    if (scanHandledRef.current) return;
    scanHandledRef.current = true;
    console.log('[LocalMP Host] Answer QR scanned successfully');
    setAnswerInput(text);
    setShouldStartAnswerScanner(false);
    handleAnswerCode(text);
  };

  const startScanningAnswer = () => {
    scanHandledRef.current = false;
    setError('');
    setShouldStartAnswerScanner(true);
  };

  const stopScanningAnswer = () => {
    setShouldStartAnswerScanner(false);
  };

  const handleAnswerCode = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      await webrtcManager.processAnswer(code.trim());
      setAnswerSubmitted(true);
      console.log('[LocalMP Host] Answer processed, waiting for connection...');
    } catch (err) {
      console.error('[LocalMP Host] Failed to process answer:', err);
      setError('Ungültiger Antwort-Code');
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!answerInput.trim()) return;
    await handleAnswerCode(answerInput.trim());
  };

  const handlePasteAnswer = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAnswerInput(text);
    } catch (err) {
      console.error('[LocalMP Host] Failed to paste:', err);
    }
  };

  if (loading && !offerCode) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4" />
        <p className="text-slate-400">Erstelle Spiel...</p>
        <p className="mt-2 max-w-xs text-center text-xs text-slate-500">
          Bitte Kamera-Zugriff erlauben – damit finden sich die Geräte direkt im WLAN und du kannst später den Antwort-Code scannen.
        </p>
      </div>
    );
  }

  if (trouble) {
    return <ConnectionTrouble diagnostics={trouble} onRetry={retry} onCancel={onCancel} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
        >
          Zurück
        </button>
      </div>
    );
  }

  if (answerSubmitted && connectionState !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center p-8" data-testid="local-mp-connecting">
        <div className="animate-pulse text-4xl mb-4">🔗</div>
        <p className="text-lg font-semibold text-white mb-2">Verbindung wird hergestellt...</p>
        <p className="text-sm text-slate-400">Dies kann einige Sekunden dauern</p>
        <button onClick={retry} className="mt-6 text-sm text-slate-400 hover:text-white">
          🔄 Abbrechen und neu versuchen
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
        🎮 Lokales Multiplayer-Spiel
      </h2>
      <p className="text-slate-400 mb-6 text-center">
        Zeige diesen QR-Code deinem Mitspieler
      </p>

      {/* QR Code */}
      <div className="bg-white p-6 rounded-lg mb-6 shadow-lg" data-testid="local-mp-offer" data-code={offerCode}>
        <QRCodeSVG
          value={offerCode}
          size={288}
          level="L"
          includeMargin={true}
        />
      </div>

      {/* Info */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700 w-full max-w-md">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="font-semibold text-white mb-1">Anleitung für Mitspieler:</p>
            <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
              <li>Öffne das Spiel auf deinem Gerät</li>
              <li>Wähle "Spiel beitreten"</li>
              <li>Scanne diesen QR-Code</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Alternative: Scan or Enter Answer Code */}
      {waitingForAnswer && (
        <div className="w-full max-w-md">
          {/* Step 2 Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📷</span>
              <div>
                <p className="font-semibold text-white mb-2">Schritt 2: Antwort empfangen</p>
                <p className="text-sm text-slate-300 mb-2">
                  Dein Mitspieler zeigt jetzt einen neuen QR-Code.
                </p>
                <p className="text-sm text-blue-300">
                  Scanne seinen Antwort-QR-Code oder gib den Code manuell ein.
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setManualMode(false);
                stopScanningAnswer();
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                !manualMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              📷 QR-Scan
            </button>
            <button
              onClick={() => {
                setManualMode(true);
                stopScanningAnswer();
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                manualMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ⌨️ Manuell
            </button>
          </div>

          {/* QR Scanner for Answer */}
          {!manualMode && !shouldStartAnswerScanner && (
            <button
              onClick={startScanningAnswer}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors mb-4"
            >
              📷 Antwort-QR-Code scannen
            </button>
          )}

          {!manualMode && shouldStartAnswerScanner && (
            <div className="space-y-4 mb-4">
              <div className="bg-slate-900 rounded-lg p-2">
                <QrCameraView className="rounded-lg" onDecode={handleAnswerScanned} onError={handleCameraError} />
              </div>
              <button
                onClick={stopScanningAnswer}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Scannen abbrechen
              </button>
            </div>
          )}

          {/* Manual Input */}
          {manualMode && (
            <>
              <div className="text-center text-sm text-slate-400 mb-3">
                Antwort-Code manuell eingeben:
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Antwort-Code hier einfügen..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handlePasteAnswer}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
                  title="Einfügen"
                >
                  📋
                </button>
              </div>

              <button
                onClick={handleAnswerSubmit}
                disabled={!answerInput.trim() || loading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
              >
                {loading ? 'Verbinde...' : 'Verbinden'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
          <div className={
            connectionState === 'connected' ? 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' :
            connectionState === 'failed' ? 'w-2 h-2 rounded-full bg-red-500' :
            'w-2 h-2 rounded-full bg-slate-500'
          } />
          <span className="text-sm text-slate-300">
            {connectionState === 'connected' ? 'Verbunden' :
             connectionState === 'failed' ? 'Verbindung fehlgeschlagen' :
             'Warte auf Mitspieler'}
          </span>
        </div>
      </div>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
      >
        ← Abbrechen
      </button>
    </div>
  );
}
