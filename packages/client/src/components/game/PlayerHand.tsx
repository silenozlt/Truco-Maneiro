'use client';

import Card2D from './Card2D';

interface CardData {
  suit: string;
  rank: string;
  id: string;
}

interface PlayerHandProps {
  cards: CardData[];
  onPlayCard: (index: number) => void;
  isMyTurn: boolean;
  canPlay: boolean;
}

export default function PlayerHand({ cards, onPlayCard, isMyTurn, canPlay }: PlayerHandProps) {
  return (
    <div className="flex gap-1.5 sm:gap-3 items-end justify-center">
      {cards.map((card, index) => (
        <div
          key={card.id}
          className={`transition-transform duration-300 ${
            isMyTurn && canPlay ? 'animate-pulse-subtle' : ''
          }`}
          style={{
            transform: `rotate(${(index - 1) * 5}deg)`,
          }}
        >
          <Card2D
            suit={card.suit}
            rank={card.rank}
            onClick={() => onPlayCard(index)}
            disabled={!isMyTurn || !canPlay}
            highlighted={isMyTurn && canPlay}
          />
        </div>
      ))}
    </div>
  );
}
