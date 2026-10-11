import { Room, Client, matchMaker } from '@colyseus/core';
import {
  TournamentLobbyState,
  TournamentPlayerSchema,
  TournamentTeamSchema,
  TournamentMatchSchema,
} from '../state/TournamentState';

export class TournamentLobbyRoom extends Room<TournamentLobbyState> {
  maxClients = 8;

  private disposeTimer: NodeJS.Timeout | null = null;
  private matchResultTimeout: Map<number, NodeJS.Timeout> = new Map();

  onCreate(_options: any) {
    this.setState(new TournamentLobbyState());
    this.autoDispose = false;
    this.setMetadata({ phase: 'waiting' });

    // Match result reported by clients after game ends
    this.onMessage('match_result', (_client, data: { matchId: number; winnerTeamId: string; score: [number, number] }) => {
      this.handleMatchResult(data.matchId, data.winnerTeamId, data.score);
    });

    // Auto-dispose after 1 hour
    this.disposeTimer = setTimeout(() => {
      console.log(`Tournament ${this.roomId} expired, disposing`);
      this.disconnect();
    }, 60 * 60 * 1000);

    console.log(`Tournament room ${this.roomId} created`);
  }

  onJoin(client: Client, options: { name?: string; avatar?: string; mode?: 'auto' | 'partner'; partnerCode?: string; rejoin?: boolean; previousId?: string } = {}) {
    // Handle rejoin after returning from a match
    if (options.rejoin && options.previousId) {
      const oldPlayer = this.state.players.get(options.previousId);
      if (oldPlayer) {
        // Remap old player to new session
        this.state.players.delete(options.previousId);
        oldPlayer.id = client.sessionId;
        this.state.players.set(client.sessionId, oldPlayer);

        // Update team references
        this.state.teams.forEach((team: TournamentTeamSchema) => {
          if (team.player1Id === options.previousId) team.player1Id = client.sessionId;
          if (team.player2Id === options.previousId) team.player2Id = client.sessionId;
        });

        console.log(`Tournament: ${oldPlayer.name} rejoined (${options.previousId} -> ${client.sessionId})`);
        return;
      }
    }

    const player = new TournamentPlayerSchema();
    player.id = client.sessionId;
    player.name = options.name || 'Jogador';
    player.avatar = options.avatar || '';

    this.state.players.set(client.sessionId, player);
    this.state.playerCount = this.state.players.size;

    console.log(`Tournament: ${player.name} joined (${this.state.playerCount}/8)`);

    if (options.mode === 'partner' && options.partnerCode) {
      this.handlePartnerJoin(client.sessionId, options.partnerCode);
    } else {
      this.tryAutoPair(client.sessionId);
    }

    // Auto-start when 4 teams are formed
    if (this.state.teamCount >= 4 && this.state.phase === 'waiting') {
      this.startTournament();
    }
  }

  onLeave(client: Client, _consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (this.state.phase === 'waiting') {
      // In waiting phase: remove player and unpair if needed
      this.removePlayerAndCleanup(client.sessionId);
      console.log(`Tournament: ${player.name} left queue (${this.state.playerCount}/8)`);
    } else {
      // During tournament: keep player data for rejoin
      console.log(`Tournament: ${player.name} disconnected (data preserved for rejoin)`);
    }
  }

  onDispose() {
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.matchResultTimeout.forEach(t => clearTimeout(t));
    this.matchResultTimeout.clear();
    console.log(`Tournament room ${this.roomId} disposed`);
  }

  // === Pairing Logic ===

  private tryAutoPair(sessionId: string) {
    let partnerId: string | null = null;

    this.state.players.forEach((p) => {
      if (!partnerId && p.id !== sessionId && !p.teamId) {
        partnerId = p.id;
      }
    });

    if (partnerId) {
      this.formTeam(sessionId, partnerId);
    }
  }

  private handlePartnerJoin(sessionId: string, partnerCode: string) {
    // partnerCode is the sessionId of the partner who joined first
    const partner = this.state.players.get(partnerCode);
    if (partner && !partner.teamId) {
      this.formTeam(sessionId, partnerCode);
    }
    // If partner not found yet, the player waits.
    // Their sessionId is their code for the partner to use.
  }

