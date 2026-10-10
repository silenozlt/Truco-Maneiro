'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Room } from 'colyseus.js';
import { createRoom, joinRoom } from '../lib/colyseus';
import { saveReplay } from '../lib/replays';

export interface ChatMessage {
  playerId: string;
  playerName: string;
  team: number;
  message: string;
  timestamp: number;
}

export interface GameStateData {
  phase: string;
  currentTurn: string;
  dealerPosition: number;
  playerCount: number;
  winner: number;
  lastEvent: string;
  lastEventData: string;
  teams: Array<{
    score: number;
    players: string[];
  }>;
  players: Map<string, {
    id: string;
    name: string;
    team: number;
    position: number;
    isBot: boolean;
    isConnected: boolean;
    hand: Array<{
      suit: string;
      rank: string;
      id: string;
    }>;
  }>;
  currentHand: {
    rounds: Array<{
      cardsPlayed: Array<{
        playerId: string;
        card: { suit: string; rank: string; id: string };
        position: number;
      }>;
      winner: number;
      complete: boolean;
    }>;
    currentRound: number;
    trucoLevel: number;
    points: number;
    winner: number;
    complete: boolean;
    dealerPosition: number;
  } | null;
  trucoCall: {
    level: number;
    calledBy: string;
    calledByTeam: number;
    respondingTeam: number;
    status: string;
  } | null;
  playOrder: string[];
}

export function useColyseus() {
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const roomRef = useRef<Room | null>(null);

  const setupListeners = useCallback((r: Room) => {
    roomRef.current = r;
    setRoom(r);
    setSessionId(r.sessionId);
    setConnected(true);
    setError(null);

    r.onStateChange((state: any) => {
      // Deep clone the state for React
      const data: GameStateData = {
        phase: state.phase,
        currentTurn: state.currentTurn,
        dealerPosition: state.dealerPosition,
        playerCount: state.playerCount,
        winner: state.winner,
        lastEvent: state.lastEvent,
        lastEventData: state.lastEventData,
        teams: [],
        players: new Map(),
        currentHand: null,
        trucoCall: null,
        playOrder: [],
      };

      // Teams
      if (state.teams) {
        state.teams.forEach((team: any) => {
          const players: string[] = [];
          if (team.players) {
            team.players.forEach((p: string) => players.push(p));
          }
          data.teams.push({ score: team.score, players });
        });
      }

      // Players
      if (state.players) {
        state.players.forEach((player: any, key: string) => {
          const hand: Array<{ suit: string; rank: string; id: string }> = [];
          if (player.hand) {
            player.hand.forEach((card: any) => {
              hand.push({ suit: card.suit, rank: card.rank, id: card.id });
            });
          }
          data.players.set(key, {
            id: player.id,
            name: player.name,
            team: player.team,
            position: player.position,
            isBot: player.isBot,
            isConnected: player.isConnected,
            hand,
          });
        });
      }

      // Current hand
      if (state.currentHand) {
        const h = state.currentHand;
        const rounds: any[] = [];
        if (h.rounds) {
          h.rounds.forEach((round: any) => {
            const cardsPlayed: any[] = [];
            if (round.cardsPlayed) {
              round.cardsPlayed.forEach((pc: any) => {
                cardsPlayed.push({
                  playerId: pc.playerId,
                  card: { suit: pc.card.suit, rank: pc.card.rank, id: pc.card.id },
                  position: pc.position,
                });
              });
            }
            rounds.push({
              cardsPlayed,
              winner: round.winner,
              complete: round.complete,
            });
          });
        }
        data.currentHand = {
          rounds,
          currentRound: h.currentRound,
          trucoLevel: h.trucoLevel,
          points: h.points,
          winner: h.winner,
          complete: h.complete,
          dealerPosition: h.dealerPosition,
        };
      }

      // Truco call
      if (state.trucoCall) {
        data.trucoCall = {
          level: state.trucoCall.level,
          calledBy: state.trucoCall.calledBy,
          calledByTeam: state.trucoCall.calledByTeam,
          respondingTeam: state.trucoCall.respondingTeam,
          status: state.trucoCall.status,
        };
      }

      // Play order
      if (state.playOrder) {
        state.playOrder.forEach((id: string) => data.playOrder.push(id));
      }

      setGameState(data);
    });

    r.onMessage('chat', (msg: { playerId: string; playerName: string; team: number; message: string }) => {
      setChatMessages(prev => [...prev.slice(-49), { ...msg, timestamp: Date.now() }]);
    });

    r.onMessage('replay_data', (data: { actions: any[]; startTime: number }) => {
      if (data.actions?.length > 0) {
        saveReplay(data.actions, data.startTime);
      }
    });

    r.onLeave((code: number) => {
      setConnected(false);
      console.log('Left room:', code);
    });

    r.onError((code: number, message?: string) => {
      setError(`Erro: ${message || code}`);
    });
  }, []);

  const create = useCallback(async (playerName: string, difficulty?: string) => {
    try {
      const r = await createRoom(playerName, difficulty);
      setupListeners(r);
      return r.roomId;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar sala');
      return null;
    }
  }, [setupListeners]);

  const join = useCallback(async (roomId: string, playerName: string) => {
    try {
      const r = await joinRoom(roomId, playerName);
      setupListeners(r);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar na sala');
      return false;
    }
  }, [setupListeners]);

  const playCard = useCallback((cardIndex: number) => {
    roomRef.current?.send('play_card', { cardIndex });
  }, []);

  const callTruco = useCallback(() => {
    roomRef.current?.send('call_truco', {});
  }, []);

  const respondTruco = useCallback((response: 'accept' | 'run' | 'raise') => {
    roomRef.current?.send('respond_truco', { response });
  }, []);

  const startGame = useCallback(() => {
    roomRef.current?.send('start_game', {});
  }, []);

  const addBot = useCallback((position?: number) => {
    roomRef.current?.send('add_bot', { position });
  }, []);

  const restartGame = useCallback(() => {
    roomRef.current?.send('restart_game', {});
  }, []);

  const sendChat = useCallback((message: string) => {
    roomRef.current?.send('chat', { message });
  }, []);

  const leave = useCallback(() => {
    roomRef.current?.leave();
    setRoom(null);
    setGameState(null);
    setConnected(false);
    setSessionId('');
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
    };
  }, []);

  return {
    room,
    gameState,
    sessionId,
    error,
    connected,
    chatMessages,
    create,
    join,
    playCard,
    callTruco,
    respondTruco,
    startGame,
    addBot,
    restartGame,
    sendChat,
    leave,
  };
}
