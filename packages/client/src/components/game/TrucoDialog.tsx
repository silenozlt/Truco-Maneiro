'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';

const LEVEL_NAMES: Record<number, string> = {
  4: 'TRUCO!',
  6: 'SEIS!',
  10: 'DEZ!',
  12: 'DOZE!',
};

const TIMEOUT_SECONDS = 10;

interface TrucoDialogProps {
  level: number;
  calledByName: string;
  isResponder: boolean;
  canRaise: boolean;
  onAccept: () => void;
  onRun: () => void;
  onRaise: () => void;
  partnerName?: string;
}

export default function TrucoDialog({
  level,
  calledByName,
  isResponder,
  canRaise,
  onAccept,
  onRun,
  onRaise,
  partnerName,
}: TrucoDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const startTimeRef = useRef(Date.now());

  // Reset timer when level changes (new call or raise)
  useEffect(() => {
    startTimeRef.current = Date.now();
    setSecondsLeft(TIMEOUT_SECONDS);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(TIMEOUT_SECONDS - elapsed));
      setSecondsLeft(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [level]);

  const progress = secondsLeft / TIMEOUT_SECONDS;
  const isUrgent = secondsLeft <= 3;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-8 border-2 border-amber-400/50 shadow-2xl max-w-sm w-full mx-4 animate-scale-in">
        {/* Title */}
        <div className="text-center mb-4">
          <div className="text-5xl font-black text-amber-400 mb-2 animate-bounce">
            {LEVEL_NAMES[level] || `${level}!`}
          </div>
          <p className="text-green-200/80 text-sm">
            {calledByName} pediu {LEVEL_NAMES[level]?.toLowerCase() || level}!
          </p>
        </div>

        {/* Countdown timer */}
        <div className="mb-5">
          <div className="flex items-center justify-center mb-2">
            <span className={`text-2xl font-bold tabular-nums ${isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
              {secondsLeft}s
            </span>
          </div>
          <div className="w-full h-2 bg-green-950 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${isUrgent ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Response buttons — shown to both partners on the responding team */}
        {isResponder && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-green-300/60 text-xs mb-1">
              Voce ou {partnerName || 'seu parceiro'} podem responder
            </p>

            <Button
              variant="success"
              size="lg"
              className="w-full"
              onClick={onAccept}
            >
              Aceitar
            </Button>

            {canRaise && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={onRaise}
              >
                Aumentar
              </Button>
            )}

            <Button
              variant="danger"
              size="lg"
              className="w-full"
              onClick={onRun}
            >
              Correr
            </Button>
          </div>
        )}

        {!isResponder && (
          <p className="text-center text-green-300/60 text-sm animate-pulse">
            Aguardando resposta do adversario...
          </p>
        )}
      </div>
    </div>
  );
}
