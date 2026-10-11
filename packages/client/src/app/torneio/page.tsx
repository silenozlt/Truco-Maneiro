'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '../../components/ui/Button';
import { useTournament } from '../../hooks/useTournament';

function TorneioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Jogador';
  const avatar = searchParams.get('avatar') || '';

  // Match result from game page redirect
  const matchResultParam = searchParams.get('matchResult');
  const matchIdParam = searchParams.get('matchId');
  const score0Param = searchParams.get('score0');
  const score1Param = searchParams.get('score1');

  const {
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
  } = useTournament();

  const [mode, setMode] = useState<'auto' | 'partner'>('auto');
  const [partnerCode, setPartnerCode] = useState('');
  const [phase, setPhase] = useState<'entry' | 'queue' | 'bracket' | 'finished'>('entry');
  const [hasReconnected, setHasReconnected] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate a stable partner code for this player (used before connecting)
  const [myCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    let code = sessionStorage.getItem('tournament_my_code');
    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      sessionStorage.setItem('tournament_my_code', code);
    }
    return code;
  });

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // On mount: check if returning from a match (reconnect + report result)
  useEffect(() => {
    if (hasReconnected) return;
    setHasReconnected(true);

    (async () => {
      const success = await reconnect(playerName, avatar);
      if (success) {
        setPhase('bracket');
      }
    })();
  }, []);

  // When tournament state updates, report match result with correct team ID
  useEffect(() => {
    if (!tournamentState || !matchResultParam || !matchIdParam) return;
    const winnerGameTeam = parseInt(matchResultParam);
    const matchId = parseInt(matchIdParam);
    const s0 = parseInt(score0Param || '0');
    const s1 = parseInt(score1Param || '0');

    const match = tournamentState.matches.find(m => m.id === matchId);
    if (match && match.status === 'playing') {
      const winnerTeamId = winnerGameTeam === 0 ? match.team1Id : match.team2Id;
      reportMatchResult(matchId, winnerTeamId, [s0, s1]);
    }
  }, [tournamentState?.matches, matchResultParam, matchIdParam]);

  // Sync tournament phase
  useEffect(() => {
    if (!tournamentState) return;
    if (tournamentState.phase === 'waiting' && connected && phase === 'entry') {
      setPhase('queue');
    }
    if (tournamentState.phase === 'playing' && phase === 'queue') {
      setPhase('bracket');
    }
    if (tournamentState.phase === 'finished') {
      setPhase('finished');
    }
  }, [tournamentState?.phase, connected]);

  // When server says to join a match, navigate to game page
  useEffect(() => {
    if (pendingMatch) {
      clearPendingMatch();
      router.push(
        `/game?roomId=${pendingMatch.roomId}&name=${encodeURIComponent(playerName)}&avatar=${encodeURIComponent(avatar)}&tournament=true&matchId=${pendingMatch.matchId}&position=${pendingMatch.position}`
      );
    }
  }, [pendingMatch]);

  const handleJoinQueue = async () => {
    await joinQueue(playerName, mode, avatar, mode === 'partner' ? partnerCode : undefined, mode === 'partner' ? myCode : undefined);
  };

  const handleBack = () => {
    leaveTournament();
    router.push('/');
  };

  // === ENTRY PHASE ===
  if (phase === 'entry') {
    return (
      <div className="min-h-screen p-4 sm:p-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Torneio</h1>
          <Button variant="secondary" size="sm" onClick={handleBack}>Voltar</Button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-green-200 text-xs sm:text-sm font-bold mb-3">
              Como montar sua dupla?
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('auto')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold cursor-pointer border-2 transition-all ${
                  mode === 'auto'
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-green-800/50 border-green-600/30 text-green-300/60 hover:text-white'
                }`}
              >
                Dupla Automatica
              </button>
              <button
                onClick={() => setMode('partner')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold cursor-pointer border-2 transition-all ${
                  mode === 'partner'
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-green-800/50 border-green-600/30 text-green-300/60 hover:text-white'
                }`}
              >
                Com Parceiro
              </button>
            </div>
          </div>

          {mode === 'auto' && (
            <p className="text-green-300/60 text-sm">
              Voce sera pareado automaticamente com outro jogador para formar uma dupla.
            </p>
          )}

          {mode === 'partner' && (
            <div className="space-y-4">
              {/* My code - prominent display */}
              <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-600/30">
                <p className="text-amber-400 text-xs font-bold mb-2">Seu codigo - envie para seu parceiro:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-green-900/60 px-4 py-3 rounded-lg text-amber-400 text-lg font-mono font-bold text-center tracking-widest">
                    {myCode}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className={`px-4 py-3 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Partner's code input */}
              <div>
                <label className="block text-green-200 text-xs font-bold mb-2">
                  Codigo do parceiro (se voce recebeu um):
                </label>
                <input
                  type="text"
                  placeholder="Cole o codigo aqui..."
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-green-800/50 border border-green-600/50 text-white text-lg font-mono text-center tracking-widest focus:outline-none focus:border-amber-400 placeholder-green-400/50 uppercase"
                />
                <p className="text-green-300/60 text-xs mt-2">
                  Um jogador compartilha seu codigo. O outro cola aqui. Ambos clicam em &quot;Buscar Torneio&quot;.
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button variant="primary" size="lg" className="w-full" onClick={handleJoinQueue}>
            Buscar Torneio
          </Button>
        </div>
      </div>
    );
  }

  // === QUEUE PHASE ===
  if (phase === 'queue' && tournamentState) {
    const myTeam = tournamentState.teams.find(
      t => t.player1Id === sessionId || t.player2Id === sessionId
    );
    const unpairedPlayers = Array.from(tournamentState.players.values()).filter(p => !p.teamId);

    return (
      <div className="min-h-screen p-4 sm:p-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Torneio</h1>
          <Button variant="secondary" size="sm" onClick={handleBack}>Sair</Button>
        </div>

        {/* Waiting animation */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-bounce">🃏</div>
          <p className="text-green-200 text-lg font-bold">Aguardando jogadores...</p>
          <p className="text-amber-400 text-2xl font-black mt-1">
            {tournamentState.playerCount}/8
          </p>
        </div>

        {/* My partner code - always visible when no team */}
        {!myTeam && (
          <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-600/30 mb-4">
            <p className="text-amber-400 text-xs font-bold mb-2">Seu codigo - envie para seu parceiro:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-green-900/60 px-4 py-3 rounded-lg text-amber-400 text-lg font-mono font-bold text-center tracking-widest">
                {myCode}
              </code>
              <button
                onClick={handleCopyCode}
                className={`px-4 py-3 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* My team */}
        {myTeam && (
          <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-600/30 mb-4">
            <p className="text-amber-400 text-xs font-bold mb-1">Sua dupla</p>
            <p className="text-white font-bold">{myTeam.name}</p>
          </div>
        )}

        {/* Teams formed */}
        {tournamentState.teams.length > 0 && (
          <div className="mb-4">
            <p className="text-green-200 text-xs font-bold mb-2">
              Duplas formadas ({tournamentState.teamCount}/4)
            </p>
            <div className="space-y-2">
              {tournamentState.teams.map(team => (
                <div key={team.id} className="bg-green-800/40 rounded-lg px-3 py-2 border border-green-700/30 text-sm text-white">
                  {team.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpaired players */}
        {unpairedPlayers.length > 0 && (
          <div>
            <p className="text-green-200 text-xs font-bold mb-2">Aguardando parceiro</p>
            <div className="flex flex-wrap gap-2">
              {unpairedPlayers.map(p => (
                <span key={p.id} className="bg-green-800/40 rounded-full px-3 py-1 text-xs text-green-300/80 border border-green-700/30">
                  {p.avatar} {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // === BRACKET / FINISHED PHASE ===
  if ((phase === 'bracket' || phase === 'finished') && tournamentState) {
    const semis = tournamentState.matches.filter(m => m.round === 1);
    const final_ = tournamentState.matches.find(m => m.round === 2);

    return (
      <div className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-400">Bracket</h1>
          {phase === 'finished' ? (
            <Button variant="secondary" size="sm" onClick={handleBack}>Voltar ao Menu</Button>
          ) : (
            <span className="text-green-300/60 text-xs animate-pulse">Torneio em andamento...</span>
          )}
        </div>

        {/* Champion */}
        {tournamentState.championTeamName && (
          <div className="text-center mb-6 p-4 bg-amber-900/20 rounded-xl border border-amber-600/30">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-2xl font-black text-amber-400">{tournamentState.championTeamName}</div>
            <div className="text-green-300/60 text-sm">Campeao do Torneio!</div>
          </div>
        )}

        {/* Bracket */}
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          {/* Semis */}
          <div className="flex flex-col gap-8 sm:gap-16">
            {semis.map(match => (
              <MatchCard key={match.id} match={match} />
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
            {final_ && <MatchCard match={final_} isFinal />}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button variant="secondary" size="sm" onClick={handleBack}>Voltar ao Menu</Button>
        </div>
      </div>
    );
  }

  // Loading / connecting
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-amber-400 text-xl mb-4">Conectando ao torneio...</div>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <Button variant="secondary" size="sm" onClick={handleBack}>Voltar</Button>
    </div>
  );
}

interface TournamentMatchDisplay {
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

function MatchCard({ match, isFinal = false }: { match: TournamentMatchDisplay; isFinal?: boolean }) {
  const statusLabel =
    match.status === 'playing' ? 'Em jogo...' :
    match.status === 'done' ? `${match.score1} - ${match.score2}` :
    match.team1Name && match.team2Name ? 'Aguardando' : '';

  return (
    <div className={`bg-green-800/40 rounded-xl p-3 sm:p-4 border min-w-[160px] sm:min-w-[200px] ${
      isFinal ? 'border-amber-400/50' : 'border-green-700/30'
    }`}>
      {isFinal && <div className="text-center text-[10px] text-amber-400 font-bold mb-2 uppercase">Final</div>}

      <div className="space-y-2">
        <TeamRow name={match.team1Name} score={match.score1} isWinner={match.winnerId === match.team1Id && match.status === 'done'} />
        <div className="text-center text-green-500/30 text-xs">vs</div>
        <TeamRow name={match.team2Name} score={match.score2} isWinner={match.winnerId === match.team2Id && match.status === 'done'} />
      </div>

      <div className={`text-center text-[10px] mt-2 font-bold ${
        match.status === 'playing' ? 'text-amber-400 animate-pulse' :
        match.status === 'done' ? 'text-green-400/40' : 'text-green-400/30'
      }`}>
        {statusLabel}
      </div>
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

export default function TorneioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-amber-400">Carregando torneio...</div>}>
      <TorneioContent />
    </Suspense>
  );
}
