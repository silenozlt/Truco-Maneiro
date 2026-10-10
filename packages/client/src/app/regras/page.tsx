'use client';

import { useRouter } from 'next/navigation';
import Button from '../../components/ui/Button';

const MANILHAS = [
  { rank: '4', suit: 'paus', symbol: '\u2663', name: 'Zap', color: 'text-gray-900', strength: 1 },
  { rank: '7', suit: 'copas', symbol: '\u2665', name: 'Copas', color: 'text-red-500', strength: 2 },
  { rank: 'A', suit: 'espadas', symbol: '\u2660', name: 'Espadilha', color: 'text-gray-900', strength: 3 },
  { rank: '7', suit: 'ouros', symbol: '\u2666', name: 'Ouros', color: 'text-red-500', strength: 4 },
];

const CARD_HIERARCHY = [
  '3', '2', 'A', 'K', 'J', 'Q', '7', '6', '5', '4'
];

const TRUCO_LEVELS = [
  { name: 'Truco', points: 4, description: 'Primeiro pedido, vale 4 pontos' },
  { name: 'Seis', points: 6, description: 'Aumenta para 6 pontos' },
  { name: 'Dez', points: 10, description: 'Aumenta para 10 pontos' },
  { name: 'Doze', points: 12, description: 'Valor maximo, vale 12 pontos' },
];

