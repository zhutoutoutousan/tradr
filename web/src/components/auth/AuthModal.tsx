"use client";

import { useState } from 'react';
import { authService } from '@/lib/auth/supabase-auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { user, error: authError } = await authService.signIn({ email, password });

    if (authError) {
      setError(authError.message || 'Login fehlgeschlagen');
      setLoading(false);
      return;
    }

    if (user) {
      onClose();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Benutzername muss mindestens 3 Zeichen lang sein');
      return;
    }

    setLoading(true);

    const { user, error: authError } = await authService.signUp({
      email,
      password,
      username,
      displayName: displayName || username
    });

    if (authError) {
      setError(authError.message || 'Registrierung fehlgeschlagen');
      setLoading(false);
      return;
    }

    if (user) {
      setError('');
      onClose();
    }
    setLoading(false);
  };

  const checkUsername = async () => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const available = await authService.isUsernameAvailable(username);
    setUsernameAvailable(available);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'signin' ? 'Anmelden' : 'Registrieren'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Benutzername *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameAvailable(null);
                  }}
                  onBlur={checkUsername}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-emerald-500"
                  required
                  minLength={3}
                  maxLength={20}
                />
                {usernameAvailable === false && (
                  <p className="mt-1 text-xs text-red-400">Benutzername bereits vergeben</p>
                )}
                {usernameAvailable === true && (
                  <p className="mt-1 text-xs text-emerald-400">Benutzername verfügbar ✓</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Anzeigename (optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-emerald-500"
                  maxLength={50}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              E-Mail *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Passwort *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-emerald-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && usernameAvailable === false)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
          >
            {loading ? 'Lädt...' : mode === 'signin' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {mode === 'signin' 
              ? 'Noch kein Konto? Jetzt registrieren' 
              : 'Bereits ein Konto? Anmelden'}
          </button>
        </div>
      </div>
    </div>
  );
}
