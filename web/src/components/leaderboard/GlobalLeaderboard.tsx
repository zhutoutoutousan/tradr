"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  elo_rating: number;
  total_games: number;
  total_wins: number;
  win_rate: number;
}

export function GlobalLeaderboard() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    if (!supabase) {
      setError('Leaderboard nicht verfügbar (Supabase nicht konfiguriert)');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('global_leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(100);

    if (fetchError) {
      setError('Fehler beim Laden des Leaderboards');
      console.error(fetchError);
    } else {
      setLeaderboard(data || []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadLeaderboard}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Noch keine Einträge im Leaderboard</p>
        <p className="text-sm mt-2">Spiele mindestens 5 Runden, um zu erscheinen!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
        <div className="col-span-1">Rang</div>
        <div className="col-span-4">Spieler</div>
        <div className="col-span-2 text-right">ELO</div>
        <div className="col-span-2 text-right">Spiele</div>
        <div className="col-span-2 text-right">Siege</div>
        <div className="col-span-1 text-right">Rate</div>
      </div>

      {/* Entries */}
      <div className="space-y-1">
        {leaderboard.map((entry) => {
          const isCurrentUser = profile?.id === entry.user_id;
          const rankColor = 
            entry.rank === 1 ? 'text-yellow-400' :
            entry.rank === 2 ? 'text-slate-300' :
            entry.rank === 3 ? 'text-amber-600' :
            'text-slate-400';

          return (
            <div
              key={entry.user_id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 rounded-lg transition-colors ${
                isCurrentUser
                  ? 'bg-emerald-500/10 border border-emerald-500/50'
                  : 'bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <div className={`col-span-1 font-bold ${rankColor} flex items-center`}>
                {entry.rank === 1 && '🥇'}
                {entry.rank === 2 && '🥈'}
                {entry.rank === 3 && '🥉'}
                {entry.rank > 3 && `#${entry.rank}`}
              </div>

              <div className="col-span-4 flex flex-col">
                <span className="font-semibold text-white truncate">
                  {entry.display_name || entry.username}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-emerald-400">(Du)</span>
                  )}
                </span>
                {entry.display_name && (
                  <span className="text-xs text-slate-400 truncate">@{entry.username}</span>
                )}
              </div>

              <div className="col-span-2 text-right font-mono font-bold text-emerald-400 flex items-center justify-end">
                {entry.elo_rating}
              </div>

              <div className="col-span-2 text-right text-slate-300 flex items-center justify-end">
                {entry.total_games}
              </div>

              <div className="col-span-2 text-right text-slate-300 flex items-center justify-end">
                {entry.total_wins}
              </div>

              <div className="col-span-1 text-right text-slate-400 text-sm flex items-center justify-end">
                {entry.win_rate.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center py-4">
        <button
          onClick={loadLeaderboard}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          🔄 Aktualisieren
        </button>
      </div>
    </div>
  );
}
