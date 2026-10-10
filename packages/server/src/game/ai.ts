import {
  getCardStrength,
  isManilha,
  getHandStrength,
  compareCards,
  type Card,
  type TrucoLevel,
  POSITION_TO_TEAM,
  type PlayerPosition,
  type TeamId,
} from '@truco/shared';
import { PlayerSchema, CardSchema, TrucoGameState, RoundSchema, PlayedCardSchema } from '../state/GameState';

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
 * Decide which card to play.
 */
function chooseCard(
  hand: Card[],
  roundCards: { card: Card; position: PlayerPosition }[],
  partnerPosition: PlayerPosition,
  currentRound: number,
  totalRounds: number,
): number {
  if (hand.length === 0) return 0;
  if (hand.length === 1) return 0;

  // Sort by strength (weakest first)
  const indexed = hand.map((card, index) => ({
    card,
    index,
    strength: getCardStrength(card),
  }));
  indexed.sort((a, b) => a.strength - b.strength);

  // Check if partner is currently winning the round
  const partnerWinning = isPartnerWinning(roundCards, partnerPosition);

  // Check current best card on the table
  const bestOnTable = getBestOnTable(roundCards);

  // Last round: play the strongest card
  if (currentRound === 2 || hand.length === 1) {
    return indexed[indexed.length - 1].index;
  }

  // If partner is winning, play weakest card
  if (partnerWinning) {
    return indexed[0].index;
  }

  // If cards are on the table, try to beat the best one with minimum card
  if (bestOnTable !== null) {
    // Find the weakest card that can beat it
    for (const item of indexed) {
      if (compareCards(item.card, bestOnTable) > 0) {
        return item.index;
      }
    }
    // Can't beat it, play weakest card
    return indexed[0].index;
  }

  // First to play: play a medium card (save best for later)
  if (currentRound === 0) {
    // Play medium card
    return indexed[Math.floor(indexed.length / 2)].index;
  }

  // Default: play strongest
  return indexed[indexed.length - 1].index;
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

/**
 * Decide whether to call truco.
 */
function shouldCallTruco(hand: Card[], handStrength: number, currentLevel: TrucoLevel | null): boolean {
  const threshold = currentLevel === null ? 55 : 65 + (currentLevel / 12) * 20;

  // Strong hand: call truco
  if (handStrength >= threshold) {
    return true;
  }

  // Bluff with low probability (10%)
  if (handStrength > 35 && Math.random() < 0.1) {
    return true;
  }

  return false;
}

/**
 * Decide how to respond to a truco call.
 */
function decideTrucoResponse(
  hand: Card[],
  handStrength: number,
  calledLevel: TrucoLevel,
): 'accept' | 'run' | 'raise' {
  // Very strong hand: raise
  if (handStrength >= 75 && calledLevel < 12) {
    return 'raise';
  }

  // Medium-strong hand: accept
  if (handStrength >= 45) {
    return 'accept';
  }

  // Weak hand: run (but occasionally bluff accept)
  if (handStrength >= 30 && Math.random() < 0.15) {
    return 'accept';
  }

  return 'run';
}

/**
 * Get the AI's decision for the current game state.
 */
export function getAIDecision(state: TrucoGameState, botId: string): AIDecision | null {
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

  // If truco was called and it's our team's turn to respond
  if (state.phase === 'truco_called' && state.trucoCall) {
    if (player.team === state.trucoCall.respondingTeam) {
      const response = decideTrucoResponse(
        cards,
        handStrength,
        state.trucoCall.level as TrucoLevel,
      );
      return { action: 'respond_truco', trucoResponse: response };
    }
    return null;
  }

  // Not our turn
  if (state.currentTurn !== botId) return null;
  if (state.phase !== 'playing') return null;

  // Consider calling truco before playing
  const currentLevel = hand.trucoLevel === -1 ? null : (hand.trucoLevel as TrucoLevel);
  if (shouldCallTruco(cards, handStrength, currentLevel)) {
    // Check if we can actually call truco
    const lastCallerTeam = state.trucoCall ? state.trucoCall.calledByTeam as TeamId : null;
    const canCall = currentLevel === null || (currentLevel < 12 && lastCallerTeam !== player.team);

    if (canCall && !state.trucoCall?.status) {
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

  // Find partner position
  const partnerPosition = ((player.position + 2) % 4) as PlayerPosition;

  const cardIndex = chooseCard(
    cards,
    roundCards,
    partnerPosition,
    hand.currentRound,
    3,
  );

  return { action: 'play_card', cardIndex };
}

/**
 * Get a random delay (in ms) to simulate human thinking.
 */
export function getAIDelay(): number {
  return 1000 + Math.random() * 2000; // 1-3 seconds
}
