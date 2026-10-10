import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, getCardStrength, compareCards, isManilha, dealCards, getHandStrength } from './deck';
import { Card } from './types';

describe('createDeck', () => {
  it('should create a deck with 40 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);
  });

  it('should have 10 cards per suit', () => {
    const deck = createDeck();
    const suits = ['copas', 'espadas', 'ouros', 'paus'] as const;
    for (const suit of suits) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards).toHaveLength(10);
    }
  });

  it('should have unique card ids', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(40);
  });
});

describe('shuffleDeck', () => {
  it('should return the same number of cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck([...deck]);
    expect(shuffled).toHaveLength(40);
  });

  it('should contain all the same cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck([...deck]);
    const originalIds = deck.map(c => c.id).sort();
    const shuffledIds = shuffled.map(c => c.id).sort();
    expect(shuffledIds).toEqual(originalIds);
  });
});

describe('getCardStrength', () => {
  it('should return correct strength for regular cards', () => {
    expect(getCardStrength({ rank: '4', suit: 'copas', id: '4-copas' })).toBe(1);
    expect(getCardStrength({ rank: '3', suit: 'copas', id: '3-copas' })).toBe(10);
    expect(getCardStrength({ rank: 'A', suit: 'copas', id: 'A-copas' })).toBe(8);
  });

  it('should return highest strength for Zap (4♣)', () => {
    const zap: Card = { rank: '4', suit: 'paus', id: '4-paus' };
    expect(getCardStrength(zap)).toBe(14);
  });

  it('should return correct manilha strengths', () => {
    const copas: Card = { rank: '7', suit: 'copas', id: '7-copas' };
    const espadilha: Card = { rank: 'A', suit: 'espadas', id: 'A-espadas' };
    const ouros: Card = { rank: '7', suit: 'ouros', id: '7-ouros' };

    expect(getCardStrength(copas)).toBe(13);
    expect(getCardStrength(espadilha)).toBe(12);
    expect(getCardStrength(ouros)).toBe(11);
  });

  it('should rank manilhas higher than any regular card', () => {
    const tres: Card = { rank: '3', suit: 'espadas', id: '3-espadas' };
    const ouros: Card = { rank: '7', suit: 'ouros', id: '7-ouros' };
    expect(getCardStrength(ouros)).toBeGreaterThan(getCardStrength(tres));
  });
});

describe('isManilha', () => {
  it('should identify manilhas correctly', () => {
    expect(isManilha({ rank: '4', suit: 'paus', id: '4-paus' })).toBe(true);
    expect(isManilha({ rank: '7', suit: 'copas', id: '7-copas' })).toBe(true);
    expect(isManilha({ rank: 'A', suit: 'espadas', id: 'A-espadas' })).toBe(true);
    expect(isManilha({ rank: '7', suit: 'ouros', id: '7-ouros' })).toBe(true);
  });

  it('should return false for non-manilhas', () => {
    expect(isManilha({ rank: '4', suit: 'copas', id: '4-copas' })).toBe(false);
    expect(isManilha({ rank: '3', suit: 'paus', id: '3-paus' })).toBe(false);
    expect(isManilha({ rank: '7', suit: 'paus', id: '7-paus' })).toBe(false);
  });
});

describe('compareCards', () => {
  it('should correctly compare regular cards', () => {
    const tres: Card = { rank: '3', suit: 'copas', id: '3-copas' };
    const quatro: Card = { rank: '4', suit: 'copas', id: '4-copas' };
    expect(compareCards(tres, quatro)).toBeGreaterThan(0);
  });

  it('should correctly compare manilhas against regular cards', () => {
    const zap: Card = { rank: '4', suit: 'paus', id: '4-paus' };
    const tres: Card = { rank: '3', suit: 'copas', id: '3-copas' };
    expect(compareCards(zap, tres)).toBeGreaterThan(0);
  });

  it('should correctly order manilhas', () => {
    const zap: Card = { rank: '4', suit: 'paus', id: '4-paus' };
    const copas: Card = { rank: '7', suit: 'copas', id: '7-copas' };
    const espadilha: Card = { rank: 'A', suit: 'espadas', id: 'A-espadas' };
    const ouros: Card = { rank: '7', suit: 'ouros', id: '7-ouros' };

    expect(compareCards(zap, copas)).toBeGreaterThan(0);
    expect(compareCards(copas, espadilha)).toBeGreaterThan(0);
    expect(compareCards(espadilha, ouros)).toBeGreaterThan(0);
  });

  it('should return 0 for cards of same rank (non-manilhas)', () => {
    const tresCopas: Card = { rank: '3', suit: 'copas', id: '3-copas' };
    const tresEspadas: Card = { rank: '3', suit: 'espadas', id: '3-espadas' };
    expect(compareCards(tresCopas, tresEspadas)).toBe(0);
  });
});

describe('dealCards', () => {
  it('should deal 4 hands of 3 cards each', () => {
    const deck = createDeck();
    const hands = dealCards(deck);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(3);
    }
  });

  it('should deal unique cards', () => {
    const deck = createDeck();
    const hands = dealCards(deck);
    const allCards = hands.flat();
    const ids = new Set(allCards.map(c => c.id));
    expect(ids.size).toBe(12);
  });
});

describe('getHandStrength', () => {
  it('should sum card strengths', () => {
    const hand: Card[] = [
      { rank: '4', suit: 'paus', id: '4-paus' },   // Zap = 14
      { rank: '3', suit: 'copas', id: '3-copas' },  // 3 = 10
      { rank: 'A', suit: 'copas', id: 'A-copas' },  // A = 8
    ];
    expect(getHandStrength(hand)).toBe(32);
  });
});
