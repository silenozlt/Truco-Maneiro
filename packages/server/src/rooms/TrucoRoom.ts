import { Room, Client } from '@colyseus/core';
import {
  TrucoGameState,
  PlayerSchema,
  TeamSchema,
} from '../state/GameState';
import {
  initializeGame,
  startGame,
  playCard,
  callTruco,
  respondTruco,
  scheduleNextHand,
  startNewHand,
} from '../game/engine';
import { getAIDecision, getAIDelay } from '../game/ai';
import {
  POSITION_TO_TEAM,
  type PlayerPosition,
  type TeamId,
} from '@truco/shared';

export class TrucoRoom extends Room<TrucoGameState> {
  maxClients = 4;
  private aiTimers: Map<string, NodeJS.Timeout> = new Map();
  private handEndTimer: NodeJS.Timeout | null = null;
  private trucoResponseTimer: NodeJS.Timeout | null = null;
  private static readonly TRUCO_TIMEOUT_MS = 10_000;

  onCreate(options: any) {
    this.setState(new TrucoGameState());
    initializeGame(this.state);

    // Register message handlers
    this.onMessage('play_card', (client, data: { cardIndex: number }) => {
      this.handlePlayCard(client.sessionId, data.cardIndex);
    });

    this.onMessage('call_truco', (client) => {
      this.handleCallTruco(client.sessionId);
    });

    this.onMessage('respond_truco', (client, data: { response: 'accept' | 'run' | 'raise' }) => {
      this.handleRespondTruco(client.sessionId, data.response);
    });

    this.onMessage('start_game', (client) => {
      this.handleStartGame();
    });

    this.onMessage('add_bot', (client, data: { position?: number }) => {
      this.handleAddBot(data.position);
    });

    this.onMessage('restart_game', (client) => {
      this.handleRestartGame();
    });

    console.log(`Room ${this.roomId} created`);
  }

  onJoin(client: Client, options: { name?: string } = {}) {
    const position = this.getNextAvailablePosition();
    if (position === null) return;

    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options.name || `Jogador ${position + 1}`;
    player.team = POSITION_TO_TEAM[position];
    player.position = position;
    player.isBot = false;
    player.isConnected = true;

    this.state.players.set(client.sessionId, player);
    this.state.teams[player.team].players.push(client.sessionId);
    this.state.playerCount = this.state.players.size;

    console.log(`Player ${player.name} joined at position ${position} (team ${player.team})`);
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (this.state.phase === 'waiting' || this.state.phase === 'game_over') {
      // Remove player completely
      this.removePlayer(client.sessionId);
    } else {
      // Replace with bot during game
      player.isBot = true;
      player.isConnected = false;
      player.name = `Bot ${player.position + 1}`;
      console.log(`Player disconnected, replaced by Bot at position ${player.position}`);

      // If it's the bot's turn, schedule AI action
      this.scheduleAITurn(client.sessionId);
    }
  }

  onDispose() {
    // Clear all timers
    this.aiTimers.forEach(timer => clearTimeout(timer));
    this.aiTimers.clear();
    if (this.handEndTimer) clearTimeout(this.handEndTimer);
    this.clearTrucoTimer();
    console.log(`Room ${this.roomId} disposed`);
  }

  // === Game Logic Handlers ===

  private handlePlayCard(playerId: string, cardIndex: number) {
    const success = playCard(this.state, playerId, cardIndex);
    if (success) {
      this.afterAction();
    }
  }

  private handleCallTruco(playerId: string) {
    const success = callTruco(this.state, playerId);
    if (success) {
      this.startTrucoTimer();
      this.afterAction();
    }
  }

  private handleRespondTruco(playerId: string, response: 'accept' | 'run' | 'raise') {
    this.clearTrucoTimer();
    const success = respondTruco(this.state, playerId, response);
    if (success) {
      // If it was a raise, start a new timer for the other team
      if (response === 'raise') {
        this.startTrucoTimer();
      }
      this.afterAction();
    }
  }

  private handleStartGame() {
    if (this.state.playerCount < 4) {
      console.log('Not enough players to start');
      return;
    }
    startGame(this.state);
    this.afterAction();
  }

  private handleAddBot(position?: number) {
    const pos = position !== undefined ? position as PlayerPosition : this.getNextAvailablePosition();
    if (pos === null) return;

    const botId = `bot-${pos}`;
    const bot = new PlayerSchema();
    bot.id = botId;
    bot.name = `Bot ${pos + 1}`;
    bot.team = POSITION_TO_TEAM[pos];
    bot.position = pos;
    bot.isBot = true;
    bot.isConnected = true;

    this.state.players.set(botId, bot);
    this.state.teams[bot.team].players.push(botId);
    this.state.playerCount = this.state.players.size;

    console.log(`Bot added at position ${pos} (team ${bot.team})`);
  }

