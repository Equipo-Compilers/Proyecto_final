import type { ChangeEvent } from "react";
import { getExamplesForMode } from "../../data/examples";
import { useNetworkStore } from "../../store/networkStore";

interface EditorToolbarProps {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  onDeleteSelected: () => void;
}

export function EditorToolbar({
  selectedNodeIds,
  selectedEdgeIds,
  onDeleteSelected,
}: EditorToolbarProps) {
  const addDevice = useNetworkStore((s) => s.addDevice);
  const clearNetwork = useNetworkStore((s) => s.clearNetwork);
  const setNetwork = useNetworkStore((s) => s.setNetwork);
  const mode = useNetworkStore((s) => s.analysisMode);
  const lastError = useNetworkStore((s) => s.lastError);
  const clearError = useNetworkStore((s) => s.clearError);

  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;

  const handleAddSwitch = () => {
    clearError();
    addDevice({ kind: "switch" });
  };

  const handleAddRouter = () => {
    clearError();
    addDevice({ kind: "router" });
  };

  const examples = getExamplesForMode(mode);

  const handleExampleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const example = examples.find((item) => item.id === e.target.value);
    if (example) {
      setNetwork(example.network);
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-t-2xl border-b border-slate-700 bg-slate-900/95 p-3 sm:gap-3 sm:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleAddSwitch}
            className="rounded-lg bg-cyan-500 px-2.5 py-2 text-xs font-semibold text-slate-950 shadow transition hover:bg-cyan-400 active:scale-95 sm:px-3.5 sm:text-sm"
          >
            + Switch
          </button>

          <button
            type="button"
            onClick={handleAddRouter}
            className="rounded-lg bg-violet-500 px-2.5 py-2 text-xs font-semibold text-slate-950 shadow transition hover:bg-violet-400 active:scale-95 sm:px-3.5 sm:text-sm"
          >
            + Router
          </button>

          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            className="rounded-lg border border-rose-700/80 bg-rose-950/60 px-2.5 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-900/70 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3.5 sm:text-sm"
          >
            Eliminar
          </button>

          <button
            type="button"
            onClick={clearNetwork}
            className="rounded-lg border border-slate-600 px-2.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 active:scale-95 sm:px-3.5 sm:text-sm"
          >
            Limpiar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="canvas-example-select"
            className="shrink-0 text-xs text-slate-400"
          >
            Ejemplo:
          </label>
          <select
            id="canvas-example-select"
            defaultValue=""
            onChange={handleExampleChange}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none sm:w-auto sm:text-sm"
          >
            <option value="" disabled>
              Seleccionar topología…
            </option>
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 sm:text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded bg-slate-500 sm:h-2.5 sm:w-5" />
            Sin evaluar
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="inline-block h-2 w-4 rounded bg-emerald-500 sm:h-2.5 sm:w-5" />
            {mode === "layer3" ? "Árbol de rutas" : "Activo (MST)"}
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="inline-block h-2 w-4 rounded border border-dashed border-rose-500 bg-rose-950 sm:h-2.5 sm:w-5" />
            Descartado
          </span>
          {mode === "layer3" && (
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="inline-block h-2 w-4 rounded bg-amber-500 sm:h-2.5 sm:w-5" />
              Camino elegido
            </span>
          )}
        </div>

        <span className="hidden md:inline">
          Arrastra de un punto a otro para conectar · Clic en el número para editar costo
        </span>
      </div>

      {lastError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-rose-700 bg-rose-950/80 px-3 py-2 text-xs text-rose-200"
        >
          <span>{lastError}</span>
          <button
            type="button"
            onClick={clearError}
            className="ml-3 font-bold text-rose-300 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}