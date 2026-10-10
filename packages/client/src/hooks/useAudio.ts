'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { playSound, toggleMute, isMuted, setMuted, initAudio, setVolume, getVolume } from '../lib/audio';
import type { GameStateData } from './useColyseus';

export function useAudio(gameState: GameStateData | null, sessionId: string) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(getVolume());
  const prevEventRef = useRef<string>('');
  const prevPhaseRef = useRef<string>('');
  const prevTurnRef = useRef<string>('');
  const initializedRef = useRef(false);

  // Initialize audio on first user interaction
  const initialize = useCallback(() => {
    if (!initializedRef.current) {
      initAudio();
      initializedRef.current = true;
    }
  }, []);

  // React to game state changes
  useEffect(() => {
    if (!gameState) return;

    // Play sound based on last event change
    const lastEvent = gameState.lastEvent;
    if (lastEvent && lastEvent !== prevEventRef.current) {
      prevEventRef.current = lastEvent;

      switch (lastEvent) {
        case 'dealing':
          playSound('card_shuffle');
          break;
        case 'truco_called':
          try {
            const data = JSON.parse(gameState.lastEventData);
            switch (data.level) {
              case 4: playSound('truco_call'); break;
              case 6: playSound('seis_call'); break;
              case 10: playSound('nove_call'); break;
              case 12: playSound('doze_call'); break;
            }
          } catch { playSound('truco_call'); }
          break;
        case 'truco_accepted':
          playSound('accept');
          break;
        case 'truco_run':
          playSound('run');
          break;
        case 'truco_raised':
          try {
            const data = JSON.parse(gameState.lastEventData);
            switch (data.level) {
              case 6: playSound('seis_call'); break;
              case 10: playSound('nove_call'); break;
              case 12: playSound('doze_call'); break;
            }
          } catch { playSound('truco_call'); }
          break;
        case 'round_result':
          playSound('round_win');
          break;
        case 'hand_result':
          playSound('hand_win');
          break;
        case 'game_over':
          try {
            const data = JSON.parse(gameState.lastEventData);
            const myPlayer = gameState.players.get(sessionId);
            if (myPlayer && data.winnerTeam === myPlayer.team) {
              playSound('game_win');
            } else {
              playSound('game_lose');
            }
          } catch { playSound('game_win'); }
          break;
      }
    }

    // Play card sound when phase goes from playing (cards change)
    // This is handled by listening for played cards

    // Notify when it's the player's turn
    if (gameState.currentTurn === sessionId && prevTurnRef.current !== sessionId) {
      if (gameState.phase === 'playing') {
        playSound('your_turn');
      }
    }
    prevTurnRef.current = gameState.currentTurn;

    prevPhaseRef.current = gameState.phase;
  }, [gameState, sessionId]);

  const handleToggleMute = useCallback(() => {
    const newMuted = toggleMute();
    setMutedState(newMuted);
  }, []);

  const handleSetVolume = useCallback((v: number) => {
    setVolume(v);
    setVolumeState(v);
  }, []);

  return {
    muted,
    volume,
    initialize,
    toggleMute: handleToggleMute,
    setVolume: handleSetVolume,
    playSound,
  };
}