  private handleRestartGame() {
    // Clear timers
    this.aiTimers.forEach(timer => clearTimeout(timer));
    this.aiTimers.clear();
    if (this.handEndTimer) clearTimeout(this.handEndTimer);
    this.clearTrucoTimer();

    startGame(this.state);
    this.afterAction();
  }

  private startTrucoTimer() {
    this.clearTrucoTimer();
    this.trucoResponseTimer = setTimeout(() => {
      this.trucoResponseTimer = null;
      // Auto-run if still waiting for a response
      if (this.state.phase !== 'truco_called' || !this.state.trucoCall) return;

      const respondingTeam = this.state.trucoCall.respondingTeam;
      // Find first player on the responding team to auto-run
      let responderId: string | null = null;
      this.state.players.forEach((p: PlayerSchema) => {
        if (!responderId && p.team === respondingTeam) {
          responderId = p.id;
        }
      });

      if (responderId) {
        console.log(`Truco timer expired, auto-running for team ${respondingTeam}`);
        this.handleRespondTruco(responderId, 'run');
      }
    }, TrucoRoom.TRUCO_TIMEOUT_MS);
  }

  private clearTrucoTimer() {
    if (this.trucoResponseTimer) {
      clearTimeout(this.trucoResponseTimer);
      this.trucoResponseTimer = null;
    }
  }

  // === Helper Methods ===

  private getNextAvailablePosition(): PlayerPosition | null {
    const occupied = new Set<number>();
    this.state.players.forEach((p: PlayerSchema) => {
      occupied.add(p.position);
    });

    for (let i = 0; i < 4; i++) {
      if (!occupied.has(i)) return i as PlayerPosition;
    }
    return null;
  }

  private removePlayer(playerId: string) {
    const player = this.state.players.get(playerId);
    if (!player) return;

    // Remove from team
    const team = this.state.teams[player.team];
    const idx = team.players.indexOf(playerId);
    if (idx !== -1) team.players.splice(idx, 1);

    this.state.players.delete(playerId);
    this.state.playerCount = this.state.players.size;
  }

  /**
   * Called after any game action to check for AI turns and hand transitions.
   */
  private afterAction() {
    // If hand ended, schedule next hand
    if (this.state.phase === 'hand_end' && this.state.winner === -1) {
      if (this.handEndTimer) clearTimeout(this.handEndTimer);
      this.handEndTimer = setTimeout(() => {
        startNewHand(this.state);
        this.afterAction();
      }, 2000);
      return;
    }

    // If round ended (briefly), continue
    if (this.state.phase === 'round_end') {
      // The engine already transitioned, but let's ensure we proceed
      return;
    }

    // Check if it's a bot's turn
    if (this.state.phase === 'playing') {
      const currentPlayer = this.state.players.get(this.state.currentTurn);
      if (currentPlayer?.isBot) {
        this.scheduleAITurn(this.state.currentTurn);
      }
    }

    // Check if bots need to respond to truco
    if (this.state.phase === 'truco_called' && this.state.trucoCall) {
      const respondingTeam = this.state.trucoCall.respondingTeam;

      // Check if there's a connected human on the responding team
      let hasHumanOnTeam = false;
      this.state.players.forEach((p: PlayerSchema) => {
        if (!p.isBot && p.isConnected && p.team === respondingTeam) {
          hasHumanOnTeam = true;
        }
      });

      // Only let bot respond if there are no humans on the team
      if (!hasHumanOnTeam) {
        this.state.players.forEach((p: PlayerSchema) => {
          if (p.isBot && p.team === respondingTeam) {
            this.scheduleAITurn(p.id);
          }
        });
      }
    }
  }

  /**
   * Schedule an AI action with a delay.
   */
  private scheduleAITurn(botId: string) {
    // Don't schedule if already scheduled
    if (this.aiTimers.has(botId)) return;

    const delay = getAIDelay();
    const timer = setTimeout(() => {
      this.aiTimers.delete(botId);
      this.executeAITurn(botId);
    }, delay);

    this.aiTimers.set(botId, timer);
  }

  /**
   * Execute an AI turn.
   */
  private executeAITurn(botId: string) {
    const decision = getAIDecision(this.state, botId);
    if (!decision) return;

    switch (decision.action) {
      case 'play_card':
        if (decision.cardIndex !== undefined) {
          this.handlePlayCard(botId, decision.cardIndex);
        }
        break;
      case 'call_truco':
        this.handleCallTruco(botId);
        break;
      case 'respond_truco':
        if (decision.trucoResponse) {
          this.handleRespondTruco(botId, decision.trucoResponse);
        }
        break;
    }
  }
}
