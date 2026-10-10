import {
  getCardStrength,
  isManilha,
  getHandStrength,
  compareCards,
  isMaoDe10,
  type Card,
  type TrucoLevel,
  POSITION_TO_TEAM,
  type PlayerPosition,
  type TeamId,
} from '@truco/shared';
import { PlayerSchema, CardSchema, TrucoGameState, RoundSchema, PlayedCardSchema } from '../state/GameState';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface AIDecision {
  action: 'play_card' | 'call_truco' | 'respond_truco';
  cardIndex?: number;
  trucoResponse?: 'accept' | 'run' | 'raise';
}

/**
 * Evaluate hand strength on a scale of 0-100.
 */
function evaluateHand(cards: Card[]): number {
  const totalStrength = getHandStrength(cards);
  const manilhaCount = cards.filter(c => isManilha(c)).length;

  // Max possible: 3 top manilhas = 14 + 13 + 12 = 39
  // Min possible: 3 weakest = 1 + 2 + 3 = 6
  const normalized = ((totalStrength - 6) / (39 - 6)) * 100;

  // Bonus for manilhas
  const manilhaBonus = manilhaCount * 10;

  return Math.min(100, normalized + manilhaBonus);
}

/**
 * Check if the partner's team is currently winning the round.
 */
function isPartnerWinning(
  roundCards: { card: Card; position: PlayerPosition }[],
  partnerPosition: PlayerPosition,
): boolean {
  if (roundCards.length === 0) return false;

  let bestPlay = roundCards[0];
  for (let i = 1; i < roundCards.length; i++) {
    if (compareCards(roundCards[i].card, bestPlay.card) > 0) {
      bestPlay = roundCards[i];
    }
  }

  return bestPlay.position === partnerPosition;
}

/**
 * Get the best card currently on the table.
 */
function getBestOnTable(
  roundCards: { card: Card; position: PlayerPosition }[],
): Card | null {
  if (roundCards.length === 0) return null;

  let best = roundCards[0].card;
  for (let i = 1; i < roundCards.length; i++) {
    if (compareCards(roundCards[i].card, best) > 0) {
      best = roundCards[i].card;
    }
  }
  return best;
}

// ============================================================
// EASY AI - plays randomly, accepts truco often, never bluffs
// ============================================================

function chooseCardEasy(hand: Card[]): number {
  if (hand.length <= 1) return 0;
  return Math.floor(Math.random() * hand.length);
}

function shouldCallTrucoEasy(): boolean {
  // Easy AI rarely calls truco
  return Math.random() < 0.05;
}

function decideTrucoResponseEasy(handStrength: number): 'accept' | 'run' | 'raise' {
  // Easy AI almost always accepts, rarely runs, never raises
  if (handStrength >= 60) return 'accept';
  if (handStrength >= 30) return Math.random() < 0.7 ? 'accept' : 'run';
  return Math.random() < 0.3 ? 'accept' : 'run';
}

// ============================================================
// MEDIUM AI - original behavior with some improvements
// ============================================================

function chooseCardMedium(
  hand: Card[],
  roundCards: { card: Card; position: PlayerPosition }[],
  partnerPosition: PlayerPosition,
  currentRound: number,
): number {
  if (hand.length === 0) return 0;
  if (hand.length === 1) return 0;

  const indexed = hand.map((card, index) => ({
    card,
    index,
    strength: getCardStrength(card),
  }));
  indexed.sort((a, b) => a.strength - b.strength);

  const partnerWinning = isPartnerWinning(roundCards, partnerPosition);
  const bestOnTable = getBestOnTable(roundCards);

  // Last round: play strongest
  if (currentRound === 2 || hand.length === 1) {
    return indexed[indexed.length - 1].index;
  }

  // Partner winning: play weakest
  if (partnerWinning) {
    return indexed[0].index;
  }

  // Try to beat the best card with minimum effort
  if (bestOnTable !== null) {
    for (const item of indexed) {
      if (compareCards(item.card, bestOnTable) > 0) {
        return item.index;
      }
    }
    return indexed[0].index;
  }

  // First to play: medium card
  if (currentRound === 0) {
    return indexed[Math.floor(indexed.length / 2)].index;
  }

  return indexed[indexed.length - 1].index;
}

function shouldCallTrucoMedium(handStrength: number, currentLevel: TrucoLevel | null): boolean {
  const threshold = currentLevel === null ? 55 : 65 + (currentLevel / 12) * 20;
  if (handStrength >= threshold) return true;
  if (handStrength > 35 && Math.random() < 0.1) return true;
  return false;
}

function decideTrucoResponseMedium(
  handStrength: number,
  calledLevel: TrucoLevel,
): 'accept' | 'run' | 'raise' {
  if (handStrength >= 75 && calledLevel < 12) return 'raise';
  if (handStrength >= 45) return 'accept';
  if (handStrength >= 30 && Math.random() < 0.15) return 'accept';
  return 'run';
}

