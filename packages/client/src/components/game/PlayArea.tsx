'use client';

import Card2D from './Card2D';

interface PlayedCard {
  playerId: string;
  card: { suit: string; rank: string; id: string };
  position: number;
}

interface PlayAreaProps {
  cardsPlayed: PlayedCard[];
  playerNames: Record<number, string>;
}

// Position mapping: 0=South (bottom), 1=West (left), 2=North (top), 3=East (right)
const POSITIONS: Record<number, { className: string }> = {
  0: { className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[-10%]' },
  1: { className: 'left-0 top-1/2 -translate-y-1/2 translate-x-[10%]' },
  2: { className: 'top-0 left-1/2 -translate-x-1/2 translate-y-[10%]' },
  3: { className: 'right-0 top-1/2 -translate-y-1/2 translate-x-[-10%]' },
};

export default function PlayArea({ cardsPlayed, playerNames }: PlayAreaProps) {
  return (
    <div className="relative w-full h-full">
      {cardsPlayed.map((pc) => {
        const pos = POSITIONS[pc.position];
        return (
          <div
            key={pc.card.id}
            className={`absolute ${pos.className} transition-all duration-500 ease-out`}
          >
            <div className="flex flex-col items-center gap-1">
              <Card2D suit={pc.card.suit} rank={pc.card.rank} small />
              <span className="text-xs text-green-300/60">
                {playerNames[pc.position] || ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
