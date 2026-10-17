"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/lib/auth/supabase-auth';
import { AuthModal } from './auth/AuthModal';

export function UserMenu() {
  const { user, profile, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    await authService.signOut();
    setShowMenu(false);
  };

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
        >
          Anmelden
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
          {(profile?.display_name || profile?.username || 'U')[0].toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-sm font-semibold text-white">
            {profile?.display_name || profile?.username}
          </div>
          <div className="text-xs text-slate-400">
            ELO: {profile?.elo_rating || 1200}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-20 overflow-hidden">
            {/* Profile Info */}
            <div className="p-4 border-b border-slate-700">
              <div className="font-semibold text-white">
                {profile?.display_name || profile?.username}
              </div>
              <div className="text-sm text-slate-400">
                @{profile?.username}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">ELO</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {profile?.elo_rating || 1200}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Spiele</div>
                  <div className="font-mono font-bold text-blue-400">
                    {profile?.total_games || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <a
                href="/leaderboard"
                className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                🏆 Leaderboard
              </a>
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                👤 Profil
              </a>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
              >
                🚪 Abmelden
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
