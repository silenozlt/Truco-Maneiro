import { Card, Suit, Rank } from './types';
import { SUITS, RANKS, RANK_STRENGTH, MANILHAS } from './constants';

/**
 * Creates the full 40-card deck used in Truco Mineiro.
 * (Standard deck minus 8s, 9s, 10s, and jokers)
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${rank}-${suit}`,
      });
    }
  }
  return deck;
}

/**
 * Shuffles a deck in-place using the Fisher-Yates algorithm.
 * Returns the same array (mutated).
 */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Returns true if the given card is a manilha.
 */
export function isManilha(card: Card): boolean {
  return getManilhaStrength(card) !== null;
}

/**
 * Returns the manilha strength if the card is a manilha, null otherwise.
 */
function getManilhaStrength(card: Card): number | null {
  for (const manilha of Object.values(MANILHAS)) {
    if (card.rank === manilha.rank && card.suit === manilha.suit) {
      return manilha.strength;
    }
  }
  return null;
}

/**
 * Returns the strength value of a card for comparison purposes.
 * Manilhas have the highest values (11-14).
 * Regular cards use their rank strength (1-10).
 */
export function getCardStrength(card: Card): number {
  const manilhaStr = getManilhaStrength(card);
  if (manilhaStr !== null) {
    return manilhaStr;
  }
  return RANK_STRENGTH[card.rank];
}

/**
 * Compares two cards. Returns:
 *  > 0 if card A wins
 *  < 0 if card B wins
 *  0 if it's a tie (same rank, neither is manilha)
 */
export function compareCards(a: Card, b: Card): number {
  return getCardStrength(a) - getCardStrength(b);
}

/**
 * Returns true if two cards are the same card.
 */
export function isSameCard(a: Card, b: Card): boolean {
  return a.id === b.id;
}

/**
 * Deals cards from the deck to players.
 * Returns an array of 4 hands, each with 3 cards.
 */
export function dealCards(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  const shuffled = shuffleDeck([...deck]);
  return [
    shuffled.slice(0, 3),
    shuffled.slice(3, 6),
    shuffled.slice(6, 9),
    shuffled.slice(9, 12),
  ];
}

/**
 * Returns a human-readable string for a card.
 */
export function cardToString(card: Card): string {
  const suitSymbols: Record<Suit, string> = {
    copas: '♥',
    espadas: '♠',
    ouros: '♦',
    paus: '♣',
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

/**
 * Returns the sum of strength values for a hand of cards.
 * Useful for AI hand evaluation.
 */
export function getHandStrength(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + getCardStrength(card), 0);
}
