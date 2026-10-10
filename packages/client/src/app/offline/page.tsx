'use client';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="text-6xl mb-6">🃏</div>
      <h1 className="text-3xl font-black text-amber-400 mb-4">Sem Conexao</h1>
      <p className="text-green-200/80 mb-8 max-w-sm">
        Voce esta offline. Verifique sua conexao com a internet e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
