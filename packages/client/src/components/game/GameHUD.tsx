'use client';

import Button from '../ui/Button';

interface GameHUDProps {
  phase: string;
  isMyTurn: boolean;
  currentPlayerName: string;
  roundNumber: number;
  onLeave: () => void;
  roundResults: Array<{ winner: number; roundNum: number }>;
  myTeam: number;
}

export default function GameHUD({
  phase,
  isMyTurn,
  currentPlayerName,
  roundNumber,
  onLeave,
  roundResults,
  myTeam,
}: GameHUDProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Turn info */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm text-green-200">
            {phase === 'playing'
              ? isMyTurn
                ? 'Sua vez!'
                : `Vez de ${currentPlayerName}`
              : phase === 'truco_called'
                ? 'Truco pedido!'
                : phase === 'round_end'
                  ? 'Fim da rodada'
                  : phase === 'hand_end'
                    ? 'Fim da mao'
                    : phase === 'game_over'
                      ? 'Fim do jogo!'
                      : ''
            }
          </span>
        </div>
        <span className="text-xs text-green-400/50">
          Rodada {roundNumber + 1}/3
        </span>

        {/* Round results */}
        {roundResults.length > 0 && (
          <div className="flex gap-2 mt-1">
            {roundResults.map((r, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded ${
                  r.winner === myTeam
                    ? 'bg-blue-600/30 text-blue-300'
                    : r.winner === -1
                      ? 'bg-gray-600/30 text-gray-300'
                      : 'bg-red-600/30 text-red-300'
                }`}
              >
                R{r.roundNum + 1}: {r.winner === myTeam ? 'Nos' : r.winner === -1 ? 'Empate' : 'Eles'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: Leave */}
      <button
        onClick={onLeave}
        className="text-green-400/40 hover:text-red-400 transition-colors text-sm cursor-pointer"
      >
        Sair
      </button>
    </div>
  );
}
