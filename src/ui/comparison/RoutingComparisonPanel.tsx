import { useMemo, useState, type ChangeEvent } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAlgorithmsForMode } from "../../core/algorithms/registry";
import {
  benchmarkNetwork,
  runBenchmark,
  type BenchmarkRow,
} from "../../core/benchmark/benchmark";
import { networkForLayer } from "../../core/utils/layers";
import { useNetworkStore } from "../../store/networkStore";

const SIZE_OPTIONS = [25, 50, 100, 200, 400];
const REPETITION_OPTIONS = [5, 10, 20];
const LAYER3_IDS = getAlgorithmsForMode("layer3").map((a) => a.id);

const formatMs = (ms: number) => (ms < 0.01 ? "<0.01" : ms.toFixed(3));

interface SizeRow {
  routers: number;
  links: number;
  dijkstraMs: number;
  bellmanFordMs: number;
  dijkstraSum: number;
  bellmanFordSum: number;
}

function pivot(rows: BenchmarkRow[]): SizeRow[] {
  const bySize = new Map<number, SizeRow>();
  for (const row of rows) {
    const entry =
      bySize.get(row.switches) ??
      { routers: row.switches, links: row.links, dijkstraMs: 0, bellmanFordMs: 0, dijkstraSum: 0, bellmanFordSum: 0 };
    if (row.algorithmId === "dijkstra") {
      entry.dijkstraMs = row.averageMs;
      entry.dijkstraSum = row.distanceSum ?? 0;
    } else if (row.algorithmId === "bellmanFord") {
      entry.bellmanFordMs = row.averageMs;
      entry.bellmanFordSum = row.distanceSum ?? 0;
    }
    bySize.set(row.switches, entry);
  }
  return [...bySize.values()].sort((a, b) => a.routers - b.routers);
}

export function RoutingComparisonPanel() {
  const network = useNetworkStore((s) => s.network);
  const startNodeId = useNetworkStore((s) => s.startNodeId);

  const [repetitions, setRepetitions] = useState(10);
  const [sizes, setSizes] = useState<number[]>([25, 50, 100]);
  const [networkRows, setNetworkRows] = useState<BenchmarkRow[] | null>(null);
  const [sizeRows, setSizeRows] = useState<SizeRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routers = useMemo(() => networkForLayer(network, "layer3"), [network]);

  const onRepetitions = (e: ChangeEvent<HTMLSelectElement>) => setRepetitions(Number(e.target.value));
  const toggleSize = (size: number) =>
    setSizes((c) => (c.includes(size) ? c.filter((s) => s !== size) : [...c, size]));

  const compareCurrent = () => {
    setError(null);
    try {
      setNetworkRows(
        benchmarkNetwork(network, repetitions, LAYER3_IDS, undefined, startNodeId ?? undefined)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo comparar la red actual.");
    }
  };

  const compareSizes = () => {
    if (sizes.length === 0) {
      setError("Elige al menos un tamaño de red.");
      return;
    }
    setError(null);
    setRunning(true);
    setTimeout(() => {
      try {
        setSizeRows(
          pivot(
            runBenchmark({
              sizes: [...sizes].sort((a, b) => a - b),
              repetitions,
              algorithms: LAYER3_IDS,
              kind: "router",
            })
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo ejecutar la comparación.");
      } finally {
        setRunning(false);
      }
    }, 30);
  };

  const cellClass = "px-2 py-1 text-right";
  const primary =
    "rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Comparación Dijkstra vs Bellman-Ford</h2>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-slate-300" htmlFor="routing-repetitions">
          Muestras por medición
        </label>
        <select
          id="routing-repetitions"
          value={repetitions}
          onChange={onRepetitions}
          className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
        >
          {REPETITION_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-200">Sobre la red actual</h3>
      <button type="button" onClick={compareCurrent} disabled={routers.devices.length === 0} className={primary}>
        Comparar en la red actual
      </button>

      {networkRows && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left">Algoritmo</th>
                <th className={cellClass}>Suma de distancias</th>
                <th className={cellClass}>Enlaces del árbol</th>
                <th className={cellClass}>Tiempo (ms)</th>
              </tr>
            </thead>
            <tbody>
              {networkRows.map((row) => (
                <tr key={row.algorithmId} className="border-t border-slate-700">
                  <td className="px-2 py-1 font-medium text-white">{row.algorithmName}</td>
                  <td className={cellClass}>{row.distanceSum ?? "—"}</td>
                  <td className={cellClass}>{row.selectedLinks}</td>
                  <td className={cellClass}>{formatMs(row.averageMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {networkRows.length === 2 && networkRows[0].distanceSum !== networkRows[1].distanceSum && (
            <p role="alert" className="mt-2 text-xs text-rose-300">
              Las distancias no coinciden entre los dos algoritmos: hay un error.
            </p>
          )}
        </div>
      )}

      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-200">
        Redes aleatorias de distintos tamaños
      </h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {SIZE_OPTIONS.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={sizes.includes(size)}
            onClick={() => toggleSize(size)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              sizes.includes(size)
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                : "border-slate-600 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {size} routers
          </button>
        ))}
      </div>
      <button type="button" onClick={compareSizes} disabled={running} className={primary}>
        {running ? "Ejecutando…" : "Ejecutar comparación"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {sizeRows && sizeRows.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className={cellClass}>Routers</th>
                  <th className={cellClass}>Enlaces</th>
                  <th className={cellClass}>Dijkstra (ms)</th>
                  <th className={cellClass}>Bellman-Ford (ms)</th>
                  <th className={cellClass}>¿Mismas distancias?</th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map((row) => {
                  const same = row.dijkstraSum === row.bellmanFordSum;
                  return (
                    <tr key={row.routers} className="border-t border-slate-700">
                      <td className={cellClass}>{row.routers}</td>
                      <td className={cellClass}>{row.links}</td>
                      <td className={cellClass}>{formatMs(row.dijkstraMs)}</td>
                      <td className={cellClass}>{formatMs(row.bellmanFordMs)}</td>
                      <td className={`${cellClass} ${same ? "text-emerald-400" : "text-rose-400"}`}>
                        {same ? "Sí" : "No"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sizeRows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="routers"
                  stroke="#94a3b8"
                  label={{ value: "Routers", position: "insideBottom", offset: -4, fill: "#94a3b8" }}
                />
                <YAxis stroke="#94a3b8" unit=" ms" />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                  formatter={(value: unknown) => `${Number(value).toFixed(3)} ms`}
                />
                <Legend />
                <Line type="monotone" dataKey="dijkstraMs" name="Dijkstra" stroke="#22d3ee" strokeWidth={2} />
                <Line type="monotone" dataKey="bellmanFordMs" name="Bellman-Ford" stroke="#fbbf24" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
