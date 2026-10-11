import { Schema, MapSchema, ArraySchema, defineTypes } from '@colyseus/schema';

export class TournamentPlayerSchema extends Schema {
  id: string = '';
  name: string = '';
  avatar: string = '';
  teamId: string = '';
}
defineTypes(TournamentPlayerSchema, {
  id: 'string',
  name: 'string',
  avatar: 'string',
  teamId: 'string',
});

export class TournamentTeamSchema extends Schema {
  id: string = '';
  name: string = '';
  player1Id: string = '';
  player1Name: string = '';
  player2Id: string = '';
  player2Name: string = '';
}
defineTypes(TournamentTeamSchema, {
  id: 'string',
  name: 'string',
  player1Id: 'string',
  player1Name: 'string',
  player2Id: 'string',
  player2Name: 'string',
});

export class TournamentMatchSchema extends Schema {
  id: number = 0;
  round: number = 1;
  team1Id: string = '';
  team2Id: string = '';
  team1Name: string = '';
  team2Name: string = '';
  winnerId: string = '';
  score1: number = 0;
  score2: number = 0;
  status: string = 'pending';
  roomId: string = '';
}
defineTypes(TournamentMatchSchema, {
  id: 'uint8',
  round: 'uint8',
  team1Id: 'string',
  team2Id: 'string',
  team1Name: 'string',
  team2Name: 'string',
  winnerId: 'string',
  score1: 'uint8',
  score2: 'uint8',
  status: 'string',
  roomId: 'string',
});

export class TournamentLobbyState extends Schema {
  phase: string = 'waiting';
  players = new MapSchema<TournamentPlayerSchema>();
  teams = new ArraySchema<TournamentTeamSchema>();
  matches = new ArraySchema<TournamentMatchSchema>();
  playerCount: number = 0;
  teamCount: number = 0;
  championTeamId: string = '';
  championTeamName: string = '';
}
defineTypes(TournamentLobbyState, {
  phase: 'string',
  players: { map: TournamentPlayerSchema },
  teams: [TournamentTeamSchema],
  matches: [TournamentMatchSchema],
  playerCount: 'uint8',
  teamCount: 'uint8',
  championTeamId: 'string',
  championTeamName: 'string',
});
