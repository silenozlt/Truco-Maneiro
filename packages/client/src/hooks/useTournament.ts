'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Room } from 'colyseus.js';
import { joinTournament, rejoinTournamentRoom } from '../lib/colyseus';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar: string;
  teamId: string;
}

export interface TournamentTeam {
  id: string;
  name: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
}

export interface TournamentMatch {
  id: number;
  round: number;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  winnerId: string;
  score1: number;
  score2: number;
  status: string;
  roomId: string;
}

export interface TournamentState {
  phase: string;
  players: Map<string, TournamentPlayer>;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  playerCount: number;
  teamCount: number;
  championTeamId: string;
  championTeamName: string;
}

export interface JoinMatchData {
  matchId: number;
  roomId: string;
  position: number;
  round: number;
  team1Name: string;
  team2Name: string;
}

const STORAGE_KEY = 'tournament_reconnect';

export function useTournament() {
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<JoinMatchData | null>(null);

  const roomRef = useRef<Room | null>(null);

  const setupListeners = useCallback((r: Room) => {
    roomRef.current = r;
    setSessionId(r.sessionId);
    setConnected(true);
    setError(null);

    r.onStateChange((state: any) => {
      const data: TournamentState = {
        phase: state.phase,
        players: new Map(),
        teams: [],
        matches: [],
        playerCount: state.playerCount,
        teamCount: state.teamCount,
        championTeamId: state.championTeamId,
        championTeamName: state.championTeamName,
      };

      state.players?.forEach((p: any, key: string) => {
        data.players.set(key, {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          teamId: p.teamId,
        });
      });

      state.teams?.forEach((t: any) => {
        data.teams.push({
          id: t.id,
          name: t.name,
          player1Id: t.player1Id,
          player1Name: t.player1Name,
          player2Id: t.player2Id,
          player2Name: t.player2Name,
        });
      });

      state.matches?.forEach((m: any) => {
        data.matches.push({
          id: m.id,
          round: m.round,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          team1Name: m.team1Name,
          team2Name: m.team2Name,
          winnerId: m.winnerId,
          score1: m.score1,
          score2: m.score2,
          status: m.status,
          roomId: m.roomId,
        });
      });

      setTournamentState(data);
    });

    r.onMessage('join_match', (data: JoinMatchData) => {
      // Save reconnect info before navigating away
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomId: r.id,
        sessionId: r.sessionId,
      }));
      setPendingMatch(data);
    });

    r.onMessage('tournament_complete', () => {
      sessionStorage.removeItem(STORAGE_KEY);
    });

    r.onLeave(() => {
      setConnected(false);
    });

    r.onError((_code, msg) => {
      setError(`Erro: ${msg || _code}`);
    });
  }, []);

  // Join tournament queue
  const joinQueue = useCallback(async (playerName: string, mode: 'auto' | 'partner', avatar?: string, partnerCode?: string) => {
    try {
      setError(null);
      const r = await joinTournament(playerName, mode, avatar, partnerCode);
      setupListeners(r);
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no torneio');
    }
  }, [setupListeners]);

  // Reconnect after returning from a match
  const reconnect = useCallback(async (playerName: string, avatar?: string) => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const { roomId, sessionId: storedSessionId } = JSON.parse(raw);
      const r = await rejoinTournamentRoom(roomId, playerName, storedSessionId, avatar);
      setupListeners(r);
      sessionStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }, [setupListeners]);

  // Report match result back to tournament room
  const reportMatchResult = useCallback((matchId: number, winnerTeamId: string, score: [number, number]) => {
    roomRef.current?.send('match_result', { matchId, winnerTeamId, score });
    setPendingMatch(null);
  }, []);

  // Clear pending match (after navigating to game)
  const clearPendingMatch = useCallback(() => {
    setPendingMatch(null);
  }, []);

  const leaveTournament = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    setTournamentState(null);
    setConnected(false);
    setSessionId('');
    setPendingMatch(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect if we're navigating to a match
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        roomRef.current?.leave();
      }
    };
  }, []);

  return {
    tournamentState,
    sessionId,
    error,
    connected,
    pendingMatch,
    joinQueue,
    reconnect,
    reportMatchResult,
    clearPendingMatch,
    leaveTournament,
  };
}
