import { ArraySchema } from '@colyseus/schema';
import {
  TrucoGameState,
  PlayerSchema,
  CardSchema,
  HandSchema,
  RoundSchema,
  PlayedCardSchema,
  TrucoCallSchema,
  TeamSchema,
} from '../state/GameState';
import {
  createDeck,
  shuffleDeck,
  resolveRound,
  resolveRoundDetailed,
  resolveHand,
  isHandComplete,
  needsThirdRound,
  getHandPoints,
  canCallTruco,
  getNextTrucoLevel,
  isGameOver,
  getWinner,
  getPlayOrder,
  getNextTurn,
  isMaoDeFerro,
  isMaoDe10,
  type Card,
  type PlayedCard,
  type Round,
  type TeamId,
  type PlayerPosition,
  type TrucoLevel,
  POSITION_TO_TEAM,
  POINTS_TO_WIN,
} from '@truco/shared';

/**
 * Initialize the game state with two teams.
 */
export function initializeGame(state: TrucoGameState): void {
  // Create teams
  state.teams.push(new TeamSchema());
  state.teams.push(new TeamSchema());
  state.phase = 'waiting';
  state.winner = -1;
}

/**
 * Convert a Card to a CardSchema.
 */
function cardToSchema(card: Card): CardSchema {
  const schema = new CardSchema();
  schema.suit = card.suit;
  schema.rank = card.rank;
  schema.id = card.id;
  return schema;
}

/**
 * Convert a CardSchema to a Card.
 */
function schemaToCard(schema: CardSchema): Card {
  return {
    suit: schema.suit as Card['suit'],
    rank: schema.rank as Card['rank'],
    id: schema.id,
  };
}

/**
 * Start a new game.
 */
export function startGame(state: TrucoGameState): void {
  // Reset scores
  state.teams[0].score = 0;
  state.teams[1].score = 0;
  state.winner = -1;

  // Set initial dealer (position 0)
  state.dealerPosition = 0;

  // Build play order
  updatePlayOrder(state);

  // Start first hand
  startNewHand(state);
}

/**
 * Update the play order based on current dealer.
 */
function updatePlayOrder(state: TrucoGameState): void {
  state.playOrder.clear();
  const players: { id: string; position: PlayerPosition }[] = [];
  state.players.forEach((p: PlayerSchema) => {
    players.push({ id: p.id, position: p.position as PlayerPosition });
  });

  const order = getPlayOrder(state.dealerPosition as PlayerPosition, players);
  for (const id of order) {
    state.playOrder.push(id);
  }
}

/**
 * Start a new hand: deal cards, create rounds, set turn.
 */
export function startNewHand(state: TrucoGameState): void {
  // Reset round winner tracker
  lastRoundWinnerPlayerId = null;

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());

  // Create new hand
  const hand = new HandSchema();
  hand.dealerPosition = state.dealerPosition;
  hand.currentRound = 0;
  // Mao de 10: hand is worth 4 points, no truco allowed
  const maoDe10 = isMaoDe10([
    { score: state.teams[0].score, players: [] },
    { score: state.teams[1].score, players: [] },
  ]);
  hand.trucoLevel = -1;
  hand.points = maoDe10 ? 4 : 2;
  hand.winner = -1;
  hand.complete = false;

  // Create first round
  const round = new RoundSchema();
  round.winner = -1;
  round.complete = false;
  hand.rounds.push(round);

  state.currentHand = hand;

  // Deal 3 cards to each player
  let cardIndex = 0;
  const positions: PlayerPosition[] = [0, 1, 2, 3];

  // Deal starting from dealer+1
  const dealOrder = [...positions.slice((state.dealerPosition + 1) % 4), ...positions.slice(0, (state.dealerPosition + 1) % 4)];

  for (const pos of dealOrder) {
    // Find player at this position
    state.players.forEach((player: PlayerSchema) => {
      if (player.position === pos) {
        player.hand.clear();
        for (let i = 0; i < 3; i++) {
          player.hand.push(cardToSchema(deck[cardIndex++]));
        }
      }
    });
  }

  // Set turn to first player after dealer
  state.currentTurn = state.playOrder[0];
  state.phase = 'playing';
  state.trucoCall = null;

  // Broadcast dealing event
  broadcastEvent(state, 'dealing', JSON.stringify({ dealer: state.dealerPosition }));
}

/**
 * Process a card being played.
 */
