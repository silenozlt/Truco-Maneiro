import { Suit, Rank, TrucoLevel, PlayerPosition, TeamId } from './types';

export const SUITS: Suit[] = ['copas', 'espadas', 'ouros', 'paus'];

export const RANKS: Rank[] = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

export const SUIT_NAMES: Record<Suit, string> = {
  copas: 'Copas',
  espadas: 'Espadas',
  ouros: 'Ouros',
  paus: 'Paus',
};

export const RANK_NAMES: Record<Rank, string> = {
  '4': 'Quatro',
  '5': 'Cinco',
  '6': 'Seis',
  '7': 'Sete',
  'Q': 'Dama',
  'J': 'Valete',
  'K': 'Rei',
  'A': 'Ás',
  '2': 'Dois',
  '3': 'Três',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  copas: '♥',
  espadas: '♠',
  ouros: '♦',
  paus: '♣',
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  copas: 'red',
  espadas: 'black',
  ouros: 'red',
  paus: 'black',
};

/**
 * Base strength of each rank (before manilha bonus).
 * Higher number = stronger card.
 */
export const RANK_STRENGTH: Record<Rank, number> = {
  '4': 1,
  '5': 2,
  '6': 3,
  '7': 4,
  'Q': 5,
  'J': 6,
  'K': 7,
  'A': 8,
  '2': 9,
  '3': 10,
};

/**
 * Manilhas fixas do Truco Mineiro (sempre as mesmas cartas).
 * Zap (4♣) > Copas (7♥) > Espadilha (A♠) > Ouros (7♦)
 */
export const MANILHAS = {
  ZAP: { rank: '4' as Rank, suit: 'paus' as Suit, strength: 14 },
  COPAS: { rank: '7' as Rank, suit: 'copas' as Suit, strength: 13 },
  ESPADILHA: { rank: 'A' as Rank, suit: 'espadas' as Suit, strength: 12 },
  OUROS: { rank: '7' as Rank, suit: 'ouros' as Suit, strength: 11 },
} as const;

/** Base points for a hand without truco */
export const BASE_HAND_POINTS = 2;

export const TRUCO_LEVELS: TrucoLevel[] = [4, 6, 10, 12];

export const TRUCO_LEVEL_NAMES: Record<TrucoLevel, string> = {
  4: 'Truco',
  6: 'Seis',
  10: 'Dez',
  12: 'Doze',
};

export const NEXT_TRUCO_LEVEL: Record<TrucoLevel, TrucoLevel | null> = {
  4: 6,
  6: 10,
  10: 12,
  12: null,
};

export const POINTS_TO_WIN = 12;

export const CARDS_PER_HAND = 3;

export const TOTAL_CARDS = 40;

export const PLAYERS_PER_GAME = 4;

export const ROUNDS_PER_HAND = 3;

/** Map player position to team */
export const POSITION_TO_TEAM: Record<PlayerPosition, TeamId> = {
  0: 0, // South → Team 0
  1: 1, // West → Team 1
  2: 0, // North → Team 0
  3: 1, // East → Team 1
};

/** Default player names for positions */
export const DEFAULT_POSITION_NAMES: Record<PlayerPosition, string> = {
  0: 'Sul',
  1: 'Oeste',
  2: 'Norte',
  3: 'Leste',
};

export const TEAM_NAMES: Record<TeamId, string> = {
  0: 'Nós',
  1: 'Eles',
};
