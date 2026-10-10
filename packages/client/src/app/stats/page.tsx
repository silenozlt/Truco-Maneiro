'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../components/ui/Button';
import { loadStats, getWinRate, getRecentForm, clearStats, type PlayerStats } from '../../lib/stats';

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  if (!stats) return null;

  const winRate = getWinRate(stats);
  const totalMatches = stats.totalWins + stats.totalLosses;
  const recentForm = getRecentForm(stats, 10);
  const recentMatches = [...stats.matches].reverse().slice(0, 20);

  const handleClear = () => {
    if (confirm('Tem certeza que deseja apagar todas as estatisticas?')) {
      clearStats();
      setStats(loadStats());
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-amber-400">
          Estatisticas
        </h1>
        <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
          Voltar
        </Button>
      </div>

      {totalMatches === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🃏</div>
          <p className="text-green-200/60 text-lg mb-2">Nenhuma partida registrada</p>
          <p className="text-green-400/40 text-sm mb-8">Jogue uma partida para ver suas estatisticas aqui</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Jogar agora
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Partidas" value={totalMatches} />
            <StatCard label="Vitorias" value={stats.totalWins} color="text-emerald-400" />
            <StatCard label="Derrotas" value={stats.totalLosses} color="text-red-400" />
            <StatCard label="Win Rate" value={`${winRate}%`} color={winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
          </div>

          {/* Win rate bar */}
          <div className="bg-green-800/40 rounded-xl p-4 border border-green-700/30">
            <h3 className="text-sm font-bold text-amber-300 mb-3">Taxa de Vitoria</h3>
            <div className="w-full h-4 bg-red-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-green-400/60 mt-1">
              <span>{stats.totalWins}V</span>
              <span>{stats.totalLosses}D</span>
            </div>
          </div>

          {/* Recent form */}
          {recentForm.length > 0 && (
            <div className="bg-green-800/40 rounded-xl p-4 border border-green-700/30">
              <h3 className="text-sm font-bold text-amber-300 mb-3">Forma Recente</h3>
              <div className="flex gap-1.5">
                {recentForm.map((won, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ${
                      won ? 'bg-emerald-600/40 text-emerald-300' : 'bg-red-600/40 text-red-300'
                    }`}
                  >
                    {won ? 'V' : 'D'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Truco stats */}
          <div className="bg-green-800/40 rounded-xl p-4 border border-green-700/30">
            <h3 className="text-sm font-bold text-amber-300 mb-3">Truco</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-black text-white">{stats.totalTrucosCalled}</div>
                <div className="text-[10px] sm:text-xs text-green-400/60">Pedidos</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-black text-emerald-400">{stats.totalTrucosAccepted}</div>
                <div className="text-[10px] sm:text-xs text-green-400/60">Aceitos</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-black text-red-400">{stats.totalTrucosRan}</div>
                <div className="text-[10px] sm:text-xs text-green-400/60">Corridos</div>
              </div>
            </div>
          </div>

          {/* Match history */}
          <div className="bg-green-800/40 rounded-xl p-4 border border-green-700/30">
            <h3 className="text-sm font-bold text-amber-300 mb-3">Historico de Partidas</h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {recentMatches.map((match, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm ${
                    match.won ? 'bg-emerald-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${match.won ? 'text-emerald-400' : 'text-red-400'}`}>
                      {match.won ? 'V' : 'D'}
                    </span>
                    <span className="text-white">{match.myScore} x {match.theirScore}</span>
                    <span className="text-green-400/40 capitalize">{match.difficulty}</span>
                  </div>
                  <span className="text-green-400/40 text-[10px] sm:text-xs">
                    {new Date(match.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clear stats */}
          <div className="text-center pt-4">
            <button
              onClick={handleClear}
              className="text-red-400/40 hover:text-red-400 text-xs transition-colors cursor-pointer"
            >
              Limpar estatisticas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-green-800/40 rounded-xl p-3 sm:p-4 border border-green-700/30 text-center">
      <div className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-green-400/60 mt-1">{label}</div>
    </div>
  );
}
