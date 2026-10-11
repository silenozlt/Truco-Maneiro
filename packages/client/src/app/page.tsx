'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../components/ui/Button';
import { FREE_AVATARS, PREMIUM_AVATARS, AVATARS, loadAvatar, saveAvatar } from '../lib/avatars';
import { isAvatarUnlocked, unlockAvatar } from '../lib/premium';
import { showRewarded } from '../lib/admob';

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [unlockedPremium, setUnlockedPremium] = useState<string[]>([]);

  useEffect(() => {
    setAvatar(loadAvatar());
    setUnlockedPremium(
      PREMIUM_AVATARS.filter((a) => isAvatarUnlocked(a))
    );
  }, []);

  const handleSelectAvatar = (a: string) => {
    setAvatar(a);
    saveAvatar(a);
    setShowAvatarPicker(false);
  };

  const handleUnlockAvatar = useCallback(async (a: string) => {
    const rewarded = await showRewarded();
    if (rewarded) {
      unlockAvatar(a);
      setUnlockedPremium((prev) => [...prev, a]);
      handleSelectAvatar(a);
    }
  }, []);

  const handlePlay = (mode: 'online' | 'ai') => {
    const name = playerName.trim() || 'Jogador';
    if (mode === 'online') {
      router.push(`/lobby?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`);
    } else {
      router.push(`/game?mode=ai&name=${encodeURIComponent(name)}&difficulty=${difficulty}&avatar=${encodeURIComponent(avatar)}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      {/* Logo / Title */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-5xl sm:text-6xl font-black text-amber-400 drop-shadow-lg mb-1 sm:mb-2">
          TRUCO
        </h1>
        <h2 className="text-2xl sm:text-3xl font-bold text-amber-200/80">
          MINEIRO
        </h2>
        <p className="text-green-300/60 mt-3 sm:mt-4 text-base sm:text-lg">
          O jogo de cartas mais brabo de Minas
        </p>
      </div>

      {/* Card decoration */}
      <div className="flex gap-2 mb-6 sm:mb-10 text-4xl sm:text-5xl">
        <span className="text-red-500">&#9829;</span>
        <span className="text-black">&#9824;</span>
        <span className="text-red-500">&#9830;</span>
        <span className="text-black">&#9827;</span>
      </div>

      {/* Avatar + Name */}
      <div className="w-full max-w-sm mb-6 sm:mb-8 px-2 sm:px-0">
        <label className="block text-green-200 text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">
          Seu perfil
        </label>
        <div className="flex gap-3 items-start">
          {/* Avatar picker */}
          <div className="relative">
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-800/50 border-2 border-green-600/50 text-2xl sm:text-3xl flex items-center justify-center cursor-pointer hover:border-amber-400 transition-colors"
            >
              {avatar}
            </button>
            {showAvatarPicker && (
              <div className="absolute top-14 sm:top-16 left-0 z-50 bg-green-900 border border-green-600/50 rounded-xl p-2 shadow-2xl grid grid-cols-6 gap-1 w-52">
                {FREE_AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => handleSelectAvatar(a)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg cursor-pointer hover:bg-green-700/50 transition-colors ${
                      avatar === a ? 'bg-amber-600/30 ring-1 ring-amber-400' : ''
                    }`}
                  >
                    {a}
                  </button>
                ))}
                {PREMIUM_AVATARS.map((a) => {
                  const unlocked = unlockedPremium.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => unlocked ? handleSelectAvatar(a) : handleUnlockAvatar(a)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-colors relative ${
                        avatar === a
                          ? 'bg-amber-600/30 ring-1 ring-amber-400'
                          : unlocked
                            ? 'hover:bg-green-700/50'
                            : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {a}
                      {!unlocked && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-amber-600 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          &#9654;
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="Digite seu nome..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-green-800/50 border-2 border-green-600/50 text-white placeholder-green-400/50 focus:outline-none focus:border-amber-400 transition-colors text-base sm:text-lg"
          />
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="w-full max-w-sm mb-5 sm:mb-6 px-2 sm:px-0">
        <label className="block text-green-200 text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">
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
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer border-2 ${
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
      <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-sm px-2 sm:px-0">
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

        {/* Game options carousel */}
        <div className="w-full max-w-sm mt-3 px-2 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {([
              { label: 'Torneio', icon: '\uD83C\uDFC6', route: `/torneio?name=${encodeURIComponent(playerName.trim() || 'Jogador')}&avatar=${encodeURIComponent(avatar)}` },
              { label: 'Assistir', icon: '\uD83D\uDC41', route: '/assistir' },
              { label: 'Replays', icon: '\uD83C\uDFAC', route: '/replay' },
              { label: 'Regras', icon: '\uD83D\uDCD6', route: '/regras' },
              { label: 'Stats', icon: '\uD83D\uDCCA', route: '/stats' },
            ]).map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.route)}
                className="flex-shrink-0 snap-start w-20 sm:w-24 py-3 rounded-xl bg-green-800/40 border border-green-600/30 hover:border-amber-400/60 hover:bg-green-700/40 transition-all cursor-pointer flex flex-col items-center gap-1.5"
              >
                <span className="text-2xl sm:text-3xl">{item.icon}</span>
                <span className="text-[10px] sm:text-xs font-bold text-green-200/80">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-10 sm:mt-16 text-green-400/40 text-xs sm:text-sm text-center">
        <p>Truco Mineiro - Manilhas Fixas</p>
        <p>Zap (4&#9827;) &gt; Copas (7&#9829;) &gt; Espadilha (A&#9824;) &gt; Ouros (7&#9830;)</p>
      </div>
    </div>
  );
}
