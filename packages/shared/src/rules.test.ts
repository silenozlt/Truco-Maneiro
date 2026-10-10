import { describe, it, expect } from 'vitest';
import {
  resolveRound,
  resolveHand,
  isHandComplete,
  needsThirdRound,
  getHandPoints,
  canCallTruco,
  getNextTrucoLevel,
  isGameOver,
  getWinner,
  isMaoDeFerro,
  getPlayOrder,
} from './rules';
import { PlayedCard, Round, TeamState } from './types';

const makeCard = (rank: string, suit: string) => ({
  rank: rank as any,
  suit: suit as any,
  id: `${rank}-${suit}`,
});

const makePlay = (rank: string, suit: string, position: 0 | 1 | 2 | 3): PlayedCard => ({
  playerId: `player-${position}`,
  card: makeCard(rank, suit),
  position,
});

describe('resolveRound', () => {
  it('should return the team with the strongest card', () => {
    const cards: PlayedCard[] = [
      makePlay('3', 'copas', 0),   // Team 0, strength 10
      makePlay('2', 'espadas', 1), // Team 1, strength 9
      makePlay('K', 'ouros', 2),   // Team 0, strength 7
      makePlay('Q', 'paus', 3),    // Team 1, strength 5
    ];
    expect(resolveRound(cards)).toBe(0); // Team 0 wins (3♥)
  });

  it('should return null for a tie', () => {
    const cards: PlayedCard[] = [
      makePlay('3', 'copas', 0),    // Team 0, strength 10
      makePlay('3', 'espadas', 1),  // Team 1, strength 10
      makePlay('4', 'copas', 2),    // Team 0, strength 1
      makePlay('5', 'ouros', 3),    // Team 1, strength 2
    ];
    // The two 3s tie for highest, so it's a draw
    expect(resolveRound(cards)).toBe(null);
  });

  it('should recognize manilha as stronger than 3', () => {
    const cards: PlayedCard[] = [
      makePlay('3', 'copas', 0),     // Team 0, strength 10
      makePlay('7', 'ouros', 1),     // Team 1, manilha strength 11
    ];
    expect(resolveRound(cards)).toBe(1); // Team 1 wins (7♦ manilha)
  });

  it('should correctly rank Zap as strongest', () => {
    const cards: PlayedCard[] = [
      makePlay('4', 'paus', 0),      // Team 0, Zap = 14
      makePlay('7', 'copas', 1),     // Team 1, Copas manilha = 13
      makePlay('A', 'espadas', 2),   // Team 0, Espadilha = 12
      makePlay('7', 'ouros', 3),     // Team 1, Ouros manilha = 11
    ];
    expect(resolveRound(cards)).toBe(0); // Team 0 wins (Zap)
  });
});

describe('resolveHand', () => {
  const makeRound = (winner: 0 | 1 | null): Round => ({
    cardsPlayed: [],
    winner,
    complete: true,
  });

  it('should return winner when same team wins first 2 rounds', () => {
    const rounds = [makeRound(0), makeRound(0)];
    expect(resolveHand(rounds, 0)).toBe(0);
  });

  it('should return round 1 winner when round 2 is tied', () => {
    const rounds = [makeRound(1), makeRound(null)];
    expect(resolveHand(rounds, 0)).toBe(1);
  });

  it('should return round 2 winner when round 1 is tied', () => {
    const rounds = [makeRound(null), makeRound(0)];
    expect(resolveHand(rounds, 0)).toBe(0);
  });

  it('should need round 3 when teams split first 2 rounds', () => {
    const rounds = [makeRound(0), makeRound(1)];
    expect(resolveHand(rounds, 0)).toBe(null); // Need round 3
  });

  it('should return round 3 winner', () => {
    const rounds = [makeRound(0), makeRound(1), makeRound(0)];
    expect(resolveHand(rounds, 0)).toBe(0);
  });

  it('should return null (no winner) when all rounds tied', () => {
    const rounds = [makeRound(null), makeRound(null), makeRound(null)];
    // Truco Mineiro: all tied = no points, new hand
    expect(resolveHand(rounds, 0)).toBe(null);
  });

  it('should return round 1 winner when rounds split and round 3 ties', () => {
    const rounds = [makeRound(0), makeRound(1), makeRound(null)];
    expect(resolveHand(rounds, 0)).toBe(0);
  });
});

