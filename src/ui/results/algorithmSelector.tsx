import type { ChangeEvent } from "react";
import { ALGORITHM_LIST, ALGORITHMS } from "../../core/algorithms/registry";
import type { AlgorithmId } from "../../core/model/algorithmResult";
import { useNetworkStore } from "../../store/networkStore";

export function AlgorithmSelector() {
  const devices = useNetworkStore((s) => s.network.devices);
  const selectedId = useNetworkStore((s) => s.selectedAlgorithmId);
  const startNodeId = useNetworkStore((s) => s.startNodeId);
  const hasResult = useNetworkStore((s) => s.result !== null);
  const lastError = useNetworkStore((s) => s.lastError);

  const selectAlgorithm = useNetworkStore((s) => s.selectAlgorithm);
  const setStartNode = useNetworkStore((s) => s.setStartNode);
  const run = useNetworkStore((s) => s.runSelectedAlgorithm);
  const clearResult = useNetworkStore((s) => s.clearResult);

  const selected = ALGORITHMS[selectedId];
  const isEmpty = devices.length === 0;

  const onAlgorithmChange = (e: ChangeEvent<HTMLSelectElement>) => {
    selectAlgorithm(e.target.value as AlgorithmId);
  };

  const onStartNodeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setStartNode(e.target.value === "" ? null : e.target.value);
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Algoritmo</h2>

      <label className="mb-1 block text-sm text-slate-300" htmlFor="algorithm-select">
        Elige un algoritmo
      </label>
      <select
        id="algorithm-select"
        value={selectedId}
        onChange={onAlgorithmChange}
        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
      >
        {ALGORITHM_LIST.map((algorithm) => (
          <option key={algorithm.id} value={algorithm.id}>
            {algorithm.name}
          </option>
        ))}
      </select>

      <p className="mt-2 text-sm text-slate-400">{selected.description}</p>
      <p className="mt-1 text-xs text-slate-500">
        Complejidad teórica: {selected.complexity}
      </p>

      {selected.needsStartNode && (
        <div className="mt-3">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="start-node-select">
            Switch inicial
          </label>
          <select
            id="start-node-select"
            value={startNodeId ?? ""}
            onChange={onStartNodeChange}
            disabled={isEmpty}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">Automático (el primero)</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={isEmpty}
          className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-900 transition hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ejecutar {selected.name}
        </button>
        {hasResult && (
          <button
            type="button"
            onClick={clearResult}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            Limpiar
          </button>
        )}
      </div>

      {isEmpty && (
        <p className="mt-3 text-sm text-amber-300">
          Agrega al menos un switch (o carga una red de ejemplo) para poder ejecutar.
        </p>
      )}
      {lastError && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-300">
          {lastError}
        </p>
      )}
    </section>
  );
}
