"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authService, type UserProfile } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/supabase';
import { calculateLevel, xpProgress } from '@/lib/game/progress';
import { replayUrl } from '@/lib/replay/storage';

interface GameRecord {
  id: string;
  played_at: string;
  mode: string;
  market_id: string;
  market_label: string;
  rank: number;
  total_players: number | null;
  final_balance: number;
  profit: number;
  return_pct: number;
  trades: number;
  elo_before: number;
  elo_after: number;
  xp_gained: number;
  replay_id: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { session } = await authService.getSession();
      
      if (!session?.user) {
        window.location.href = '/register';
        return;
      }

      setUser(session.user);

      // Load profile
      const userProfile = await authService.ensureUserProfile(session.user);
      if (userProfile) {
        setProfile(userProfile);
      }

      // Load game history
      if (supabase) {
        const { data: gamesData } = await supabase
          .from('user_game_history')
          .select('id, played_at, mode, market_id, market_label, rank, total_players, final_balance, profit, return_pct, trades, elo_before, elo_after, xp_gained, replay_id')
          .eq('user_id', session.user.id)
          .order('played_at', { ascending: false })
          .limit(50);

        if (gamesData) {
          setGames(gamesData as GameRecord[]);
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Lade Profil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Profil nicht gefunden</div>
      </div>
    );
  }

  const xp = profile.xp ?? 0;
  const level = calculateLevel(xp);
  const levelProgress = xpProgress(xp, level);
  const winRate = profile.total_games > 0 
    ? ((profile.total_wins / profile.total_games) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/play" className="text-emerald-400 hover:text-emerald-300">
            ← Zurück zum Spiel
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-400 hover:text-rose-400 transition-colors"
          >
            Abmelden
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-slate-400">@{profile.username}</p>
              {user?.email && (
                <p className="text-xs text-slate-500 mt-1">{user.email}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/bots"
                className="rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 px-4 py-2 font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
              >
                Bot Factory
              </Link>
              <Link
                href="/play"
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold transition-colors hover:bg-emerald-700"
              >
                Spielen
              </Link>
            </div>
          </div>

          <div className="mb-6" data-testid="profile-xp">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-amber-300">Level {level}</span>
              <span className="font-mono text-xs text-slate-400">
                {xp} XP · {Math.max(0, levelProgress.current)}/{levelProgress.required} bis Level {level + 1}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-amber-400" style={{ width: `${Math.max(0, levelProgress.percentage)}%` }} />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-emerald-400">
                {profile.elo_rating}
              </div>
              <div className="text-xs text-slate-400 mt-1">ELO Rating</div>
              <div className="text-xs text-slate-500">
                Best: {profile.best_elo}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-blue-400">
                {profile.total_games}
              </div>
              <div className="text-xs text-slate-400 mt-1">Spiele</div>
              <div className="text-xs text-slate-500">
                {profile.total_wins} Siege
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-purple-400">
                {winRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Siegesrate</div>
              <div className="text-xs text-slate-500">
                {profile.total_wins}/{profile.total_games}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className={`text-2xl font-bold ${profile.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profile.total_profit >= 0 ? '+' : ''}{profile.total_profit.toFixed(0)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Gesamtgewinn</div>
              <div className="text-xs text-slate-500">
                Best: +{profile.best_single_profit.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Beste Rendite:</span>
                <span className="ml-2 text-emerald-400 font-semibold">
                  {profile.best_return_pct > 0 ? '+' : ''}{profile.best_return_pct.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">Mitglied seit:</span>
                <span className="ml-2 text-slate-300">
                  {new Date(profile.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Zuletzt gespielt:</span>
                <span className="ml-2 text-slate-300">
                  {profile.last_played_at 
                    ? new Date(profile.last_played_at).toLocaleDateString('de-DE')
                    : 'Nie'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Game History */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Spielhistorie
          </h2>

          {games.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="mb-4">Noch keine Spiele gespielt</p>
              <Link
                href="/play"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors text-white"
              >
                Erstes Spiel starten
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-xs text-slate-500 w-24">
                        {new Date(game.played_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                        <br />
                        {new Date(game.played_at).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">
                          {game.mode.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-300">
                          {game.market_label || game.market_id}
                        </span>
                        <span className="text-xs text-slate-400">
                          #{game.rank}
                          {game.total_players ? `/${game.total_players}` : ''}
                        </span>
                      </div>

                      <div className="text-sm">
                        <span className="text-slate-400">Trades:</span>
                        <span className="ml-1 text-slate-200">{game.trades}</span>
                      </div>
                      {game.xp_gained > 0 && (
                        <span className="text-xs font-semibold text-amber-300">+{game.xp_gained} XP</span>
                      )}
                      {game.replay_id && (
                        <Link
                          href={replayUrl(game.replay_id)}
                          className="rounded border border-fuchsia-500/50 px-2 py-0.5 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/10"
                        >
                          ▶ Replay
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {game.profit >= 0 ? '+' : ''}{game.profit.toFixed(2)}
                        </div>
                        <div className={`text-xs ${game.return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {game.return_pct >= 0 ? '+' : ''}{game.return_pct.toFixed(2)}%
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-400">
                        <div>ELO: {game.elo_before} → {game.elo_after}</div>
                        <div className={game.elo_after > game.elo_before ? 'text-green-400' : 'text-red-400'}>
                          {game.elo_after > game.elo_before ? '+' : ''}{game.elo_after - game.elo_before}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
