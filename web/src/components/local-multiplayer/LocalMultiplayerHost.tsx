"use client";

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { webrtcManager } from '@/lib/p2p/webrtc-manager';
import type { ConnectionState } from '@/lib/p2p/webrtc-manager';

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
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState('');

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
  }, [username, onConnected]);

  const handleAnswerSubmit = async () => {
    if (!answerInput.trim()) return;

    try {
      setLoading(true);
      setError('');
      await webrtcManager.processAnswer(answerInput.trim());
      console.log('[LocalMP Host] Answer processed, waiting for connection...');
    } catch (err) {
      console.error('[LocalMP Host] Failed to process answer:', err);
      setError('Ungültiger Antwort-Code');
      setLoading(false);
    }
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
      </div>
    );
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

  if (connectionState === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-pulse text-4xl mb-4">🔗</div>
        <p className="text-lg font-semibold text-white mb-2">Verbindung wird hergestellt...</p>
        <p className="text-sm text-slate-400">Dies kann einige Sekunden dauern</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">
        🎮 Lokales Multiplayer-Spiel
      </h2>
      <p className="text-slate-400 mb-6 text-center">
        Zeige diesen QR-Code deinem Mitspieler
      </p>

      {/* QR Code */}
      <div className="bg-white p-6 rounded-lg mb-6 shadow-lg">
        <QRCodeSVG
          value={offerCode}
          size={256}
          level="M"
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

      {/* Alternative: Manual Code Input */}
      {waitingForAnswer && (
        <div className="w-full max-w-md">
          <div className="text-center text-sm text-slate-400 mb-4">
            Oder Antwort-Code manuell eingeben:
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