export function playCard(state: TrucoGameState, playerId: string, cardIndex: number): boolean {
  // Validate
  if (state.phase !== 'playing') return false;
  if (state.currentTurn !== playerId) return false;

  const player = state.players.get(playerId);
  if (!player) return false;
  if (cardIndex < 0 || cardIndex >= player.hand.length) return false;

  const hand = state.currentHand;
  if (!hand) return false;

  const round = hand.rounds[hand.currentRound];
  if (!round) return false;

  // Remove card from hand and add to played cards
  const cardSchema = player.hand[cardIndex];
  const playedCard = new PlayedCardSchema();
  playedCard.playerId = playerId;
  playedCard.card = cardToSchema(schemaToCard(cardSchema));
  playedCard.position = player.position;

  round.cardsPlayed.push(playedCard);
  player.hand.splice(cardIndex, 1);

  // Check if all 4 players have played
  if (round.cardsPlayed.length === 4) {
    endRound(state);
  } else {
    // Next turn
    advanceTurn(state);
  }

  return true;
}

/**
 * Advance to the next player's turn.
 */
function advanceTurn(state: TrucoGameState): void {
  const currentIndex = state.playOrder.indexOf(state.currentTurn);
  const nextIndex = (currentIndex + 1) % state.playOrder.length;
  state.currentTurn = state.playOrder[nextIndex];
}

/** Track which player won the last round (for next round lead) */
let lastRoundWinnerPlayerId: string | null = null;

/**
 * End the current round: determine winner, check hand end.
 */
function endRound(state: TrucoGameState): void {
  const hand = state.currentHand!;
  const round = hand.rounds[hand.currentRound];

  // Convert to shared types for rule resolution
  const cardsPlayed: PlayedCard[] = round.cardsPlayed.map((pc: PlayedCardSchema) => ({
    playerId: pc.playerId,
    card: schemaToCard(pc.card),
    position: pc.position as PlayerPosition,
  }));

  const roundResult = resolveRoundDetailed(cardsPlayed);
  const roundWinner = roundResult?.winnerTeam ?? null;
  lastRoundWinnerPlayerId = roundResult?.winnerPlayerId ?? null;

  round.winner = roundWinner === null ? -1 : roundWinner;
  round.complete = true;

  state.phase = 'round_end';

  broadcastEvent(state, 'round_result', JSON.stringify({
    winner: roundWinner,
    roundNumber: hand.currentRound,
  }));

  // Check if hand is complete
  const rounds: Round[] = hand.rounds.map((r: RoundSchema) => ({
    cardsPlayed: [],
    winner: r.winner === -1 ? null : (r.winner as TeamId),
    complete: r.complete,
  }));

  if (isHandComplete(rounds, hand.dealerPosition as PlayerPosition)) {
    endHand(state);
    return;
  }

  // Check if we need a third round
  if (hand.currentRound === 1 && !needsThirdRound(rounds)) {
    endHand(state);
    return;
  }

  // Start next round
  startNextRound(state);
}

/**
 * Start the next round within the current hand.
 */
function startNextRound(state: TrucoGameState): void {
  const hand = state.currentHand!;
  hand.currentRound++;

  const newRound = new RoundSchema();
  newRound.winner = -1;
  newRound.complete = false;
  hand.rounds.push(newRound);

  // Winner of last round leads (the player who played the strongest card)
  if (lastRoundWinnerPlayerId && state.players.has(lastRoundWinnerPlayerId)) {
    state.currentTurn = lastRoundWinnerPlayerId;
  } else {
    // Tie: first player in play order leads
    state.currentTurn = state.playOrder[0];
  }

  state.phase = 'playing';
}

/**
 * End the current hand: score points, check game end.
 */
function endHand(state: TrucoGameState): void {
  const hand = state.currentHand!;

  const rounds: Round[] = hand.rounds.map((r: RoundSchema) => ({
    cardsPlayed: [],
    winner: r.winner === -1 ? null : (r.winner as TeamId),
    complete: r.complete,
  }));

  const handWinner = resolveHand(rounds, hand.dealerPosition as PlayerPosition);

  if (handWinner !== null) {
    hand.winner = handWinner;
    hand.complete = true;

    // Add points
    const points = getHandPoints(hand.trucoLevel === -1 ? null : hand.trucoLevel as TrucoLevel);
    state.teams[handWinner].score = Math.min(
      state.teams[handWinner].score + points,
      POINTS_TO_WIN,
    );

    state.phase = 'hand_end';

    broadcastEvent(state, 'hand_result', JSON.stringify({
      winnerTeam: handWinner,
      points,
      scores: [state.teams[0].score, state.teams[1].score],
    }));

    // Check game over
    if (isGameOver([
      { score: state.teams[0].score, players: [] },
      { score: state.teams[1].score, players: [] },
    ])) {
      endGame(state);
      return;
    }

    // Rotate dealer and start next hand (after delay, handled by room)
    state.dealerPosition = ((state.dealerPosition + 1) % 4) as number;
    updatePlayOrder(state);
  }
}

/**
 * End the game.
 */
function endGame(state: TrucoGameState): void {
  const winner = getWinner([
    { score: state.teams[0].score, players: [] },
    { score: state.teams[1].score, players: [] },
  ]);

  state.winner = winner === null ? -1 : winner;
  state.phase = 'game_over';

  broadcastEvent(state, 'game_over', JSON.stringify({
    winnerTeam: winner,
    finalScores: [state.teams[0].score, state.teams[1].score],
  }));
}