// ============================================================
// HARD AI - smart play, card counting, score-aware strategy
// ============================================================

function chooseCardHard(
  hand: Card[],
  roundCards: { card: Card; position: PlayerPosition }[],
  partnerPosition: PlayerPosition,
  currentRound: number,
  roundsWon: number,
  roundsLost: number,
): number {
  if (hand.length === 0) return 0;
  if (hand.length === 1) return 0;

  const indexed = hand.map((card, index) => ({
    card,
    index,
    strength: getCardStrength(card),
    isManilha: isManilha(card),
  }));
  indexed.sort((a, b) => a.strength - b.strength);

  const partnerWinning = isPartnerWinning(roundCards, partnerPosition);
  const bestOnTable = getBestOnTable(roundCards);

  // Already won 1 round: play conservatively to save strong cards
  if (roundsWon >= 1 && currentRound === 1) {
    // We already won 1, if we win this we win the hand
    // If partner is winning, play weakest
    if (partnerWinning) return indexed[0].index;

    // Try to win with minimum card
    if (bestOnTable !== null) {
      for (const item of indexed) {
        if (compareCards(item.card, bestOnTable) > 0) {
          return item.index;
        }
      }
      // Can't beat it - play weakest, save strong for round 3
      return indexed[0].index;
    }

    // Leading: play strongest to try to close the hand
    return indexed[indexed.length - 1].index;
  }

  // Lost first round: MUST win round 2 to survive
  if (roundsLost >= 1 && currentRound === 1) {
    if (partnerWinning) return indexed[0].index;

    // Play strongest to guarantee win
    if (bestOnTable !== null) {
      // Find strongest card that beats the table
      for (let i = indexed.length - 1; i >= 0; i--) {
        if (compareCards(indexed[i].card, bestOnTable) > 0) {
          return indexed[i].index;
        }
      }
      // Can't beat, play weakest (save for round 3 miracle)
      return indexed[0].index;
    }

    return indexed[indexed.length - 1].index;
  }

  // Last round: all in
  if (currentRound === 2) {
    return indexed[indexed.length - 1].index;
  }

  // Partner winning: play weakest
  if (partnerWinning) {
    return indexed[0].index;
  }

  // Try to beat with minimum
  if (bestOnTable !== null) {
    for (const item of indexed) {
      if (compareCards(item.card, bestOnTable) > 0) {
        return item.index;
      }
    }
    return indexed[0].index;
  }

  // First to play round 1: play strongest non-manilha to signal strength
  // Save manilhas for critical moments
  if (currentRound === 0) {
    const nonManilhas = indexed.filter(i => !i.isManilha);
    if (nonManilhas.length > 0) {
      return nonManilhas[nonManilhas.length - 1].index;
    }
    // All manilhas: play weakest manilha
    return indexed[0].index;
  }

  return indexed[indexed.length - 1].index;
}

function shouldCallTrucoHard(
  handStrength: number,
  currentLevel: TrucoLevel | null,
  myScore: number,
  theirScore: number,
): boolean {
  // Don't call truco in mao de 10
  if (myScore >= 10 || theirScore >= 10) return false;

  let threshold = currentLevel === null ? 50 : 60 + (currentLevel / 12) * 15;

  // Losing badly: lower threshold (more aggressive)
  if (theirScore >= 8 && myScore <= 4) {
    threshold -= 15;
  }

  // Winning comfortably: higher threshold (more conservative)
  if (myScore >= 8 && theirScore <= 4) {
    threshold += 10;
  }

  // Close to winning: be strategic
  if (myScore >= 10) {
    threshold += 20; // Very conservative when about to win
  }

  if (handStrength >= threshold) return true;

  // Strategic bluff: more likely when losing
  const bluffChance = theirScore > myScore ? 0.15 : 0.08;
  if (handStrength > 30 && Math.random() < bluffChance) return true;

  return false;
}

function decideTrucoResponseHard(
  handStrength: number,
  calledLevel: TrucoLevel,
  myScore: number,
  theirScore: number,
): 'accept' | 'run' | 'raise' {
  // Score-aware thresholds
  let raiseThreshold = 70;
  let acceptThreshold = 40;
  let bluffAcceptChance = 0.12;

  // Losing: be more aggressive (lower thresholds)
  if (theirScore >= 8 && myScore <= 4) {
    raiseThreshold -= 10;
    acceptThreshold -= 10;
    bluffAcceptChance = 0.2;
  }

  // Winning: be more conservative
  if (myScore >= 8 && theirScore <= 4) {
    raiseThreshold += 10;
    acceptThreshold += 5;
    bluffAcceptChance = 0.05;
  }

  // High stakes (level 10+): be more cautious
  if (calledLevel >= 10) {
    raiseThreshold += 5;
    acceptThreshold += 5;
  }

  if (handStrength >= raiseThreshold && calledLevel < 12) return 'raise';
  if (handStrength >= acceptThreshold) return 'accept';
  if (handStrength >= 25 && Math.random() < bluffAcceptChance) return 'accept';

  return 'run';
}

