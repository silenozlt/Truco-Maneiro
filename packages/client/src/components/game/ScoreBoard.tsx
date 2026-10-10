'use client';

interface ScoreBoardProps {
  scores: [number, number];
  teamNames?: [string, string];
  currentHandPoints: number;
  trucoLevel: number;
}

export default function ScoreBoard({
  scores,
  teamNames = ['Nos', 'Eles'],
  currentHandPoints,
  trucoLevel,
}: ScoreBoardProps) {
  return (
    <div className="bg-green-800/60 rounded-xl p-4 border border-green-600/30 min-w-[200px]">
      <h3 className="text-center text-amber-400 font-bold text-sm mb-3 uppercase tracking-wider">
        Placar
      </h3>

      <div className="flex justify-between items-center gap-6">
        {/* Team 0 */}
        <div className="text-center flex-1">
          <div className="text-blue-400 text-xs font-bold mb-1">{teamNames[0]}</div>
          <div className="text-3xl font-black text-white">{scores[0]}</div>
        </div>

        <div className="text-green-500/40 text-xl font-bold">x</div>

        {/* Team 1 */}
        <div className="text-center flex-1">
          <div className="text-red-400 text-xs font-bold mb-1">{teamNames[1]}</div>
          <div className="text-3xl font-black text-white">{scores[1]}</div>
        </div>
      </div>

      {/* Current hand value */}
      <div className="mt-3 text-center">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${trucoLevel >= 4 ? 'text-red-400 bg-red-900/30' : 'text-amber-400 bg-amber-900/30'}`}>
          Valendo {currentHandPoints} pontos
        </span>
      </div>
    </div>
  );
}