  private formTeam(player1Id: string, player2Id: string) {
    const p1 = this.state.players.get(player1Id);
    const p2 = this.state.players.get(player2Id);
    if (!p1 || !p2) return;

    const team = new TournamentTeamSchema();
    team.id = `team-${this.state.teams.length}`;
    team.name = `${p1.name} & ${p2.name}`;
    team.player1Id = player1Id;
    team.player1Name = p1.name;
    team.player2Id = player2Id;
    team.player2Name = p2.name;

    p1.teamId = team.id;
    p2.teamId = team.id;

    this.state.teams.push(team);
    this.state.teamCount = this.state.teams.length;

    console.log(`Tournament: Team formed: ${team.name} (${this.state.teamCount}/4)`);
  }

  // === Tournament Logic ===

  private startTournament() {
    this.generateBracket();
    this.state.phase = 'playing';
    this.setMetadata({ phase: 'playing' });
    this.lock(); // No more players can join

    console.log(`Tournament ${this.roomId} started with ${this.state.teamCount} teams`);

    // Start both semi-finals simultaneously
    this.startBothSemis();
  }

  private generateBracket() {
    // Shuffle team indices
    const indices = Array.from({ length: this.state.teams.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const teamsArr = this.state.teams.toArray();

    // Semi-final 1
    const semi1 = new TournamentMatchSchema();
    semi1.id = 0;
    semi1.round = 1;
    semi1.team1Id = teamsArr[indices[0]]!.id;
    semi1.team1Name = teamsArr[indices[0]]!.name;
    semi1.team2Id = teamsArr[indices[1]]!.id;
    semi1.team2Name = teamsArr[indices[1]]!.name;
    semi1.status = 'pending';

    // Semi-final 2
    const semi2 = new TournamentMatchSchema();
    semi2.id = 1;
    semi2.round = 1;
    semi2.team1Id = teamsArr[indices[2]]!.id;
    semi2.team1Name = teamsArr[indices[2]]!.name;
    semi2.team2Id = teamsArr[indices[3]]!.id;
    semi2.team2Name = teamsArr[indices[3]]!.name;
    semi2.status = 'pending';

    // Final (empty, filled when semis complete)
    const final_ = new TournamentMatchSchema();
    final_.id = 2;
    final_.round = 2;
    final_.status = 'pending';

    this.state.matches.push(semi1);
    this.state.matches.push(semi2);
    this.state.matches.push(final_);
  }

  private async startBothSemis() {
    await Promise.all([
      this.startMatch(0),
      this.startMatch(1),
    ]);
  }

  private async startMatch(matchIndex: number) {
    const match = this.state.matches[matchIndex];
    if (!match || !match.team1Id || !match.team2Id) return;

    try {
      // Create a TrucoRoom for this match
      const reservation = await matchMaker.createRoom('truco', { autoStart: true });
      match.roomId = reservation.roomId;
      match.status = 'playing';

      // Find the teams and their players
      const team1 = this.findTeam(match.team1Id);
      const team2 = this.findTeam(match.team2Id);
      if (!team1 || !team2) return;

      // Send join_match to each player with their assigned position
      // Team1 → positions 0,2 (TrucoRoom Team 0)
      // Team2 → positions 1,3 (TrucoRoom Team 1)
      const assignments = [
        { playerId: team1.player1Id, position: 0 },
        { playerId: team2.player1Id, position: 1 },
        { playerId: team1.player2Id, position: 2 },
        { playerId: team2.player2Id, position: 3 },
      ];

      for (const { playerId, position } of assignments) {
        const client = this.clients.find(c => c.sessionId === playerId);
        if (client) {
          client.send('join_match', {
            matchId: match.id,
            roomId: reservation.roomId,
            position,
            round: match.round,
            team1Name: match.team1Name,
            team2Name: match.team2Name,
          });
        }
      }

      // Set a timeout for match result (15 min max)
      const timeout = setTimeout(() => {
        this.matchResultTimeout.delete(match.id);
        if (match.status === 'playing') {
          console.log(`Tournament: Match ${match.id} timed out`);
          // Auto-resolve: team1 wins by default
          this.handleMatchResult(match.id, match.team1Id, [12, 0]);
        }
      }, 15 * 60 * 1000);
      this.matchResultTimeout.set(match.id, timeout);

      console.log(`Tournament: Match ${match.id} started (room ${reservation.roomId})`);
    } catch (err) {
      console.error(`Tournament: Failed to create match room:`, err);
    }
  }

  private handleMatchResult(matchId: number, winnerTeamId: string, score: [number, number]) {
    const match = this.state.matches.find((m: TournamentMatchSchema) => m.id === matchId);
    if (!match || match.status === 'done') return; // Idempotent

    // Clear timeout
    const timeout = this.matchResultTimeout.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.matchResultTimeout.delete(matchId);
    }

    match.winnerId = winnerTeamId;
    match.score1 = score[0];
    match.score2 = score[1];
    match.status = 'done';

    const winnerTeam = this.findTeam(winnerTeamId);
    console.log(`Tournament: Match ${matchId} won by ${winnerTeam?.name} (${score[0]}-${score[1]})`);

    if (match.round === 1) {
      this.advanceToFinal(matchId, winnerTeamId);
    } else if (match.round === 2) {
      this.finishTournament(winnerTeamId);
    }
  }

  private advanceToFinal(semiMatchId: number, winnerTeamId: string) {
    const final_ = this.state.matches.find((m: TournamentMatchSchema) => m.round === 2);
    if (!final_) return;

    const winnerTeam = this.findTeam(winnerTeamId);
    if (!winnerTeam) return;

    if (semiMatchId === 0) {
      final_.team1Id = winnerTeamId;
      final_.team1Name = winnerTeam.name;
    } else {
      final_.team2Id = winnerTeamId;
      final_.team2Name = winnerTeam.name;
    }

    // If both semis are done, start the final
    const allSemisDone = this.state.matches
      .filter((m: TournamentMatchSchema) => m.round === 1)
      .every((m: TournamentMatchSchema) => m.status === 'done');

    if (allSemisDone && final_.team1Id && final_.team2Id) {
      console.log(`Tournament: Both semis done, starting final`);
      setTimeout(() => this.startMatch(2), 3000);
    }
  }

  private finishTournament(winnerTeamId: string) {
    const winnerTeam = this.findTeam(winnerTeamId);
    this.state.championTeamId = winnerTeamId;
    this.state.championTeamName = winnerTeam?.name || '';
    this.state.phase = 'finished';
    this.setMetadata({ phase: 'finished' });

    this.broadcast('tournament_complete', {
      championTeamId: winnerTeamId,
      championTeamName: winnerTeam?.name || '',
    });

    console.log(`Tournament ${this.roomId} finished! Champion: ${winnerTeam?.name}`);

    // Auto-dispose after 2 minutes
    setTimeout(() => this.disconnect(), 2 * 60 * 1000);
  }

  // === Helpers ===

  private findTeam(teamId: string): TournamentTeamSchema | undefined {
    return this.state.teams.find((t: TournamentTeamSchema) => t.id === teamId);
  }

  private removePlayerAndCleanup(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    // If player had a team, remove the team and unpair the partner
    if (player.teamId) {
      const teamsArr = this.state.teams.toArray();
      const teamIdx = teamsArr.findIndex(t => t.id === player.teamId);
      if (teamIdx >= 0) {
        const team = teamsArr[teamIdx]!;
        const partnerId = team.player1Id === sessionId ? team.player2Id : team.player1Id;
        const partner = this.state.players.get(partnerId);
        if (partner) {
          partner.teamId = '';
        }
        this.state.teams.splice(teamIdx, 1);
        this.state.teamCount = this.state.teams.length;
      }
    }

    this.state.players.delete(sessionId);
    this.state.playerCount = this.state.players.size;
  }
}