/**
 * Process a truco call.
 */
export function callTruco(state: TrucoGameState, playerId: string): boolean {
  if (state.phase !== 'playing') return false;

  const player = state.players.get(playerId);
  if (!player) return false;

  const hand = state.currentHand;
  if (!hand) return false;

  const currentLevel = hand.trucoLevel === -1 ? null : (hand.trucoLevel as TrucoLevel);
  const lastCallerTeam = state.trucoCall ? state.trucoCall.calledByTeam as TeamId : null;

  const teams: [{ score: number; players: [] }, { score: number; players: [] }] = [
    { score: state.teams[0].score, players: [] },
    { score: state.teams[1].score, players: [] },
  ];
  if (!canCallTruco(currentLevel, null, player.team as TeamId, lastCallerTeam, teams)) {
    return false;
  }

  const nextLevel = getNextTrucoLevel(currentLevel);
  if (nextLevel === null) return false;

  // Create truco call
  const call = new TrucoCallSchema();
  call.level = nextLevel;
  call.calledBy = playerId;
  call.calledByTeam = player.team;
  call.respondingTeam = player.team === 0 ? 1 : 0;
  call.status = 'pending';

  state.trucoCall = call;
  state.phase = 'truco_called';

  broadcastEvent(state, 'truco_called', JSON.stringify({
    by: playerId,
    byName: player.name,
    level: nextLevel,
  }));

  return true;
}

/**
 * Process a truco response.
 */
export function respondTruco(
  state: TrucoGameState,
  playerId: string,
  response: 'accept' | 'run' | 'raise',
): boolean {
  if (state.phase !== 'truco_called') return false;
  if (!state.trucoCall) return false;

  const player = state.players.get(playerId);
  if (!player) return false;

  // Only responding team can respond
  if (player.team !== state.trucoCall.respondingTeam) return false;

  const hand = state.currentHand;
  if (!hand) return false;

  switch (response) {
    case 'accept': {
      state.trucoCall.status = 'accepted';
      hand.trucoLevel = state.trucoCall.level;
      hand.points = state.trucoCall.level;
      state.phase = 'playing';

      broadcastEvent(state, 'truco_accepted', JSON.stringify({
        level: state.trucoCall.level,
      }));
      break;
    }

    case 'run': {
      state.trucoCall.status = 'rejected';
      // The calling team wins the hand with the previous point value
      const callerTeam = state.trucoCall.calledByTeam as TeamId;
      const prevLevel = hand.trucoLevel === -1 ? null : (hand.trucoLevel as TrucoLevel);
      const points = getHandPoints(prevLevel);

      hand.winner = callerTeam;
      hand.complete = true;

      state.teams[callerTeam].score = Math.min(
        state.teams[callerTeam].score + points,
        POINTS_TO_WIN,
      );

      state.phase = 'hand_end';

      broadcastEvent(state, 'truco_run', JSON.stringify({
        runBy: player.team,
        winnerTeam: callerTeam,
        points,
        scores: [state.teams[0].score, state.teams[1].score],
      }));

      // Check game over
      if (isGameOver([
        { score: state.teams[0].score, players: [] },
        { score: state.teams[1].score, players: [] },
      ])) {
        endGame(state);
        return true;
      }

      // Rotate dealer
      state.dealerPosition = ((state.dealerPosition + 1) % 4) as number;
      updatePlayOrder(state);
      break;
    }

    case 'raise': {
      // The responding team raises back
      const currentLevel = state.trucoCall.level as TrucoLevel;
      const nextLevel = getNextTrucoLevel(currentLevel);
      if (nextLevel === null) return false;

      // Accept current level first
      hand.trucoLevel = currentLevel;
      hand.points = currentLevel;

      // Create new call for the raise
      const newCall = new TrucoCallSchema();
      newCall.level = nextLevel;
      newCall.calledBy = playerId;
      newCall.calledByTeam = player.team;
      newCall.respondingTeam = player.team === 0 ? 1 : 0;
      newCall.status = 'pending';

      state.trucoCall = newCall;
      // Stay in truco_called phase

      broadcastEvent(state, 'truco_raised', JSON.stringify({
        by: playerId,
        byName: player.name,
        level: nextLevel,
      }));
      break;
    }
  }

  return true;
}

/**
 * Broadcast an event through state changes.
 */
function broadcastEvent(state: TrucoGameState, event: string, data: string): void {
  state.lastEvent = event;
  state.lastEventData = data;
}

/**
 * Schedule next hand start (called after delay).
 */
export function scheduleNextHand(state: TrucoGameState): void {
  if (state.phase === 'hand_end' && state.winner === -1) {
    startNewHand(state);
  }
}
