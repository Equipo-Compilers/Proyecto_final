import type { AnalysisMode } from "../../core/model/algorithmResult";
import { MODE_LABELS } from "../../core/utils/layers";
import { useNetworkStore } from "../../store/networkStore";

const MODES: { id: AnalysisMode; hint: string }[] = [
  { id: "layer2", hint: "Switches y árbol de expansión mínima (Prim, Kruskal)" },
  { id: "layer3", hint: "Routers y rutas más cortas (Dijkstra)" },
];

export function ModeSelector() {
  const mode = useNetworkStore((s) => s.analysisMode);
  const setMode = useNetworkStore((s) => s.setAnalysisMode);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Modo de análisis</h2>
      <div role="group" aria-label="Modo de análisis" className="grid grid-cols-2 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              mode === m.id
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <span className="block font-medium">{MODE_LABELS[m.id]}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {MODES.find((m) => m.id === mode)?.hint}
      </p>
    </section>
  );
}
