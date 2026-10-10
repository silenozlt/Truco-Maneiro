'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useColyseus } from '../../hooks/useColyseus';
import PlayerHand from '../../components/game/PlayerHand';
import PlayArea from '../../components/game/PlayArea';
import ScoreBoard from '../../components/game/ScoreBoard';
import TrucoDialog from '../../components/game/TrucoDialog';
import GameHUD from '../../components/game/GameHUD';
import Card2D from '../../components/game/Card2D';
import Button from '../../components/ui/Button';
import { useAudio } from '../../hooks/useAudio';

// Dynamic import for 3D table (heavy, SSR incompatible)
const Table3D = dynamic(() => import('../../components/game/Table3D'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-amber-400">Carregando mesa 3D...</div>,
});

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const playerName = searchParams.get('name') || 'Jogador';

  const {
    gameState,
    sessionId,
    connected,
    error,
    create,
    addBot,
    startGame,
    playCard,
    callTruco,
    respondTruco,
    restartGame,
    leave,
  } = useColyseus();

  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showRunAnimation, setShowRunAnimation] = useState(false);
  const prevRunEventRef = useRef<string>('');

  // Audio
  const { muted, initialize: initializeAudio, toggleMute: handleToggleMute, playSound: playSoundFn } = useAudio(gameState, sessionId);

  // Initialize audio on first click
  useEffect(() => {
    const handler = () => { initializeAudio(); window.removeEventListener('click', handler); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [initializeAudio]);

  // Show "CORREU!" animation on truco_run event
  useEffect(() => {
    if (!gameState) return;
    const eventKey = `${gameState.lastEvent}-${gameState.lastEventData}`;
    if (gameState.lastEvent === 'truco_run' && eventKey !== prevRunEventRef.current) {
      prevRunEventRef.current = eventKey;
      setShowRunAnimation(true);
      const timer = setTimeout(() => setShowRunAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.lastEvent, gameState?.lastEventData]);

  // Auto-setup for AI mode
  useEffect(() => {
    if (mode === 'ai' && !initialized && !connected) {
      setInitialized(true);
      (async () => {
        const roomId = await create(playerName);
        if (roomId) {
          setTimeout(() => {
            addBot();
            addBot();
            addBot();
            setTimeout(() => startGame(), 500);
          }, 500);
        }
      })();
    }
  }, [mode, initialized, connected, create, playerName, addBot, startGame]);

  const handlePlayCard = useCallback((index: number) => {
    playSoundFn('card_play');
    playCard(index);
  }, [playCard, playSoundFn]);

  const handleCallTruco = useCallback(() => {
    callTruco();
  }, [callTruco]);

  const handleRespondTruco = useCallback((response: 'accept' | 'run' | 'raise') => {
    respondTruco(response);
  }, [respondTruco]);

  const handleLeave = useCallback(() => {
    leave();
    router.push('/');
  }, [leave, router]);

  const handleRestart = useCallback(() => {
    restartGame();
  }, [restartGame]);

  // Loading state
  if (!connected || !gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-amber-400 text-xl mb-4">Conectando...</div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  const myPlayer = gameState.players.get(sessionId);
  if (!myPlayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-amber-400 text-xl">Carregando jogo...</div>
      </div>
    );
  }

  // Build player names map
  const playerNames: Record<number, string> = {};
  gameState.players.forEach((p) => {
    playerNames[p.position] = p.name;
  });

  // Get opponents and partner info
  const allPlayers = Array.from(gameState.players.values());
  const partner = allPlayers.find(p => p.team === myPlayer.team && p.id !== sessionId);
  const opponents = allPlayers.filter(p => p.team !== myPlayer.team);

  // Current hand info
  const currentHand = gameState.currentHand;
  const currentRound = currentHand?.rounds[currentHand.currentRound];
  const cardsPlayed = currentRound?.cardsPlayed || [];
  const trucoLevel = currentHand?.trucoLevel ?? -1;
  const handPoints = currentHand?.points ?? 1;
  const roundNumber = currentHand?.currentRound ?? 0;

  // Determine turn
  const isMyTurn = gameState.currentTurn === sessionId;
  const isPlayerTurn = (playerId?: string) => playerId === gameState.currentTurn && gameState.phase === 'playing';
  const currentTurnPlayer = gameState.players.get(gameState.currentTurn);
  const currentPlayerName = currentTurnPlayer?.name || '';

  // Mao de 10: any team with 10+ points, no truco allowed
  const isMaoDe10 = myTeamScore >= 10 || theirTeamScore >= 10;

  // Can call truco?
  const lastTrucoCallerTeam = gameState.trucoCall?.calledByTeam;
  const canTruco =
    gameState.phase === 'playing' &&
    isMyTurn &&
    (trucoLevel === -1 || trucoLevel < 12) &&
    lastTrucoCallerTeam !== myPlayer.team &&
    !isMaoDe10;

  // Truco dialog
  const showTrucoDialog = gameState.phase === 'truco_called' && gameState.trucoCall;
  const isResponder = gameState.trucoCall?.respondingTeam === myPlayer.team;

  // Round results for HUD
  const roundResults = currentHand?.rounds
    .filter(r => r.complete)
    .map((r, i) => ({ winner: r.winner, roundNum: i })) || [];

  // Game over
  const isGameOver = gameState.phase === 'game_over';
  const winnerTeam = gameState.winner;
  const myTeamWon = winnerTeam === myPlayer.team;

  // Scores — always show "Nos" first from the player's perspective
  const myTeamScore = gameState.teams[myPlayer.team]?.score ?? 0;
  const theirTeamScore = gameState.teams[myPlayer.team === 0 ? 1 : 0]?.score ?? 0;
  const scores: [number, number] = [myTeamScore, theirTeamScore];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="p-3 bg-green-900/80 border-b border-green-700/50">
        <GameHUD
          phase={gameState.phase}
          isMyTurn={isMyTurn}
          currentPlayerName={currentPlayerName}
          roundNumber={roundNumber}
          onLeave={handleLeave}
          roundResults={roundResults}
          myTeam={myPlayer.team}
        />
      </div>

      {/* Controls */}
      <div className="absolute top-16 left-4 z-20 flex gap-2">
        <button
          onClick={() => setViewMode(v => v === '2d' ? '3d' : '2d')}
          className="px-3 py-1.5 bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 hover:text-amber-400 transition-colors cursor-pointer"
        >
          {viewMode === '2d' ? 'Modo 3D' : 'Modo 2D'}
        </button>
        <button
          onClick={handleToggleMute}
          className="px-3 py-1.5 bg-green-800/80 border border-green-600/50 rounded-lg text-xs text-green-300 hover:text-amber-400 transition-colors cursor-pointer"
        >
          {muted ? 'Som OFF' : 'Som ON'}
        </button>
      </div>

      {/* Main game area */}
      {viewMode === '3d' ? (
        <div className="flex-1 relative">
          {/* Score board overlay */}
          <div className="absolute top-4 right-4 z-10">
            <ScoreBoard
              scores={scores}
              teamNames={['Nos', 'Eles']}
              currentHandPoints={handPoints}
              trucoLevel={trucoLevel}
              roundResults={roundResults}
              currentRound={roundNumber}
              myTeam={myPlayer.team}
            />
          </div>

          <Table3D
            myPlayer={myPlayer}
            players={allPlayers}
            cardsPlayed={cardsPlayed}
            isMyTurn={isMyTurn}
            canPlay={gameState.phase === 'playing'}
            onPlayCard={handlePlayCard}
            sessionId={sessionId}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative p-4">
          <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
            {/* Score board */}
            <div className="absolute top-4 right-4 z-10">
              <ScoreBoard
                scores={scores}
                teamNames={['Nos', 'Eles']}
                currentHandPoints={handPoints}
                trucoLevel={trucoLevel}
              />
            </div>

            {/* Partner (North) */}
            <div className="flex flex-col items-center gap-2">
              <span className={`text-xs flex items-center gap-1.5 ${isPlayerTurn(partner?.id) ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                {isPlayerTurn(partner?.id) && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                {partner?.name || 'Parceiro'}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: partner?.hand?.length ?? 0 }).map((_, i) => (
                  <Card2D key={i} suit="paus" rank="A" faceDown small />
                ))}
              </div>
            </div>

            {/* Middle row: West - Play Area - East */}
            <div className="flex items-center justify-center gap-8 w-full">
              {/* West opponent */}
              <div className="flex flex-col items-center gap-2">
                <span className={`text-xs flex items-center gap-1.5 ${isPlayerTurn(opponents[0]?.id) ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                  {isPlayerTurn(opponents[0]?.id) && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                  {opponents[0]?.name || 'Oponente'}
                </span>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: opponents[0]?.hand?.length ?? 0 }).map((_, i) => (
                    <Card2D key={i} suit="paus" rank="A" faceDown small />
                  ))}
                </div>
              </div>

              {/* Play Area */}
              <div className="bg-green-700/30 rounded-full w-72 h-72 flex items-center justify-center border-2 border-green-600/20">
                <PlayArea cardsPlayed={cardsPlayed} playerNames={playerNames} />
              </div>

              {/* East opponent */}
              <div className="flex flex-col items-center gap-2">
                <span className={`text-xs flex items-center gap-1.5 ${isPlayerTurn(opponents[1]?.id) ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                  {isPlayerTurn(opponents[1]?.id) && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                  {opponents[1]?.name || 'Oponente'}
                </span>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: opponents[1]?.hand?.length ?? 0 }).map((_, i) => (
                    <Card2D key={i} suit="paus" rank="A" faceDown small />
                  ))}
                </div>
              </div>
            </div>

            {/* Player hand (South) */}
            <div className="mt-4 flex flex-col items-center gap-3">
              <span className={`text-xs flex items-center gap-1.5 ${isMyTurn ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                {isMyTurn && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                {myPlayer.name} (Voce)
              </span>
              <PlayerHand
                cards={myPlayer.hand}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyTurn}
                canPlay={gameState.phase === 'playing'}
              />

              {/* Truco button — below cards */}
              {canTruco && (
                <button
                  onClick={handleCallTruco}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-xl border-2 border-red-800 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer tracking-wider"
                >
                  {trucoLevel === -1 ? 'TRUCO!' : trucoLevel === 4 ? 'SEIS!' : trucoLevel === 6 ? 'DEZ!' : trucoLevel === 10 ? 'DOZE!' : 'TRUCO!'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Truco Dialog */}
      {showTrucoDialog && gameState.trucoCall && (
        <TrucoDialog
          level={gameState.trucoCall.level}
          calledByName={
            gameState.players.get(gameState.trucoCall.calledBy)?.name || 'Alguem'
          }
          isResponder={isResponder}
          canRaise={gameState.trucoCall.level < 12}
          onAccept={() => handleRespondTruco('accept')}
          onRun={() => handleRespondTruco('run')}
          onRaise={() => handleRespondTruco('raise')}
          partnerName={partner?.name}
        />
      )}

      {/* "CORREU!" animation overlay */}
      {showRunAnimation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-zoom-fade">
            <div className="text-7xl font-black text-red-500 animate-shake" style={{ textShadow: '0 0 20px rgba(239,68,68,0.7), 0 4px 8px rgba(0,0,0,0.5)' }}>
              CORREU!
            </div>
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-10 border-2 border-amber-400/50 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className={`text-5xl font-black mb-4 ${myTeamWon ? 'text-amber-400' : 'text-red-400'}`}>
              {myTeamWon ? 'VITORIA!' : 'DERROTA'}
            </div>
            <p className="text-green-200 mb-2">
              Placar final: {scores[0]} x {scores[1]}
            </p>
            <p className="text-green-300/60 text-sm mb-8">
              {myTeamWon ? 'Parabens! Voce e seu parceiro venceram!' : 'Nao foi dessa vez...'}
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" size="lg" className="w-full" onClick={handleRestart}>
                Jogar Novamente
              </Button>
              <Button variant="secondary" size="md" className="w-full" onClick={handleLeave}>
                Voltar ao Menu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-amber-400">Carregando jogo...</div>}>
      <GameContent />
    </Suspense>
  );
}
