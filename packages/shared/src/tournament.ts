export type TournamentPhase = 'waiting' | 'ready' | 'playing' | 'finished';
export type TournamentMatchStatus = 'pending' | 'playing' | 'done';
export type TeamFormationMode = 'auto' | 'partner';

export interface TournamentTeamInfo {
  id: string;
  name: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
}

export interface TournamentMatchInfo {
  id: number;
  round: number;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  winnerId: string;
  score1: number;
  score2: number;
  status: TournamentMatchStatus;
  roomId: string;
}

export interface TournamentPlayerInfo {
  id: string;
  name: string;
  avatar: string;
  teamId: string;
}
