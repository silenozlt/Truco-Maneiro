'use client';

interface RoundResult {
  winner: number;
  roundNum: number;
}

interface ScoreBoardProps {
  scores: [number, number];
  teamNames?: [string, string];
  currentHandPoints: number;
  trucoLevel: number;
  roundResults?: RoundResult[];
  currentRound?: number;
  myTeam?: number;
}

export default function ScoreBoard({
  scores,
  teamNames = ['Nos', 'Eles'],
  currentHandPoints,
  trucoLevel,
  roundResults = [],
  currentRound = 0,
  myTeam = 0,
}: ScoreBoardProps) {
  return (
    <div className="bg-green-800/60 rounded-xl p-2 sm:p-4 border border-green-600/30 min-w-[140px] sm:min-w-[200px]">
      <h3 className="text-center text-amber-400 font-bold text-[10px] sm:text-sm mb-1.5 sm:mb-3 uppercase tracking-wider">
        Placar
      </h3>

      <div className="flex justify-between items-center gap-3 sm:gap-6">
        {/* Team 0 */}
        <div className="text-center flex-1">
          <div className="text-blue-400 text-[10px] sm:text-xs font-bold mb-0.5 sm:mb-1">{teamNames[0]}</div>
          <div className="text-2xl sm:text-3xl font-black text-white">{scores[0]}</div>
        </div>

        <div className="text-green-500/40 text-base sm:text-xl font-bold">x</div>

        {/* Team 1 */}
        <div className="text-center flex-1">
          <div className="text-red-400 text-[10px] sm:text-xs font-bold mb-0.5 sm:mb-1">{teamNames[1]}</div>
          <div className="text-2xl sm:text-3xl font-black text-white">{scores[1]}</div>
        </div>
      </div>

      {/* Round indicators - table format */}
      <div className="mt-2 sm:mt-3 border-t border-green-600/30 pt-1.5 sm:pt-2">
        <table className="w-full text-center text-[10px] sm:text-xs">
          <thead>
            <tr>
              <th className="text-green-400/40 font-normal pb-1"></th>
              <th className="text-blue-400 font-bold pb-1">Nos</th>
              <th className="text-red-400 font-bold pb-1">Eles</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((roundIdx) => {
              const result = roundResults.find(r => r.roundNum === roundIdx);
              const isCurrent = roundIdx === currentRound && !result;
              const won = result && result.winner === myTeam;
              const lost = result && result.winner !== -1 && result.winner !== myTeam;
              const tied = result && result.winner === -1;

              return (
                <tr key={roundIdx} className={isCurrent ? 'text-amber-400' : ''}>
                  <td className={`py-0.5 font-medium ${isCurrent ? 'text-amber-400' : 'text-green-400/40'}`}>
                    {roundIdx + 1}a
                  </td>
                  <td className="py-0.5">
                    {won ? <span className="text-blue-300 font-bold">✔</span>
                      : tied ? <span className="text-gray-400">—</span>
                      : result ? ''
                      : isCurrent ? <span className="text-amber-300/40">·</span>
                      : ''}
                  </td>
                  <td className="py-0.5">
                    {lost ? <span className="text-red-300 font-bold">✔</span>
                      : tied ? <span className="text-gray-400">—</span>
                      : result ? ''
                      : isCurrent ? <span className="text-amber-300/40">·</span>
                      : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Current hand value */}
      <div className="mt-2 sm:mt-3 text-center">
        <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${trucoLevel >= 4 ? 'text-red-400 bg-red-900/30' : 'text-amber-400 bg-amber-900/30'}`}>
          Valendo {currentHandPoints} pts
        </span>
      </div>
    </div>
  );
}