// ============================================================
// Main AI entry point
// ============================================================

/**
 * Get the AI's decision for the current game state.
 */
export function getAIDecision(state: TrucoGameState, botId: string, difficulty: AIDifficulty = 'medium'): AIDecision | null {
  const player = state.players.get(botId);
  if (!player) return null;

  const hand = state.currentHand;
  if (!hand) return null;

  // Convert player hand to Card[]
  const cards: Card[] = player.hand.map((cs: CardSchema) => ({
    suit: cs.suit as Card['suit'],
    rank: cs.rank as Card['rank'],
    id: cs.id,
  }));

  const handStrength = evaluateHand(cards);
  const myScore = state.teams[player.team].score;
  const theirScore = state.teams[player.team === 0 ? 1 : 0].score;

  // If truco was called and it's our team's turn to respond
  if (state.phase === 'truco_called' && state.trucoCall) {
    if (player.team === state.trucoCall.respondingTeam) {
      let response: 'accept' | 'run' | 'raise';

      switch (difficulty) {
        case 'easy':
          response = decideTrucoResponseEasy(handStrength);
          break;
        case 'hard':
          response = decideTrucoResponseHard(handStrength, state.trucoCall.level as TrucoLevel, myScore, theirScore);
          break;
        default:
          response = decideTrucoResponseMedium(handStrength, state.trucoCall.level as TrucoLevel);
      }

      return { action: 'respond_truco', trucoResponse: response };
    }
    return null;
  }

  // Not our turn
  if (state.currentTurn !== botId) return null;
  if (state.phase !== 'playing') return null;

  // Consider calling truco before playing
  const currentLevel = hand.trucoLevel === -1 ? null : (hand.trucoLevel as TrucoLevel);
  const lastCallerTeam = state.trucoCall ? state.trucoCall.calledByTeam as TeamId : null;
  const canCall = currentLevel === null || (currentLevel < 12 && lastCallerTeam !== player.team);
  const notMaoDe10 = !(myScore >= 10 || theirScore >= 10);

  if (canCall && notMaoDe10 && !state.trucoCall?.status) {
    let shouldCall = false;

    switch (difficulty) {
      case 'easy':
        shouldCall = shouldCallTrucoEasy();
        break;
      case 'hard':
        shouldCall = shouldCallTrucoHard(handStrength, currentLevel, myScore, theirScore);
        break;
      default:
        shouldCall = shouldCallTrucoMedium(handStrength, currentLevel);
    }

    if (shouldCall) {
      return { action: 'call_truco' };
    }
  }

  // Choose which card to play
  const round = hand.rounds[hand.currentRound];
  const roundCards = round ? round.cardsPlayed.map((pc: PlayedCardSchema) => ({
    card: {
      suit: pc.card.suit as Card['suit'],
      rank: pc.card.rank as Card['rank'],
      id: pc.card.id,
    },
    position: pc.position as PlayerPosition,
  })) : [];

  const partnerPosition = ((player.position + 2) % 4) as PlayerPosition;

  let cardIndex: number;

  switch (difficulty) {
    case 'easy':
      cardIndex = chooseCardEasy(cards);
      break;
    case 'hard': {
      // Count rounds won/lost for strategic play
      let roundsWon = 0;
      let roundsLost = 0;
      for (let i = 0; i < hand.currentRound; i++) {
        const r = hand.rounds[i];
        if (r && r.complete) {
          if (r.winner === player.team) roundsWon++;
          else if (r.winner !== -1) roundsLost++;
        }
      }
      cardIndex = chooseCardHard(cards, roundCards, partnerPosition, hand.currentRound, roundsWon, roundsLost);
      break;
    }
    default:
      cardIndex = chooseCardMedium(cards, roundCards, partnerPosition, hand.currentRound);
  }

  return { action: 'play_card', cardIndex };
}

/**
 * Get a random delay (in ms) to simulate human thinking.
 */
export function getAIDelay(difficulty: AIDifficulty = 'medium'): number {
  switch (difficulty) {
    case 'easy': return 500 + Math.random() * 1000;    // 0.5-1.5s (fast, impulsive)
    case 'hard': return 1500 + Math.random() * 2500;    // 1.5-4s (thinks more)
    default: return 1000 + Math.random() * 2000;        // 1-3s
  }
}
