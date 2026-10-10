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
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs sm:text-sm text-green-200">
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
        <span className="text-[10px] sm:text-xs text-green-400/50">
          Rodada {roundNumber + 1}/3
        </span>
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
