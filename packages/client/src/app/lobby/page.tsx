'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '../../components/ui/Button';
import { useColyseus } from '../../hooks/useColyseus';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Jogador';

  const {
    gameState,
    sessionId,
    error,
    connected,
    create,
    join,
    startGame,
    addBot,
    leave,
  } = useColyseus();

  const [roomId, setRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Auto redirect to game when game starts
  useEffect(() => {
    if (gameState?.phase === 'playing' || gameState?.phase === 'dealing') {
      router.push('/game');
    }
  }, [gameState?.phase, router]);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const id = await create(playerName);
    if (id) {
      setRoomId(id);
    }
    setIsCreating(false);
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) return;
    const success = await join(joinRoomId.trim(), playerName);
    if (success) {
      setRoomId(joinRoomId.trim());
    }
  };

  const handleFillBots = () => {
    // Add bots until 4 players
    const currentCount = gameState?.playerCount || 0;
    for (let i = currentCount; i < 4; i++) {
      addBot();
    }
  };

  const handleStart = () => {
    startGame();
  };

  const handleBack = () => {
    leave();
    router.push('/');
  };

  // If connected to a room, show room info
  if (connected && roomId) {
    const players = gameState ? Array.from(gameState.players.values()) : [];
    const myPlayer = players.find(p => p.id === sessionId);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-4xl font-black text-amber-400 mb-8">Sala de Espera</h1>

        <div className="bg-green-800/50 rounded-xl p-6 w-full max-w-md border-2 border-green-600/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-200 text-sm">Sala:</span>
            <span className="font-mono text-amber-400 text-lg select-all">{roomId}</span>
          </div>

          <div className="mb-6">
            <h3 className="text-green-200 text-sm font-bold mb-3">
              Jogadores ({gameState?.playerCount || 0}/4)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((pos) => {
                const player = players.find(p => p.position === pos);
                const posNames = ['Sul (Voce)', 'Oeste', 'Norte (Parceiro)', 'Leste'];
                const teamColors = pos % 2 === 0 ? 'border-blue-400/50 bg-blue-900/20' : 'border-red-400/50 bg-red-900/20';

                return (
                  <div
                    key={pos}
                    className={`p-3 rounded-lg border-2 ${teamColors} ${
                      player?.id === sessionId ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <div className="text-xs text-green-300/60 mb-1">{posNames[pos]}</div>
                    {player ? (
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${player.isBot ? 'bg-yellow-400' : 'bg-green-400'}`} />
                        <span className="text-white text-sm font-medium truncate">
                          {player.name}
                          {player.isBot ? ' (Bot)' : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="text-green-500/40 text-sm italic">Vazio</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center text-xs text-green-300/50 mb-4">
            Time 1 (Azul): Sul + Norte | Time 2 (Vermelho): Oeste + Leste
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={handleFillBots}
              disabled={gameState?.playerCount === 4}
            >
              Preencher com Bots
            </Button>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={(gameState?.playerCount || 0) < 4}
            >
              Iniciar Partida
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 mt-4 text-sm">{error}</p>
        )}

        <button
          onClick={handleBack}
          className="mt-6 text-green-400/60 hover:text-green-300 transition-colors text-sm cursor-pointer"
        >
          Voltar ao menu
        </button>
      </div>
    );
  }

  // Lobby: create or join room
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-black text-amber-400 mb-2">Lobby</h1>
      <p className="text-green-300/60 mb-10">Crie ou entre em uma sala</p>

      <div className="w-full max-w-sm space-y-8">
        {/* Create Room */}
        <div className="bg-green-800/30 rounded-xl p-6 border border-green-600/30">
          <h2 className="text-xl font-bold text-amber-200 mb-4">Criar Sala</h2>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? 'Criando...' : 'Criar Nova Sala'}
          </Button>
        </div>

        <div className="text-center text-green-400/40 text-sm">ou</div>

        {/* Join Room */}
        <div className="bg-green-800/30 rounded-xl p-6 border border-green-600/30">
          <h2 className="text-xl font-bold text-amber-200 mb-4">Entrar em Sala</h2>
          <input
            type="text"
            placeholder="Codigo da sala..."
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-green-800/50 border-2 border-green-600/50 text-white placeholder-green-400/50 focus:outline-none focus:border-amber-400 transition-colors mb-3"
          />
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleJoinRoom}
            disabled={!joinRoomId.trim()}
          >
            Entrar
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 mt-6 text-sm">{error}</p>
      )}

      <button
        onClick={() => router.push('/')}
        className="mt-8 text-green-400/60 hover:text-green-300 transition-colors text-sm cursor-pointer"
      >
        Voltar ao menu
      </button>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-amber-400">Carregando...</div>}>
      <LobbyContent />
    </Suspense>
  );
}
