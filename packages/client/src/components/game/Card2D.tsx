'use client';

interface Card2DProps {
  suit: string;
  rank: string;
  faceDown?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  small?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  copas: '\u2665',
  espadas: '\u2660',
  ouros: '\u2666',
  paus: '\u2663',
};

const SUIT_COLORS: Record<string, string> = {
  copas: 'text-red-500',
  espadas: 'text-gray-900',
  ouros: 'text-red-500',
  paus: 'text-gray-900',
};

function isManilha(rank: string, suit: string): boolean {
  return (
    (rank === '4' && suit === 'paus') ||
    (rank === '7' && suit === 'copas') ||
    (rank === 'A' && suit === 'espadas') ||
    (rank === '7' && suit === 'ouros')
  );
}

export default function Card2D({
  suit,
  rank,
  faceDown = false,
  onClick,
  disabled = false,
  highlighted = false,
  small = false,
}: Card2DProps) {
  const sizeClass = small ? 'w-14 h-20 text-sm' : 'w-20 h-28 text-lg';
  const manilha = isManilha(rank, suit);

  if (faceDown) {
    return (
      <div
        className={`${sizeClass} rounded-lg border-2 border-gray-600 bg-gradient-to-br from-blue-800 to-blue-950 shadow-lg flex items-center justify-center`}
      >
        <div className="text-blue-400/30 text-2xl font-bold">T</div>
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        ${sizeClass} rounded-lg border-2 bg-white shadow-lg flex flex-col items-center justify-between p-1.5
        transition-all duration-200
        ${disabled ? 'opacity-60 cursor-not-allowed' : onClick ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : ''}
        ${highlighted ? 'ring-2 ring-amber-400 border-amber-400' : 'border-gray-300'}
        ${manilha ? 'ring-2 ring-yellow-400/50' : ''}
      `}
    >
      <div className={`${SUIT_COLORS[suit]} font-bold self-start leading-none`}>
        <div>{rank}</div>
        <div className="text-xs">{SUIT_SYMBOLS[suit]}</div>
      </div>
      {!small && (
        <div className={`${SUIT_COLORS[suit]} text-3xl`}>
          {SUIT_SYMBOLS[suit]}
        </div>
      )}
      <div className={`${SUIT_COLORS[suit]} font-bold self-end leading-none rotate-180`}>
        <div>{rank}</div>
        <div className="text-xs">{SUIT_SYMBOLS[suit]}</div>
      </div>
    </div>
  );
}
