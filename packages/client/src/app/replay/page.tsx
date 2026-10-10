'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { loadReplays, getReplay, deleteReplay, type SavedReplay, type ReplayAction } from '../../lib/replays';
import Button from '../../components/ui/Button';

function ReplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayId = searchParams.get('id');

  const [replays, setReplays] = useState<SavedReplay[]>([]);
  const [replay, setReplay] = useState<SavedReplay | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setReplays(loadReplays());
  }, []);

  useEffect(() => {
    if (replayId) {
      const r = getReplay(replayId);
      if (r) setReplay(r);
    }
  }, [replayId]);

  // Playback
  useEffect(() => {
    if (!playing || !replay) return;
    if (currentIndex >= replay.actions.length - 1) {
      setPlaying(false);
      return;
    }

    const currentAction = replay.actions[currentIndex];
    const nextAction = replay.actions[currentIndex + 1];
    const delay = Math.max(100, (nextAction.ts - currentAction.ts) / speed);

    timerRef.current = setTimeout(() => {
      setCurrentIndex(i => i + 1);
    }, delay);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, currentIndex, replay, speed]);

  const handleDelete = (id: string) => {
    deleteReplay(id);
    setReplays(loadReplays());
  };

  // List view
  if (!replayId || !replay) {
    return (
      <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Replays</h1>
          <Button variant="secondary" size="sm" onClick={() => router.push('/')}>Voltar</Button>
        </div>

        {replays.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-green-200/60 text-lg mb-2">Nenhum replay salvo</p>
            <p className="text-green-400/40 text-sm">Replays sao salvos automaticamente ao final de cada partida</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...replays].reverse().map((r) => {
              const gameOver = r.actions.find(a => a.action === 'game_over');
              const scores = gameOver?.data?.scores;
              return (
                <div
                  key={r.id}
                  className="bg-green-800/40 rounded-xl p-4 border border-green-700/30 flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-bold text-sm">
                      {scores ? `${scores[0]} x ${scores[1]}` : 'Partida'}
                    </div>
                    <div className="text-green-400/60 text-xs">
                      {new Date(r.date).toLocaleString('pt-BR')} - {r.actions.length} acoes
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/replay?id=${r.id}`)}
                      className="text-amber-400 text-sm font-bold hover:text-amber-300 cursor-pointer"
                    >
                      Assistir
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-400/40 text-sm hover:text-red-400 cursor-pointer"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Replay player
  const actionsUpToNow = replay.actions.slice(0, currentIndex + 1);
  const currentAction = replay.actions[currentIndex];
  const progress = replay.actions.length > 0 ? (currentIndex / (replay.actions.length - 1)) * 100 : 0;

  // Build a timeline summary
  const gameStart = replay.actions.find(a => a.action === 'game_start');
  const playerNamesMap: Record<string, string> = gameStart?.data?.playerNames || {};

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-black text-amber-400">Replay</h1>
        <Button variant="secondary" size="sm" onClick={() => router.push('/replay')}>Voltar</Button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-green-950 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setCurrentIndex(Math.floor(pct * (replay.actions.length - 1)));
          }}
        >
          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-green-400/40 mt-1">
          <span>Acao {currentIndex + 1}/{replay.actions.length}</span>
          <span>{((currentAction?.ts || 0) / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button onClick={() => { setCurrentIndex(0); setPlaying(false); }}
          className="px-3 py-1.5 bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 cursor-pointer">
          ⏮
        </button>
        <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          className="px-3 py-1.5 bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 cursor-pointer">
          ◀
        </button>
        <button onClick={() => setPlaying(!playing)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm text-white font-bold cursor-pointer">
          {playing ? '⏸ Pausar' : '▶ Play'}
        </button>
        <button onClick={() => setCurrentIndex(i => Math.min(replay.actions.length - 1, i + 1))}
          className="px-3 py-1.5 bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 cursor-pointer">
          ▶
        </button>
        <button onClick={() => { setCurrentIndex(replay.actions.length - 1); setPlaying(false); }}
          className="px-3 py-1.5 bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 cursor-pointer">
          ⏭
        </button>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 px-2 py-1.5 cursor-pointer"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>

      {/* Action log */}
      <div className="bg-green-800/40 rounded-xl p-4 border border-green-700/30 max-h-96 overflow-y-auto">
        <h3 className="text-sm font-bold text-amber-300 mb-3">Log de Acoes</h3>
        <div className="space-y-1">
          {actionsUpToNow.map((action, i) => {
            const pName = action.playerId ? (playerNamesMap[action.playerId] || action.playerId.slice(0, 8)) : '';
            const isCurrent = i === currentIndex;
            return (
              <div
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                  isCurrent ? 'bg-amber-600/30 text-amber-300' : 'text-green-300/60 hover:bg-green-700/30'
                }`}
              >
                <span className="text-green-400/40 mr-2">{(action.ts / 1000).toFixed(1)}s</span>
                {formatAction(action, pName)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatAction(action: ReplayAction, playerName: string): string {
  switch (action.action) {
    case 'game_start': return '🃏 Partida iniciada';
    case 'play_card':
      const card = action.data?.card;
      return `${playerName} jogou ${card ? `${card.rank} de ${card.suit}` : 'carta'}`;
    case 'call_truco': return `${playerName} pediu TRUCO! (nivel ${action.data?.level})`;
    case 'respond_truco':
      const resp = action.data?.response;
      return `${playerName} ${resp === 'accept' ? 'aceitou' : resp === 'run' ? 'correu' : 'aumentou'}`;
    case 'game_over':
      return `🏆 Fim! ${action.data?.scores?.[0]} x ${action.data?.scores?.[1]}`;
    default: return action.action;
  }
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-amber-400">Carregando...</div>}>
      <ReplayContent />
    </Suspense>
  );
}