describe('needsThirdRound', () => {
  const makeRound = (winner: 0 | 1 | null): Round => ({
    cardsPlayed: [],
    winner,
    complete: true,
  });

  it('should not need third round when same team wins both', () => {
    expect(needsThirdRound([makeRound(0), makeRound(0)])).toBe(false);
  });

  it('should not need third round when round 1 winner and round 2 tied', () => {
    expect(needsThirdRound([makeRound(1), makeRound(null)])).toBe(false);
  });

  it('should need third round when teams split', () => {
    expect(needsThirdRound([makeRound(0), makeRound(1)])).toBe(true);
  });

  it('should need third round when both rounds tied', () => {
    expect(needsThirdRound([makeRound(null), makeRound(null)])).toBe(true);
  });
});

describe('getHandPoints', () => {
  it('should return 2 for no truco (Truco Mineiro base)', () => {
    expect(getHandPoints(null)).toBe(2);
  });

  it('should return the truco level as points', () => {
    expect(getHandPoints(4)).toBe(4);
    expect(getHandPoints(6)).toBe(6);
    expect(getHandPoints(10)).toBe(10);
    expect(getHandPoints(12)).toBe(12);
  });
});

describe('canCallTruco', () => {
  it('should allow first truco call', () => {
    expect(canCallTruco(null, null, 0, null)).toBe(true);
  });

  it('should not allow call when there is a pending call', () => {
    const pending = { level: 4 as const, calledBy: 'p1', calledByTeam: 0 as const, respondingTeam: 1 as const, status: 'pending' as const };
    expect(canCallTruco(null, pending, 1, 0)).toBe(false);
  });

  it('should not allow raise beyond 12', () => {
    expect(canCallTruco(12, null, 1, 0)).toBe(false);
  });

  it('should not allow same team to raise their own call', () => {
    expect(canCallTruco(4, null, 0, 0)).toBe(false);
  });

  it('should allow opposing team to raise', () => {
    expect(canCallTruco(4, null, 1, 0)).toBe(true);
  });
});

describe('getNextTrucoLevel', () => {
  it('should return 4 for initial call', () => {
    expect(getNextTrucoLevel(null)).toBe(4);
  });

  it('should return correct next levels (4→6→10→12)', () => {
    expect(getNextTrucoLevel(4)).toBe(6);
    expect(getNextTrucoLevel(6)).toBe(10);
    expect(getNextTrucoLevel(10)).toBe(12);
    expect(getNextTrucoLevel(12)).toBe(null);
  });
});

describe('isGameOver / getWinner', () => {
  it('should detect game over when team 0 reaches 12', () => {
    const teams: [TeamState, TeamState] = [
      { score: 12, players: [] },
      { score: 8, players: [] },
    ];
    expect(isGameOver(teams)).toBe(true);
    expect(getWinner(teams)).toBe(0);
  });

  it('should detect game over when team 1 reaches 12', () => {
    const teams: [TeamState, TeamState] = [
      { score: 5, players: [] },
      { score: 12, players: [] },
    ];
    expect(isGameOver(teams)).toBe(true);
    expect(getWinner(teams)).toBe(1);
  });

  it('should not be game over before 12 points', () => {
    const teams: [TeamState, TeamState] = [
      { score: 11, players: [] },
      { score: 11, players: [] },
    ];
    expect(isGameOver(teams)).toBe(false);
    expect(getWinner(teams)).toBe(null);
  });
});

describe('isMaoDeFerro', () => {
  it('should be true when both teams have 10+', () => {
    const teams: [TeamState, TeamState] = [
      { score: 10, players: [] },
      { score: 11, players: [] },
    ];
    expect(isMaoDeFerro(teams)).toBe(true);
  });

  it('should be false when one team has less than 10', () => {
    const teams: [TeamState, TeamState] = [
      { score: 9, players: [] },
      { score: 11, players: [] },
    ];
    expect(isMaoDeFerro(teams)).toBe(false);
  });
});

describe('getPlayOrder', () => {
  it('should start from dealer+1 and go clockwise', () => {
    const players = [
      { id: 'p0', position: 0 as const },
      { id: 'p1', position: 1 as const },
      { id: 'p2', position: 2 as const },
      { id: 'p3', position: 3 as const },
    ];
    expect(getPlayOrder(0, players)).toEqual(['p1', 'p2', 'p3', 'p0']);
    expect(getPlayOrder(2, players)).toEqual(['p3', 'p0', 'p1', 'p2']);
  });
});