export default function RegrasPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-amber-400">
          Regras do Truco Mineiro
        </h1>
        <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
          Voltar
        </Button>
      </div>

      {/* Sections */}
      <div className="space-y-6 sm:space-y-8">

        {/* Objetivo */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Objetivo
          </h2>
          <p className="text-green-200/80 text-sm sm:text-base leading-relaxed">
            O Truco Mineiro e um jogo de cartas para <strong className="text-white">4 jogadores</strong> divididos em{' '}
            <strong className="text-white">2 duplas</strong>. O objetivo e ser a primeira dupla a atingir{' '}
            <strong className="text-amber-400">12 pontos</strong>.
          </p>
        </section>

        {/* Como funciona */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Como funciona uma mao
          </h2>
          <ul className="text-green-200/80 text-sm sm:text-base space-y-2 list-disc list-inside">
            <li>Cada jogador recebe <strong className="text-white">3 cartas</strong></li>
            <li>A mao e dividida em ate <strong className="text-white">3 rodadas</strong></li>
            <li>Cada rodada, todos jogam 1 carta. A carta mais forte vence a rodada</li>
            <li>A dupla que vencer <strong className="text-white">2 das 3 rodadas</strong> ganha a mao</li>
            <li>Se a 1a rodada empatar, quem vencer a 2a ganha a mao</li>
            <li>Cada mao vale normalmente <strong className="text-amber-400">2 pontos</strong></li>
          </ul>
        </section>

        {/* Hierarquia das cartas */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Hierarquia das cartas (mais forte para mais fraca)
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {CARD_HIERARCHY.map((rank, i) => (
              <div
                key={rank}
                className={`w-10 h-14 sm:w-12 sm:h-16 rounded-lg border-2 bg-white flex items-center justify-center font-bold text-lg sm:text-xl
                  ${i === 0 ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-gray-300'}
                  text-gray-900
                `}
              >
                {rank}
              </div>
            ))}
          </div>
          <p className="text-green-400/60 text-xs sm:text-sm mt-2">
            O 3 e a carta mais forte (excluindo manilhas). O 4 e a mais fraca.
          </p>
        </section>

        {/* Manilhas */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Manilhas (Fixas)
          </h2>
          <p className="text-green-200/80 text-sm sm:text-base mb-3">
            No Truco Mineiro, as manilhas sao <strong className="text-white">fixas</strong> e{' '}
            <strong className="text-white">sempre as mesmas</strong>. Elas vencem qualquer outra carta:
          </p>
          <div className="space-y-2">
            {MANILHAS.map((m, i) => (
              <div
                key={m.name}
                className="flex items-center gap-3 bg-green-800/40 rounded-lg p-2 sm:p-3 border border-green-700/30"
              >
                <div className="w-6 text-center text-amber-400 font-bold text-sm">{i + 1}o</div>
                <div className={`w-10 h-14 sm:w-12 sm:h-16 rounded-lg border-2 border-yellow-400 bg-white flex flex-col items-center justify-center ring-2 ring-yellow-400/30`}>
                  <span className={`font-bold text-sm sm:text-base ${m.color}`}>{m.rank}</span>
                  <span className={`text-xs sm:text-sm ${m.color}`}>{m.symbol}</span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base">{m.name}</div>
                  <div className="text-green-300/60 text-xs">
                    {m.rank}{m.symbol} - {i === 0 ? 'A mais forte do jogo' : `Perde apenas para ${MANILHAS.slice(0, i).map(x => x.name).join(', ')}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Truco */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Truco - Aumentando a aposta
          </h2>
          <p className="text-green-200/80 text-sm sm:text-base mb-3">
            Durante a mao, qualquer jogador pode <strong className="text-white">pedir truco</strong> para aumentar
            o valor da mao. A dupla adversaria pode:
          </p>
          <ul className="text-green-200/80 text-sm sm:text-base space-y-1 list-disc list-inside mb-4">
            <li><strong className="text-emerald-400">Aceitar</strong> - o jogo continua com o novo valor</li>
            <li><strong className="text-red-400">Correr</strong> - desiste da mao (perde os pontos atuais)</li>
            <li><strong className="text-amber-400">Aumentar</strong> - aumenta ainda mais o valor</li>
          </ul>

          <div className="space-y-2">
            {TRUCO_LEVELS.map((level) => (
              <div
                key={level.name}
                className="flex items-center justify-between bg-green-800/40 rounded-lg p-2 sm:p-3 border border-green-700/30"
              >
                <div>
                  <span className="text-red-400 font-bold text-sm sm:text-base">{level.name}</span>
                  <span className="text-green-400/60 text-xs sm:text-sm ml-2">- {level.description}</span>
                </div>
                <span className="text-amber-400 font-black text-lg sm:text-xl">{level.points}pts</span>
              </div>
            ))}
          </div>
        </section>

        {/* Mao de 10 */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Mao de 10
          </h2>
          <p className="text-green-200/80 text-sm sm:text-base leading-relaxed">
            Quando qualquer dupla atinge <strong className="text-amber-400">10 pontos</strong>,
            a mao seguinte vale automaticamente <strong className="text-white">4 pontos</strong> e{' '}
            <strong className="text-red-400">nao e permitido pedir truco</strong>.
            Isso acontece porque o truco comeca em 4 pontos, que ja e o valor da mao de 10.
          </p>
        </section>

        {/* Dicas */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-amber-300 mb-2 border-b border-green-700/50 pb-1">
            Dicas de estrategia
          </h2>
          <div className="space-y-2">
            {[
              { title: 'Blefe', tip: 'Pedir truco com cartas fracas pode fazer o adversario correr. Mas cuidado, se aceitarem voce pode perder mais pontos!' },
              { title: 'Guarde a manilha', tip: 'Se voce tem uma manilha, considere guarda-la para a 2a ou 3a rodada, quando ela tem mais impacto.' },
              { title: 'Comunicacao com parceiro', tip: 'Preste atencao nas cartas que seu parceiro joga. Se ele jogou uma carta forte na 1a rodada, pode estar sinalizando que tem cartas boas.' },
              { title: 'Posicao importa', tip: 'Jogar por ultimo na rodada e uma vantagem - voce pode ver o que todos jogaram antes de decidir qual carta usar.' },
            ].map((dica) => (
              <div key={dica.title} className="bg-amber-900/20 rounded-lg p-2 sm:p-3 border border-amber-700/20">
                <div className="text-amber-400 font-bold text-sm mb-0.5">{dica.title}</div>
                <div className="text-green-200/70 text-xs sm:text-sm">{dica.tip}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom button */}
      <div className="mt-8 sm:mt-10 text-center pb-8">
        <Button variant="primary" size="lg" onClick={() => router.push('/')}>
          Jogar agora!
        </Button>
      </div>
    </div>
  );
}
