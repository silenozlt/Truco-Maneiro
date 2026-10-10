'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Room } from 'colyseus.js';
import { joinAsSpectator, getActiveRooms } from '../../lib/colyseus';
import ScoreBoard from '../../components/game/ScoreBoard';
import PlayArea from '../../components/game/PlayArea';
import Card2D from '../../components/game/Card2D';
import Button from '../../components/ui/Button';

interface SpectatorState {
  phase: string;
  teams: Array<{ score: number }>;
  players: Array<{ name: string; position: number; team: number; handSize: number; isBot: boolean }>;
  cardsPlayed: Array<{ playerId: string; card: { suit: string; rank: string; id: string }; position: number }>;
  currentRound: number;
  trucoLevel: number;
  handPoints: number;
  roundResults: Array<{ winner: number; roundNum: number }>;
  spectatorCount: number;
  winner: number;
}

function SpectatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');

  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<SpectatorState | null>(null);
  const [rooms, setRooms] = useState<Array<{ roomId: string; clients: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  // List active rooms
  useEffect(() => {
    if (!roomId) {
      getActiveRooms().then(setRooms);
      const interval = setInterval(() => getActiveRooms().then(setRooms), 5000);
      return () => clearInterval(interval);
    }
  }, [roomId]);

  // Join as spectator
  useEffect(() => {
    if (!roomId) return;
    let r: Room;
    (async () => {
      try {
        r = await joinAsSpectator(roomId);
        setRoom(r);
        r.onStateChange((s: any) => {
          const players: SpectatorState['players'] = [];
          s.players?.forEach((p: any) => {
            players.push({ name: p.name, position: p.position, team: p.team, handSize: p.hand?.length ?? 0, isBot: p.isBot });
          });
          const cardsPlayed: SpectatorState['cardsPlayed'] = [];
          const currentRound = s.currentHand?.currentRound ?? 0;
          const round = s.currentHand?.rounds?.[currentRound];
          round?.cardsPlayed?.forEach((pc: any) => {
            cardsPlayed.push({ playerId: pc.playerId, card: { suit: pc.card.suit, rank: pc.card.rank, id: pc.card.id }, position: pc.position });
          });
          const roundResults: SpectatorState['roundResults'] = [];
          s.currentHand?.rounds?.forEach((r: any, i: number) => {
            if (r.complete) roundResults.push({ winner: r.winner, roundNum: i });
          });
          setState({
            phase: s.phase,
            teams: [{ score: s.teams?.[0]?.score ?? 0 }, { score: s.teams?.[1]?.score ?? 0 }],
            players: players.sort((a, b) => a.position - b.position),
            cardsPlayed,
            currentRound,
            trucoLevel: s.currentHand?.trucoLevel ?? -1,
            handPoints: s.currentHand?.points ?? 1,
            roundResults,
            spectatorCount: s.spectatorCount ?? 0,
            winner: s.winner ?? -1,
          });
        });
        r.onLeave(() => setError('Sala encerrada'));
      } catch (e: any) {
        setError(e.message || 'Erro ao entrar como espectador');
      }
    })();
    return () => { r?.leave(); };
  }, [roomId]);

  // Room list view
  if (!roomId) {
    return (
      <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Assistir Partidas</h1>
          <Button variant="secondary" size="sm" onClick={() => router.push('/')}>Voltar</Button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👀</div>
            <p className="text-green-200/60 text-lg mb-2">Nenhuma partida ao vivo</p>
            <p className="text-green-400/40 text-sm">Partidas aparecerao aqui quando alguem estiver jogando</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((r) => (
              <button
                key={r.roomId}
                onClick={() => router.push(`/assistir?room=${r.roomId}`)}
                className="w-full bg-green-800/40 rounded-xl p-4 border border-green-700/30 flex items-center justify-between hover:border-amber-400/50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-white font-bold text-sm">Sala {r.roomId.slice(0, 6)}</div>
                  <div className="text-green-400/60 text-xs">{r.clients} jogadores</div>
                </div>
                <span className="text-amber-400 text-sm font-bold">Assistir →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Loading / error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-400">{error}</p>
        <Button variant="secondary" onClick={() => router.push('/assistir')}>Voltar</Button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen text-amber-400">Conectando como espectador...</div>
    );
  }

  // Spectator view
  const playerNames: Record<number, string> = {};
  state.players.forEach(p => { playerNames[p.position] = p.name; });
  const north = state.players.find(p => p.position === 2);
  const south = state.players.find(p => p.position === 0);
  const west = state.players.find(p => p.position === 1);
  const east = state.players.find(p => p.position === 3);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="p-2 sm:p-3 bg-green-900/80 border-b border-green-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400/60">👀 Espectador</span>
          <span className="text-xs text-amber-400/60">{state.spectatorCount} assistindo</span>
        </div>
        <button
          onClick={() => { room?.leave(); router.push('/assistir'); }}
          className="text-green-400/40 hover:text-red-400 text-sm cursor-pointer"
        >
          Sair
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative p-2 sm:p-4">
        <div className="flex flex-col items-center gap-2 sm:gap-4 w-full max-w-2xl">
          {/* Score board */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
            <ScoreBoard
              scores={[state.teams[0].score, state.teams[1].score]}
              teamNames={['Time 1', 'Time 2']}
              currentHandPoints={state.handPoints}
              trucoLevel={state.trucoLevel}
              roundResults={state.roundResults}
              currentRound={state.currentRound}
              myTeam={0}
            />
          </div>

          {/* North */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-green-300/60">
              {north?.isBot ? '🤖' : '🧑'} {north?.name || '?'}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: north?.handSize ?? 0 }).map((_, i) => (
                <Card2D key={i} suit="paus" rank="A" faceDown small />
              ))}
            </div>
          </div>

          {/* Middle */}
          <div className="flex items-center justify-center gap-3 sm:gap-8 w-full">
            <div className="flex flex-col items-center gap-1 min-w-[50px]">
              <span className="text-[10px] sm:text-xs text-green-300/60">
                {west?.isBot ? '🤖' : '🧑'} {west?.name || '?'}
              </span>
              <div className="flex flex-col gap-1">
                {Array.from({ length: west?.handSize ?? 0 }).map((_, i) => (
                  <Card2D key={i} suit="paus" rank="A" faceDown small />
                ))}
              </div>
            </div>

            <div className="bg-green-700/30 rounded-full w-44 h-44 sm:w-72 sm:h-72 flex items-center justify-center border-2 border-green-600/20 shrink-0">
              <PlayArea cardsPlayed={state.cardsPlayed} playerNames={playerNames} />
            </div>

            <div className="flex flex-col items-center gap-1 min-w-[50px]">
              <span className="text-[10px] sm:text-xs text-green-300/60">
                {east?.isBot ? '🤖' : '🧑'} {east?.name || '?'}
              </span>
              <div className="flex flex-col gap-1">
                {Array.from({ length: east?.handSize ?? 0 }).map((_, i) => (
                  <Card2D key={i} suit="paus" rank="A" faceDown small />
                ))}
              </div>
            </div>
          </div>

          {/* South */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-green-300/60">
              {south?.isBot ? '🤖' : '🧑'} {south?.name || '?'}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: south?.handSize ?? 0 }).map((_, i) => (
                <Card2D key={i} suit="paus" rank="A" faceDown small />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game over overlay */}
      {state.phase === 'game_over' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-6 border-2 border-amber-400/50 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="text-4xl font-black text-amber-400 mb-3">FIM DE JOGO</div>
            <p className="text-green-200 mb-4">
              {state.teams[0].score} x {state.teams[1].score}
            </p>
            <p className="text-green-200/60 text-sm mb-6">
              Time {state.winner === 0 ? '1' : '2'} venceu!
            </p>
            <Button variant="secondary" onClick={() => { room?.leave(); router.push('/assistir'); }}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssistirPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-amber-400">Carregando...</div>}>
      <SpectatorContent />
    </Suspense>
  );
}
