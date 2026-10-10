'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../components/ui/Button';

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handlePlay = (mode: 'online' | 'ai') => {
    const name = playerName.trim() || 'Jogador';
    if (mode === 'online') {
      router.push(`/lobby?name=${encodeURIComponent(name)}`);
    } else {
      router.push(`/game?mode=ai&name=${encodeURIComponent(name)}&difficulty=${difficulty}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Logo / Title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-amber-400 drop-shadow-lg mb-2">
          TRUCO
        </h1>
        <h2 className="text-3xl font-bold text-amber-200/80">
          MINEIRO
        </h2>
        <p className="text-green-300/60 mt-4 text-lg">
          O jogo de cartas mais brabo de Minas
        </p>
      </div>

      {/* Card decoration */}
      <div className="flex gap-2 mb-10 text-5xl">
        <span className="text-red-500">&#9829;</span>
        <span className="text-black">&#9824;</span>
        <span className="text-red-500">&#9830;</span>
        <span className="text-black">&#9827;</span>
      </div>

      {/* Name input */}
      <div className="w-full max-w-sm mb-8">
        <label className="block text-green-200 text-sm font-bold mb-2">
          Seu nome
        </label>
        <input
          type="text"
          placeholder="Digite seu nome..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          className="w-full px-4 py-3 rounded-lg bg-green-800/50 border-2 border-green-600/50 text-white placeholder-green-400/50 focus:outline-none focus:border-amber-400 transition-colors text-lg"
        />
      </div>

      {/* Difficulty selector */}
      <div className="w-full max-w-sm mb-6">
        <label className="block text-green-200 text-sm font-bold mb-2">
          Dificuldade (vs Computador)
        </label>
        <div className="flex gap-2">
          {([
            { value: 'easy' as const, label: 'Facil', color: 'green' },
            { value: 'medium' as const, label: 'Medio', color: 'amber' },
            { value: 'hard' as const, label: 'Dificil', color: 'red' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(opt.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-2 ${
                difficulty === opt.value
                  ? opt.color === 'green'
                    ? 'bg-green-600 border-green-400 text-white'
                    : opt.color === 'amber'
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-red-600 border-red-400 text-white'
                  : 'bg-green-800/50 border-green-600/30 text-green-300/60 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Play buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => handlePlay('online')}
        >
          Jogar Online (2v2)
        </Button>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => handlePlay('ai')}
        >
          Jogar vs Computador
        </Button>
      </div>

      {/* Footer info */}
      <div className="mt-16 text-green-400/40 text-sm text-center">
        <p>Truco Mineiro - Manilhas Fixas</p>
        <p>Zap (4&#9827;) &gt; Copas (7&#9829;) &gt; Espadilha (A&#9824;) &gt; Ouros (7&#9830;)</p>
      </div>
    </div>
  );
}
