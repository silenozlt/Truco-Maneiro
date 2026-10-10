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
import ChatBox, { PlayerBubble } from '../../components/game/ChatBox';
import Button from '../../components/ui/Button';
import { useAudio } from '../../hooks/useAudio';
import { recordMatch } from '../../lib/stats';
import { initializeAdMob, showInterstitial } from '../../lib/admob';

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
  const difficulty = searchParams.get('difficulty') || 'medium';
  const myAvatar = searchParams.get('avatar') || '🤠';

  const {
    gameState,
    sessionId,
    connected,
    error,
    chatMessages,
    create,
    addBot,
    startGame,
    playCard,
    callTruco,
    respondTruco,
    restartGame,
    sendChat,
    leave,
  } = useColyseus();

  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showRunAnimation, setShowRunAnimation] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [playerBubbles, setPlayerBubbles] = useState<Record<string, string>>({});
  const bubbleTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const prevRunEventRef = useRef<string>('');
  const statsRecordedRef = useRef(false);
  const trucoStatsRef = useRef({ calledByMe: 0, calledByOpponent: 0, accepted: 0, ran: 0 });

  // Audio
  const { muted, initialize: initializeAudio, toggleMute: handleToggleMute, playSound: playSoundFn } = useAudio(gameState, sessionId);

  // Initialize audio on first click + AdMob
  useEffect(() => {
    initializeAdMob();
    const handler = () => { initializeAudio(); window.removeEventListener('click', handler); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [initializeAudio]);

  // Track truco stats
  useEffect(() => {
    if (!gameState) return;
    const ev = gameState.lastEvent;
    if (ev === 'truco_called' || ev === 'truco_raised') {
      const callerTeam = gameState.trucoCall?.calledByTeam;
      const myPlayer = gameState.players.get(sessionId);
      if (myPlayer && callerTeam === myPlayer.team) {
        trucoStatsRef.current.calledByMe++;
      } else {
        trucoStatsRef.current.calledByOpponent++;
      }
    } else if (ev === 'truco_accepted') {
      trucoStatsRef.current.accepted++;
    } else if (ev === 'truco_run') {
      trucoStatsRef.current.ran++;
    }
  }, [gameState?.lastEvent, gameState?.lastEventData]);

  // Record match stats on game over
  useEffect(() => {
    if (!gameState || gameState.phase !== 'game_over' || statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    const myPlayer = gameState.players.get(sessionId);
    if (!myPlayer) return;
    const myScore = gameState.teams[myPlayer.team]?.score ?? 0;
    const theirScore = gameState.teams[myPlayer.team === 0 ? 1 : 0]?.score ?? 0;
    recordMatch({
      date: new Date().toISOString(),
      won: gameState.winner === myPlayer.team,
      myScore,
      theirScore,
      difficulty,
      trucosCalledByMe: trucoStatsRef.current.calledByMe,
      trucosCalledByOpponent: trucoStatsRef.current.calledByOpponent,
      trucosAccepted: trucoStatsRef.current.accepted,
      trucosRan: trucoStatsRef.current.ran,
    });
  }, [gameState?.phase]);

  // Show chat bubbles near players
  const prevChatCount = useRef(0);
  useEffect(() => {
    if (chatMessages.length > prevChatCount.current) {
      const newMsgs = chatMessages.slice(prevChatCount.current);
      for (const msg of newMsgs) {
        setPlayerBubbles(prev => ({ ...prev, [msg.playerId]: msg.message }));
        // Clear previous timer for this player
        if (bubbleTimers.current[msg.playerId]) {
          clearTimeout(bubbleTimers.current[msg.playerId]);
        }
        // Auto-clear after 4 seconds
        bubbleTimers.current[msg.playerId] = setTimeout(() => {
          setPlayerBubbles(prev => {
            const next = { ...prev };
            delete next[msg.playerId];
            return next;
          });
        }, 4000);
      }
    }
    prevChatCount.current = chatMessages.length;
  }, [chatMessages.length]);

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
        const roomId = await create(playerName, difficulty);
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

  const handleLeave = useCallback(async () => {
    if (gameState?.phase === 'game_over') {
      await showInterstitial();
    }
    leave();
    router.push('/');
  }, [leave, router, gameState?.phase]);

  const handleRestart = useCallback(async () => {
    if (gameState?.phase === 'game_over') {
      await showInterstitial();
    }
    restartGame();
  }, [restartGame, gameState?.phase]);

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

  // Can call truco?
  const lastTrucoCallerTeam = gameState.trucoCall?.calledByTeam;

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

  // Mao de 10: any team with 10+ points, no truco allowed
  const isMaoDe10 = myTeamScore >= 10 || theirTeamScore >= 10;
  const canTruco =
    gameState.phase === 'playing' &&
    isMyTurn &&
    (trucoLevel === -1 || trucoLevel < 12) &&
    lastTrucoCallerTeam !== myPlayer.team &&
    !isMaoDe10;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="p-2 sm:p-3 bg-green-900/80 border-b border-green-700/50">
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

      {/* Floating menu - bottom left */}
      <div className="fixed bottom-4 left-3 z-30">
        {showMenu && (
          <div className="absolute bottom-12 left-0 bg-green-900/95 border border-green-600/50 rounded-xl p-2 flex flex-col gap-1.5 shadow-xl animate-fade-in min-w-[120px]">
            <button
              onClick={() => { setViewMode(v => v === '2d' ? '3d' : '2d'); setShowMenu(false); }}
              className="px-3 py-2 text-left text-xs text-green-200 hover:bg-green-700/50 rounded-lg transition-colors cursor-pointer"
            >
              {viewMode === '2d' ? '3D' : '2D'} Vista
            </button>
            <button
              onClick={() => { handleToggleMute(); setShowMenu(false); }}
              className="px-3 py-2 text-left text-xs text-green-200 hover:bg-green-700/50 rounded-lg transition-colors cursor-pointer"
            >
              Som {muted ? 'OFF' : 'ON'}
            </button>
            <button
              onClick={() => { window.open('/regras', '_blank'); setShowMenu(false); }}
              className="px-3 py-2 text-left text-xs text-green-200 hover:bg-green-700/50 rounded-lg transition-colors cursor-pointer"
            >
              Regras
            </button>
          </div>
        )}
        <button
          onClick={() => setShowMenu(v => !v)}
          className="w-10 h-10 bg-green-800/90 border border-green-600/50 rounded-full text-green-300 hover:text-amber-400 transition-colors cursor-pointer shadow-lg flex items-center justify-center text-lg"
        >
          {showMenu ? '✕' : '⚙'}
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
        <div className="flex-1 flex flex-col items-center relative p-2 sm:p-4">
          {/* Score bar - round on left, general on right */}
          <div className="flex items-stretch justify-between w-full max-w-2xl mb-2 sm:mb-4 gap-2">
            {/* Left: Round indicators */}
            <div className="bg-green-800/60 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 border border-green-600/30 flex items-center gap-2 sm:gap-3">
              {[0, 1, 2].map((roundIdx) => {
                const result = roundResults.find(r => r.roundNum === roundIdx);
                const isCurrent = roundIdx === roundNumber && !result;
                const won = result && result.winner === myPlayer.team;
                const lost = result && result.winner !== -1 && result.winner !== myPlayer.team;
                const tied = result && result.winner === -1;
                return (
                  <div key={roundIdx} className={`flex items-center gap-0.5 sm:gap-1 ${isCurrent ? 'text-amber-400' : 'text-green-400/40'}`}>
                    <span className="text-[10px] sm:text-xs font-medium">{roundIdx + 1}a</span>
                    {won && <span className="text-blue-300 font-bold text-xs sm:text-sm">✔</span>}
                    {lost && <span className="text-red-300 font-bold text-xs sm:text-sm">✔</span>}
                    {tied && <span className="text-gray-400 text-xs sm:text-sm">—</span>}
                    {isCurrent && <span className="text-amber-300 text-xs sm:text-sm animate-pulse">●</span>}
                    {!result && !isCurrent && <span className="text-green-600/30 text-xs sm:text-sm">○</span>}
                  </div>
                );
              })}
              <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${trucoLevel >= 4 ? 'text-red-400 bg-red-900/30' : 'text-amber-400 bg-amber-900/30'}`}>
                {handPoints}pt
              </span>
            </div>

            {/* Right: General score */}
            <div className="bg-green-800/60 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-green-600/30 flex items-center gap-2 sm:gap-4">
              <div className="text-center">
                <div className="text-blue-400 text-[9px] sm:text-[10px] font-bold leading-none">NOS</div>
                <div className="text-lg sm:text-2xl font-black text-white leading-tight">{scores[0]}</div>
              </div>
              <div className="text-green-500/40 text-xs sm:text-sm font-bold">x</div>
              <div className="text-center">
                <div className="text-red-400 text-[9px] sm:text-[10px] font-bold leading-none">ELES</div>
                <div className="text-lg sm:text-2xl font-black text-white leading-tight">{scores[1]}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 sm:gap-4 w-full max-w-2xl flex-1 justify-center">
            {/* Partner (North) */}
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className={`text-xs flex items-center gap-1.5 ${isPlayerTurn(partner?.id) ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                {isPlayerTurn(partner?.id) && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                <span className="text-sm">{partner?.isBot ? '🤖' : '🧑'}</span>
                {partner?.name || 'Parceiro'}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: partner?.hand?.length ?? 0 }).map((_, i) => (
                  <Card2D key={i} suit="paus" rank="A" faceDown small />
                ))}
              </div>
              <PlayerBubble message={partner?.id ? playerBubbles[partner.id] ?? null : null} />
            </div>

            {/* Middle row: West - Play Area - East */}
            <div className="flex items-center justify-center gap-3 sm:gap-8 w-full">
              {/* West opponent */}
              <div className="flex flex-col items-center gap-1 sm:gap-2 min-w-[50px]">
                <span className={`text-[10px] sm:text-xs flex items-center gap-1 ${isPlayerTurn(opponents[0]?.id) ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                  {isPlayerTurn(opponents[0]?.id) && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-pulse" />}
                  <span className="text-sm">{opponents[0]?.isBot ? '🤖' : '🧑'}</span>
                  {opponents[0]?.name || 'Oponente'}
                </span>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: opponents[0]?.hand?.length ?? 0 }).map((_, i) => (
                    <Card2D key={i} suit="paus" rank="A" faceDown small />
                  ))}
                </div>
                <PlayerBubble message={opponents[0]?.id ? playerBubbles[opponents[0].id] ?? null : null} />
              </div>

              {/* Play Area */}
              <div className="bg-green-700/30 rounded-full w-44 h-44 sm:w-72 sm:h-72 flex items-center justify-center border-2 border-green-600/20 shrink-0">
                <PlayArea cardsPlayed={cardsPlayed} playerNames={playerNames} />
              </div>

              {/* East opponent */}
              <div className="flex flex-col items-center gap-1 sm:gap-2 min-w-[50px]">
                <span className={`text-[10px] sm:text-xs flex items-center gap-1 ${isPlayerTurn(opponents[1]?.id) ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                  {isPlayerTurn(opponents[1]?.id) && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-pulse" />}
                  <span className="text-sm">{opponents[1]?.isBot ? '🤖' : '🧑'}</span>
                  {opponents[1]?.name || 'Oponente'}
                </span>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: opponents[1]?.hand?.length ?? 0 }).map((_, i) => (
                    <Card2D key={i} suit="paus" rank="A" faceDown small />
                  ))}
                </div>
                <PlayerBubble message={opponents[1]?.id ? playerBubbles[opponents[1].id] ?? null : null} />
              </div>
            </div>

            {/* Player hand (South) */}
            <div className="mt-2 sm:mt-4 flex flex-col items-center gap-2 sm:gap-3">
              <span className={`text-xs flex items-center gap-1.5 ${isMyTurn ? 'text-amber-400 font-bold' : 'text-green-300/60'}`}>
                {isMyTurn && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                <span className="text-sm">{myAvatar}</span>
                {myPlayer.name} (Voce)
              </span>
              <PlayerHand
                cards={myPlayer.hand}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyTurn}
                canPlay={gameState.phase === 'playing'}
              />

              <PlayerBubble message={playerBubbles[sessionId] ?? null} />

              {/* Truco button — below cards */}
              {canTruco && (
                <button
                  onClick={handleCallTruco}
                  className="px-5 py-2 sm:px-8 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-black text-base sm:text-xl rounded-xl border-2 border-red-800 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer tracking-wider"
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
            <div className="text-5xl sm:text-7xl font-black text-red-500 animate-shake" style={{ textShadow: '0 0 20px rgba(239,68,68,0.7), 0 4px 8px rgba(0,0,0,0.5)' }}>
              CORREU!
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <ChatBox onSend={sendChat} />

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-6 sm:p-10 border-2 border-amber-400/50 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className={`text-4xl sm:text-5xl font-black mb-3 sm:mb-4 ${myTeamWon ? 'text-amber-400' : 'text-red-400'}`}>
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
