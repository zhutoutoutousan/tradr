"use client";

import { useState } from 'react';
import { LocalMultiplayerHost } from './LocalMultiplayerHost';
import { LocalMultiplayerJoin } from './LocalMultiplayerJoin';

type LocalMultiplayerMode = 'menu' | 'host' | 'join' | 'playing';

interface LocalMultiplayerMenuProps {
  onStartGame: (isHost: boolean, remoteUsername: string) => void;
  onCancel: () => void;
}

export function LocalMultiplayerMenu({ onStartGame, onCancel }: LocalMultiplayerMenuProps) {
  const [mode, setMode] = useState<LocalMultiplayerMode>('menu');
  const [username, setUsername] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'host' | 'join' | null>(null);

  const handleModeSelect = (selectedMode: 'host' | 'join') => {
    const storedUsername = localStorage.getItem('tradr.localmp.username');
    
    if (storedUsername) {
      setUsername(storedUsername);
      setMode(selectedMode);
    } else {
      setSelectedMode(selectedMode);
      setShowUsernamePrompt(true);
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    localStorage.setItem('tradr.localmp.username', username.trim());
    setShowUsernamePrompt(false);
    
    if (selectedMode) {
      setMode(selectedMode);
    }
  };

  const handleConnected = (remoteUsername: string) => {
    const isHost = mode === 'host';
    setMode('playing');
    
    setTimeout(() => {
      onStartGame(isHost, remoteUsername);
    }, 1000);
  };

  if (showUsernamePrompt) {
    return (
      <div className="flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-md w-full bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            Wie soll dich dein Mitspieler nennen?
          </h3>
          
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Dein Spielername..."
              maxLength={20}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUsernamePrompt(false);
                  setSelectedMode(null);
                }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!username.trim()}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                Weiter
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    return (
      <LocalMultiplayerHost
        username={username}
        onConnected={handleConnected}
        onCancel={() => setMode('menu')}
      />
    );
  }

  if (mode === 'join') {
    return (
      <LocalMultiplayerJoin
        username={username}
        onConnected={handleConnected}
        onCancel={() => setMode('menu')}
      />
    );
  }

  if (mode === 'playing') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4 animate-bounce">🎮</div>
        <p className="text-2xl font-bold text-white mb-2">Verbunden!</p>
        <p className="text-slate-400">Spiel wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 max-w-2xl mx-auto">
      <div className="text-6xl mb-4">✈️</div>
      <h1 className="text-3xl font-bold text-white mb-2 text-center">
        Lokales Multiplayer
      </h1>
      <p className="text-slate-400 mb-8 text-center max-w-md">
        Spiele mit jemandem in deiner Nähe - komplett offline!
      </p>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 w-full max-w-2xl">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <div className="text-3xl mb-2">🔌</div>
          <div className="font-semibold text-white mb-1">Komplett Offline</div>
          <div className="text-sm text-slate-400">Kein Internet nötig</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <div className="text-3xl mb-2">⚡</div>
          <div className="font-semibold text-white mb-1">Ultra-schnell</div>
          <div className="text-sm text-slate-400">Peer-to-Peer direkt</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <div className="text-3xl mb-2">✈️</div>
          <div className="font-semibold text-white mb-1">Flugzeug-Modus</div>
          <div className="text-sm text-slate-400">Perfekt fürs Reisen</div>
        </div>
      </div>

      {/* Main Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mb-8">
        <button
          onClick={() => handleModeSelect('host')}
          className="group bg-emerald-600 hover:bg-emerald-700 rounded-lg p-6 transition-all hover:scale-105 border-2 border-transparent hover:border-emerald-400"
        >
          <div className="text-4xl mb-3">🎯</div>
          <div className="font-bold text-white text-lg mb-1">Spiel erstellen</div>
          <div className="text-sm text-emerald-100 opacity-90">
            QR-Code generieren
          </div>
        </button>

        <button
          onClick={() => handleModeSelect('join')}
          className="group bg-blue-600 hover:bg-blue-700 rounded-lg p-6 transition-all hover:scale-105 border-2 border-transparent hover:border-blue-400"
        >
          <div className="text-4xl mb-3">📱</div>
          <div className="font-bold text-white text-lg mb-1">Spiel beitreten</div>
          <div className="text-sm text-blue-100 opacity-90">
            QR-Code scannen
          </div>
        </button>
      </div>

      {/* How it works */}
      <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700 w-full max-w-md mb-6">
        <h3 className="font-semibold text-white mb-3 text-center">Wie funktioniert's?</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-lg">1️⃣</span>
            <div>
              <span className="font-semibold text-white">Host</span> erstellt Spiel und zeigt QR-Code
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">2️⃣</span>
            <div>
              <span className="font-semibold text-white">Mitspieler</span> scannt QR-Code oder gibt Code ein
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">3️⃣</span>
            <div>
              <span className="font-semibold text-white">Verbindung</span> wird direkt hergestellt
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">4️⃣</span>
            <div>
              <span className="font-semibold text-white">Spielen!</span> Komplett offline möglich
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="text-center text-sm text-slate-400 mb-6">
        <div className="font-semibold text-white mb-2">Perfekt für:</div>
        <div className="space-x-2">
          <span>✈️ Flugzeug</span>
          <span>•</span>
          <span>🚂 Zug</span>
          <span>•</span>
          <span>🏕️ Camping</span>
          <span>•</span>
          <span>🏢 Office</span>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={onCancel}
        className="text-slate-400 hover:text-white transition-colors"
      >
        ← Zurück zum Hauptmenü
      </button>
    </div>
  );
}
