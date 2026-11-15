import { useState } from 'react'

function App() {
  const [contador, setContador] = useState(0)

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-cyan-400">
          Simulador de redes
        </h1>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
            <h2 className="font-semibold text-emerald-400">Prim</h2>
            <p className="text-sm text-slate-400">Árbol de expansión mínima</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
            <h2 className="font-semibold text-amber-400">Kruskal</h2>
            <p className="text-sm text-slate-400">Con Union-Find</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
            <h2 className="font-semibold text-rose-400">Dijkstra</h2>
            <p className="text-sm text-slate-400">Rutas más cortas</p>
          </div>
        </div>

        <button
          onClick={() => setContador(contador + 1)}
          className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-900 transition hover:bg-cyan-400 active:scale-95"
        >
          Clics: {contador}
        </button>
      </div>
    </div>
  )
}

export default App