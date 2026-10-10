'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../components/ui/Button';

interface TournamentMatch {
  id: number;
  round: number;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  winner: string | null;
  status: 'pending' | 'playing' | 'done';
}

interface TournamentState {
  teams: string[];
  matches: TournamentMatch[];
  bestOf: number;
  currentMatchIdx: number;
  champion: string | null;
}

function generateBracket(teams: string[], bestOf: number): TournamentState {
  const n = teams.length;
  const matches: TournamentMatch[] = [];
  let id = 0;

  // Round 1 (semis for 4 teams)
  for (let i = 0; i < n; i += 2) {
    matches.push({
      id: id++,
      round: 1,
      team1: teams[i],
      team2: teams[i + 1] || 'BYE',
      score1: 0,
      score2: 0,
      winner: teams[i + 1] ? null : teams[i],
      status: teams[i + 1] ? 'pending' : 'done',
    });
  }

  // Final
  matches.push({
    id: id++,
    round: 2,
    team1: '',
    team2: '',
    score1: 0,
    score2: 0,
    winner: null,
    status: 'pending',
  });

  return { teams, matches, bestOf, currentMatchIdx: 0, champion: null };
}

export default function TorneioPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'setup' | 'bracket'>('setup');
  const [teamNames, setTeamNames] = useState(['Dupla 1', 'Dupla 2', 'Dupla 3', 'Dupla 4']);
  const [bestOf, setBestOf] = useState(3);
  const [tournament, setTournament] = useState<TournamentState | null>(null);

  const handleStart = () => {
    const t = generateBracket(teamNames, bestOf);
    setTournament(t);
    setPhase('bracket');
  };

  const handleSimulateMatch = useCallback((matchIdx: number) => {
    if (!tournament) return;
    setTournament(prev => {
      if (!prev) return prev;
      const matches = [...prev.matches];
      const match = { ...matches[matchIdx] };

      // Simulate: random winner
      const winsNeeded = Math.ceil(prev.bestOf / 2);
      let s1 = 0, s2 = 0;
      while (s1 < winsNeeded && s2 < winsNeeded) {
        if (Math.random() > 0.5) s1++; else s2++;
      }
      match.score1 = s1;
      match.score2 = s2;
      match.winner = s1 > s2 ? match.team1 : match.team2;
      match.status = 'done';
      matches[matchIdx] = match;

      // Advance winner to next round
      const nextRoundMatches = matches.filter(m => m.round === match.round + 1);
      if (nextRoundMatches.length > 0) {
        const semiIdx = matches.filter(m => m.round === match.round).indexOf(matches[matchIdx]);
        const nextMatch = { ...nextRoundMatches[0] };
        if (semiIdx === 0) {
          nextMatch.team1 = match.winner;
        } else {
          nextMatch.team2 = match.winner;
        }
        // Check if next match is ready
        if (nextMatch.team1 && nextMatch.team2) {
          nextMatch.status = 'pending';
        }
        const nmIdx = matches.findIndex(m => m.id === nextMatch.id);
        matches[nmIdx] = nextMatch;
      }

      // Check for champion
      const finalMatch = matches.find(m => m.round === 2);
      const champion = finalMatch?.winner || null;

      return { ...prev, matches, champion };
    });
  }, [tournament]);

  if (phase === 'setup') {
    return (
      <div className="min-h-screen p-4 sm:p-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Torneio</h1>
          <Button variant="secondary" size="sm" onClick={() => router.push('/')}>Voltar</Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-green-200 text-xs sm:text-sm font-bold mb-2">Duplas</label>
            {teamNames.map((name, i) => (
              <input
                key={i}
                type="text"
                value={name}
                onChange={(e) => {
                  const n = [...teamNames];
                  n[i] = e.target.value;
                  setTeamNames(n);
                }}
                maxLength={20}
                className="w-full px-3 py-2 mb-2 rounded-lg bg-green-800/50 border border-green-600/50 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            ))}
          </div>

          <div>
            <label className="block text-green-200 text-xs sm:text-sm font-bold mb-2">Formato</label>
            <div className="flex gap-2">
              {[3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setBestOf(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer border-2 transition-all ${
                    bestOf === n ? 'bg-amber-600 border-amber-400 text-white' : 'bg-green-800/50 border-green-600/30 text-green-300/60'
                  }`}
                >
                  Melhor de {n}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" className="w-full mt-4" onClick={handleStart}>
            Iniciar Torneio
          </Button>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const semis = tournament.matches.filter(m => m.round === 1);
  const final_ = tournament.matches.find(m => m.round === 2);

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Bracket</h1>
        <Button variant="secondary" size="sm" onClick={() => { setPhase('setup'); setTournament(null); }}>
          Novo Torneio
        </Button>
      </div>

      {/* Champion */}
      {tournament.champion && (
        <div className="text-center mb-6 p-4 bg-amber-900/20 rounded-xl border border-amber-600/30">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-2xl font-black text-amber-400">{tournament.champion}</div>
          <div className="text-green-300/60 text-sm">Campeao do Torneio!</div>
        </div>
      )}

      {/* Bracket */}
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Semis */}
        <div className="flex flex-col gap-8 sm:gap-16">
          {semis.map((match, i) => (
            <MatchCard key={match.id} match={match} bestOf={tournament.bestOf} onSimulate={() => handleSimulateMatch(match.id)} />
          ))}
        </div>

        {/* Connector lines */}
        <div className="flex flex-col items-center justify-center h-40 sm:h-52">
          <div className="w-6 sm:w-10 border-t-2 border-green-600/40" />
          <div className="h-full border-r-2 border-green-600/40" />
          <div className="w-6 sm:w-10 border-t-2 border-green-600/40" />
        </div>

        {/* Final */}
        <div>
          {final_ && (
            <MatchCard match={final_} bestOf={tournament.bestOf} onSimulate={() => handleSimulateMatch(final_.id)} isFinal />
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button variant="secondary" size="sm" onClick={() => router.push('/')}>Voltar ao Menu</Button>
      </div>
    </div>
  );
}

function MatchCard({ match, bestOf, onSimulate, isFinal = false }: {
  match: TournamentMatch;
  bestOf: number;
  onSimulate: () => void;
  isFinal?: boolean;
}) {
  const canPlay = match.status === 'pending' && match.team1 && match.team2;

  return (
    <div className={`bg-green-800/40 rounded-xl p-3 sm:p-4 border min-w-[160px] sm:min-w-[200px] ${
      isFinal ? 'border-amber-400/50' : 'border-green-700/30'
    }`}>
      {isFinal && <div className="text-center text-[10px] text-amber-400 font-bold mb-2 uppercase">Final</div>}

      <div className="space-y-2">
        <TeamRow name={match.team1} score={match.score1} isWinner={match.winner === match.team1} />
        <div className="text-center text-green-500/30 text-xs">vs</div>
        <TeamRow name={match.team2} score={match.score2} isWinner={match.winner === match.team2} />
      </div>

      {canPlay && (
        <button
          onClick={onSimulate}
          className="w-full mt-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
        >
          Simular (MD{bestOf})
        </button>
      )}

      {match.status === 'done' && (
        <div className="text-center text-[10px] text-green-400/40 mt-2">
          {match.score1} - {match.score2}
        </div>
      )}
    </div>
  );
}

function TeamRow({ name, score, isWinner }: { name: string; score: number; isWinner: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded ${isWinner ? 'bg-emerald-900/30' : ''}`}>
      <span className={`text-xs sm:text-sm font-bold ${
        !name ? 'text-green-400/30' : isWinner ? 'text-emerald-400' : 'text-white'
      }`}>
        {name || 'A definir'}
      </span>
      {score > 0 && (
        <span className={`text-xs font-bold ${isWinner ? 'text-emerald-400' : 'text-green-400/60'}`}>{score}</span>
      )}
    </div>
  );
}
