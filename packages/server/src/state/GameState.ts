import { Schema, MapSchema, ArraySchema, Context, defineTypes } from '@colyseus/schema';

const type = Context.create();

// === Card Schema ===
export class CardSchema extends Schema {
  suit: string = '';
  rank: string = '';
  id: string = '';
}
defineTypes(CardSchema, {
  suit: 'string',
  rank: 'string',
  id: 'string',
});

// === Played Card Schema ===
export class PlayedCardSchema extends Schema {
  playerId: string = '';
  card: CardSchema = new CardSchema();
  position: number = 0;
}
defineTypes(PlayedCardSchema, {
  playerId: 'string',
  card: CardSchema,
  position: 'uint8',
});

// === Round Schema ===
export class RoundSchema extends Schema {
  cardsPlayed = new ArraySchema<PlayedCardSchema>();
  winner: number = -1; // -1 = null (no winner yet or tie)
  complete: boolean = false;
}
defineTypes(RoundSchema, {
  cardsPlayed: [PlayedCardSchema],
  winner: 'int8',
  complete: 'boolean',
});

// === Truco Call Schema ===
export class TrucoCallSchema extends Schema {
  level: number = 3;
  calledBy: string = '';
  calledByTeam: number = 0;
  respondingTeam: number = 0;
  status: string = 'pending';
}
defineTypes(TrucoCallSchema, {
  level: 'uint8',
  calledBy: 'string',
  calledByTeam: 'uint8',
  respondingTeam: 'uint8',
  status: 'string',
});

// === Player Schema ===
export class PlayerSchema extends Schema {
  id: string = '';
  name: string = '';
  team: number = 0;
  position: number = 0;
  isBot: boolean = false;
  isConnected: boolean = true;
  hand = new ArraySchema<CardSchema>();
}
defineTypes(PlayerSchema, {
  id: 'string',
  name: 'string',
  team: 'uint8',
  position: 'uint8',
  isBot: 'boolean',
  isConnected: 'boolean',
  hand: [CardSchema],
});

// === Hand Schema ===
export class HandSchema extends Schema {
  rounds = new ArraySchema<RoundSchema>();
  currentRound: number = 0;
  trucoLevel: number = -1; // -1 = null
  points: number = 1;
  winner: number = -1; // -1 = null
  complete: boolean = false;
  dealerPosition: number = 0;
}
defineTypes(HandSchema, {
  rounds: [RoundSchema],
  currentRound: 'uint8',
  trucoLevel: 'int8',
  points: 'uint8',
  winner: 'int8',
  complete: 'boolean',
  dealerPosition: 'uint8',
});

// === Team Schema ===
export class TeamSchema extends Schema {
  score: number = 0;
  players = new ArraySchema<string>();
}
defineTypes(TeamSchema, {
  score: 'uint8',
  players: ['string'],
});

// === Game State Schema ===
export class TrucoGameState extends Schema {
  teams = new ArraySchema<TeamSchema>();
  players = new MapSchema<PlayerSchema>();
  currentHand: HandSchema | null = null;
  dealerPosition: number = 0;
  currentTurn: string = '';
  phase: string = 'waiting';
  trucoCall: TrucoCallSchema | null = null;
  playOrder = new ArraySchema<string>();
  winner: number = -1; // -1 = null
  playerCount: number = 0;
  spectatorCount: number = 0;

  // For broadcasting messages
  lastEvent: string = '';
  lastEventData: string = '';
}
defineTypes(TrucoGameState, {
  teams: [TeamSchema],
  players: { map: PlayerSchema },
  currentHand: HandSchema,
  dealerPosition: 'uint8',
  currentTurn: 'string',
  phase: 'string',
  trucoCall: TrucoCallSchema,
  playOrder: ['string'],
  winner: 'int8',
  playerCount: 'uint8',
  spectatorCount: 'uint8',
  lastEvent: 'string',
  lastEventData: 'string',
});
