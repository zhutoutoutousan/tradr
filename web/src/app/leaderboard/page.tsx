import { GlobalLeaderboard } from '@/components/leaderboard/GlobalLeaderboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Leaderboard - Tradr Game',
  description: 'Die besten Trader weltweit. Vergleiche dein ELO-Rating mit anderen Spielern.',
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              🏆 Global Leaderboard
            </h1>
            <p className="text-slate-400">
              Die besten Trader der Welt
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Top 1000</div>
              <div className="text-2xl font-bold text-white">Spieler</div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Mindestens</div>
              <div className="text-2xl font-bold text-emerald-400">5 Spiele</div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Aktualisiert</div>
              <div className="text-2xl font-bold text-blue-400">Live</div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-800/30 rounded-lg p-4 md:p-6 border border-slate-700">
            <GlobalLeaderboard />
          </div>

          {/* Info */}
          <div className="mt-8 text-center text-sm text-slate-400 space-y-2">
            <p>
              💡 Spiele mindestens 5 Runden, um im Leaderboard zu erscheinen
            </p>
            <p>
              🎯 Dein ELO-Rating steigt mit Siegen und sinkt mit Niederlagen
            </p>
            <p>
              🏅 Die Top 3 bekommen spezielle Abzeichen
            </p>
          </div>

          {/* Back to Game */}
          <div className="mt-8 text-center">
            <a
              href="/play"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Zurück zum Spiel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
