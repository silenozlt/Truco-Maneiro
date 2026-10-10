import {
  Card,
  PlayedCard,
  Round,
  Hand,
  TeamState,
  TeamId,
  TrucoLevel,
  TrucoCall,
  PlayerPosition,
  GameState,
} from './types';
import { compareCards, getCardStrength } from './deck';
import {
  POINTS_TO_WIN,
  NEXT_TRUCO_LEVEL,
  POSITION_TO_TEAM,
  PLAYERS_PER_GAME,
  ROUNDS_PER_HAND,
} from './constants';

/**
 * Resolves which team won a round based on the cards played.
 * Returns the winning team or null for a tie (empate).
 */
export function resolveRound(cardsPlayed: PlayedCard[]): TeamId | null {
  const result = resolveRoundDetailed(cardsPlayed);
  return result?.winnerTeam ?? null;
}

/**
 * Resolves a round and returns both the winning team and the player who played the winning card.
 * Returns null for a tie (empate).
 */
export function resolveRoundDetailed(cardsPlayed: PlayedCard[]): { winnerTeam: TeamId; winnerPlayerId: string } | null {
  if (cardsPlayed.length === 0) return null;

  let bestPlay = cardsPlayed[0];
  let bestStrength = getCardStrength(bestPlay.card);
  let isTied = false;

  for (let i = 1; i < cardsPlayed.length; i++) {
    const play = cardsPlayed[i];
    const strength = getCardStrength(play.card);

    if (strength > bestStrength) {
      bestPlay = play;
      bestStrength = strength;
      isTied = false;
    } else if (strength === bestStrength) {
      // Cards of same rank but different suits (non-manilhas) tie
      isTied = true;
    }
  }

  if (isTied) {
    return null; // empate
  }

  return {
    winnerTeam: POSITION_TO_TEAM[bestPlay.position],
    winnerPlayerId: bestPlay.playerId,
  };
}

/**
 * Resolves who won the hand based on the 3 rounds played.
 *
 * Truco Mineiro rules:
 * - Best of 3 rounds
 * - If a team wins the first 2 rounds, they win (3rd round not played)
 * - If round 1 is tied: whoever wins round 2 wins the hand
 * - If round 1 has a winner and round 2 is tied: round 1 winner wins the hand
 * - If rounds 1 and 2 are tied: whoever wins round 3 wins the hand
 * - If all 3 rounds are tied: NO ONE wins (no points awarded, new hand)
 * - If rounds 1+2 split and round 3 ties: round 1 winner wins
 */
export function resolveHand(rounds: Round[], dealerPosition: PlayerPosition): TeamId | null {
  const completedRounds = rounds.filter(r => r.complete);

  if (completedRounds.length === 0) return null;

  const r1 = completedRounds[0]?.winner ?? null;
  const r2 = completedRounds.length > 1 ? completedRounds[1]?.winner ?? null : undefined;
  const r3 = completedRounds.length > 2 ? completedRounds[2]?.winner ?? null : undefined;

  // After round 1 only
  if (r2 === undefined) return null; // Need at least 2 rounds

  // Round 1 winner + Round 2 winner (same team) → that team wins
  if (r1 !== null && r1 === r2) return r1;

  // Round 1 winner + Round 2 tied → Round 1 winner wins
  if (r1 !== null && r2 === null) return r1;

  // Round 1 tied + Round 2 winner → Round 2 winner wins
  if (r1 === null && r2 !== null) return r2;

  // Both teams won one round each, need round 3
  if (r1 !== null && r2 !== null && r1 !== r2) {
    if (r3 === undefined) return null; // Need round 3
    if (r3 !== null) return r3; // Round 3 winner wins
    // Round 3 tied → round 1 winner wins
    return r1;
  }

  // Both rounds tied, need round 3
  if (r1 === null && r2 === null) {
    if (r3 === undefined) return null;
    if (r3 !== null) return r3;
    // All 3 rounds tied → NO ONE wins, no points awarded
    return null;
  }

  return null;
}

/**
 * Checks if the hand is complete (has a winner or all rounds played).
 */
export function isHandComplete(rounds: Round[], dealerPosition: PlayerPosition): boolean {
  const winner = resolveHand(rounds, dealerPosition);

  // If we have a winner after any number of rounds, hand is complete
  if (winner !== null) return true;

  // If all 3 rounds are played, hand is always complete
  const completedRounds = rounds.filter(r => r.complete);
  return completedRounds.length >= ROUNDS_PER_HAND;
}

