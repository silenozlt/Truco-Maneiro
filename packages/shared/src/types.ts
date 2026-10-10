// === Suits and Ranks ===

export type Suit = 'copas' | 'espadas' | 'ouros' | 'paus';

export type Rank = '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K' | 'A' | '2' | '3';

// === Card ===

export interface Card {
  suit: Suit;
  rank: Rank;
  /** Unique identifier for the card (e.g., "7-copas") */
  id: string;
}

// === Player ===

export type PlayerPosition = 0 | 1 | 2 | 3; // 0=South, 1=West, 2=North, 3=East

export type TeamId = 0 | 1; // Team 0: positions 0,2 (S,N) | Team 1: positions 1,3 (W,E)

export interface Player {
  id: string;
  name: string;
  team: TeamId;
  hand: Card[];
  position: PlayerPosition;
  isBot: boolean;
  isConnected: boolean;
}

// === Truco ===

export type TrucoLevel = 4 | 6 | 10 | 12;

export type TrucoResponse = 'accept' | 'run' | 'raise';

export interface TrucoCall {
  level: TrucoLevel;
  calledBy: string; // player id
  calledByTeam: TeamId;
  /** Which team needs to respond */
  respondingTeam: TeamId;
  status: 'pending' | 'accepted' | 'rejected';
}

// === Round (Rodada) ===

export interface PlayedCard {
  playerId: string;
  card: Card;
  position: PlayerPosition;
}

export interface Round {
  cardsPlayed: PlayedCard[];
  winner: TeamId | null; // null = empate
  complete: boolean;
}

// === Hand (Mão) ===

export interface Hand {
  rounds: Round[];
  currentRound: number; // 0, 1, or 2
  trucoLevel: TrucoLevel | null;
  points: number; // points this hand is worth
  winner: TeamId | null;
  complete: boolean;
  dealerPosition: PlayerPosition;
}

// === Game Phase ===

export type GamePhase =
  | 'waiting'       // Waiting for players
  | 'dealing'       // Cards being dealt
  | 'playing'       // Normal play
  | 'truco_called'  // Truco was called, waiting for response
  | 'round_end'     // Round just ended, brief pause
  | 'hand_end'      // Hand just ended, brief pause
  | 'game_over';    // Game finished

// === Game State ===

export interface TeamState {
  score: number; // 0-12
  players: string[]; // player ids
}

export interface GameState {
  teams: [TeamState, TeamState];
  players: Map<string, Player> | Record<string, Player>;
  currentHand: Hand | null;
  handHistory: Hand[];
  dealerPosition: PlayerPosition;
  currentTurn: string | null; // player id whose turn it is
  phase: GamePhase;
  trucoCall: TrucoCall | null;
  /** Player positions in play order (starting from dealer+1) */
  playOrder: string[];
  winner: TeamId | null;
}

// === Events ===

export interface PlayCardEvent {
  cardIndex: number;
}

export interface CallTrucoEvent {
  level?: TrucoLevel;
}

export interface RespondTrucoEvent {
  response: TrucoResponse;
}

export interface AddBotEvent {
  position: PlayerPosition;
}

// === Server Messages ===

export interface TrucoCalledMessage {
  by: string;
  byName: string;
  level: TrucoLevel;
}

export interface RoundResultMessage {
  winner: TeamId | null;
  cards: PlayedCard[];
  roundNumber: number;
}

export interface HandResultMessage {
  winnerTeam: TeamId;
  points: number;
  scores: [number, number];
}

export interface GameOverMessage {
  winnerTeam: TeamId;
  finalScores: [number, number];
}