/**
 * Returns the number of rounds that need to be played.
 * Some hands end after 2 rounds.
 */
export function needsThirdRound(rounds: Round[]): boolean {
  if (rounds.length < 2) return false;

  const r1 = rounds[0].winner;
  const r2 = rounds[1].winner;

  // Same team won both → no need for round 3
  if (r1 !== null && r1 === r2) return false;

  // One team won, other tied → no need for round 3
  if (r1 !== null && r2 === null) return false;
  if (r1 === null && r2 !== null) return false;

  // Different winners or both tied → need round 3
  return true;
}

/**
 * Returns how many points the current hand is worth.
 * Truco Mineiro: normal hand = 2, truco = 4, seis = 6, dez = 10, doze = 12.
 */
export function getHandPoints(trucoLevel: TrucoLevel | null): number {
  if (trucoLevel === null) return 2;
  return trucoLevel;
}

/**
 * Checks if a player can call truco (or raise).
 * Rules:
 * - Can't call truco if there's already a pending truco call
 * - Can't call truco against your own team's truco call
 * - The raising team must be the team that was called (they raise back)
 * - Can't raise beyond 12
 */
export function canCallTruco(
  currentTrucoLevel: TrucoLevel | null,
  pendingTrucoCall: TrucoCall | null,
  playerTeam: TeamId,
  lastTrucoCallerTeam: TeamId | null,
): boolean {
  // If there's a pending call, can't call again
  if (pendingTrucoCall && pendingTrucoCall.status === 'pending') {
    return false;
  }

  // First truco call (level 3)
  if (currentTrucoLevel === null) {
    return true;
  }

  // Can't raise beyond 12
  if (currentTrucoLevel >= 12) {
    return false;
  }

  // Only the team that was called can raise
  // (i.e., if team 0 called truco, only team 1 can raise to 6, then team 0 can raise to 9, etc.)
  if (lastTrucoCallerTeam === playerTeam) {
    return false;
  }

  return true;
}

/**
 * Returns the next truco level (for raising).
 */
export function getNextTrucoLevel(currentLevel: TrucoLevel | null): TrucoLevel | null {
  if (currentLevel === null) return 4;
  return NEXT_TRUCO_LEVEL[currentLevel];
}

/**
 * Checks if the game is over (a team reached 12 points).
 */
export function isGameOver(teams: [TeamState, TeamState]): boolean {
  return teams[0].score >= POINTS_TO_WIN || teams[1].score >= POINTS_TO_WIN;
}

/**
 * Returns the winning team, or null if the game isn't over.
 */
export function getWinner(teams: [TeamState, TeamState]): TeamId | null {
  if (teams[0].score >= POINTS_TO_WIN) return 0;
  if (teams[1].score >= POINTS_TO_WIN) return 1;
  return null;
}

/**
 * Checks if it's "mão de ferro" — both teams have 10+ points.
 * In mão de ferro, cards are played face-down and truco is automatically worth 3.
 * (Simplified for MVP: we'll just mark it but still let players see their cards)
 */
export function isMaoDeFerro(teams: [TeamState, TeamState]): boolean {
  return teams[0].score >= 10 && teams[1].score >= 10;
}

/**
 * Gets the play order starting from the player after the dealer.
 * Play order goes clockwise: dealer+1, dealer+2, dealer+3, dealer.
 */
export function getPlayOrder(
  dealerPosition: PlayerPosition,
  players: { id: string; position: PlayerPosition }[],
): string[] {
  const order: string[] = [];
  for (let i = 1; i <= PLAYERS_PER_GAME; i++) {
    const pos = ((dealerPosition + i) % PLAYERS_PER_GAME) as PlayerPosition;
    const player = players.find(p => p.position === pos);
    if (player) {
      order.push(player.id);
    }
  }
  return order;
}

/**
 * Gets the next player in turn order.
 */
export function getNextTurn(
  currentPlayerId: string,
  playOrder: string[],
): string {
  const currentIndex = playOrder.indexOf(currentPlayerId);
  return playOrder[(currentIndex + 1) % playOrder.length];
}

/**
 * Validates if a player can play a card.
 */
export function canPlayCard(
  playerId: string,
  currentTurn: string | null,
  phase: string,
): boolean {
  if (phase !== 'playing') return false;
  if (currentTurn !== playerId) return false;
  return true;
}
