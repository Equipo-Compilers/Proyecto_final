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

import {
  benchmarkNetwork,
  runBenchmark,
  type BenchmarkRow,
} from "../../core/benchmark/benchmark";
import { countComponents } from "../../core/utils/graph";
import { useNetworkStore } from "../../store/networkStore";

const SIZE_OPTIONS = [25, 50, 100, 200, 400];
const REPETITION_OPTIONS = [5, 10, 20];

const formatMs = (ms: number) => (ms < 0.01 ? "<0.01" : ms.toFixed(3));

interface SizeRow {
  switches: number;
  links: number;
  primMs: number;
  kruskalMs: number;
  primCost: number;
  kruskalCost: number;
}

function pivot(rows: BenchmarkRow[]): SizeRow[] {
  const bySize = new Map<number, SizeRow>();
  for (const row of rows) {
    const entry =
      bySize.get(row.switches) ??
      {
        switches: row.switches,
        links: row.links,
        primMs: 0,
        kruskalMs: 0,
        primCost: 0,
        kruskalCost: 0,
      };
    if (row.algorithmId === "prim") {
      entry.primMs = row.averageMs;
      entry.primCost = row.totalCost;
    } else {
      entry.kruskalMs = row.averageMs;
      entry.kruskalCost = row.totalCost;
    }
    bySize.set(row.switches, entry);
  }
  return [...bySize.values()].sort((a, b) => a.switches - b.switches);
}

export function ComparisonPanel() {
  const network = useNetworkStore((s) => s.network);
  const startNodeId = useNetworkStore((s) => s.startNodeId);

  const [repetitions, setRepetitions] = useState(10);
  const [sizes, setSizes] = useState<number[]>([25, 50, 100]);
  const [networkRows, setNetworkRows] = useState<BenchmarkRow[] | null>(null);
  const [sizeRows, setSizeRows] = useState<SizeRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisconnected = useMemo(() => countComponents(network) > 1, [network]);

  const onRepetitions = (e: ChangeEvent<HTMLSelectElement>) => {
    setRepetitions(Number(e.target.value));
  };

  const toggleSize = (size: number) => {
    setSizes((current) =>
      current.includes(size) ? current.filter((s) => s !== size) : [...current, size]
    );
  };

  const compareCurrent = () => {
    setError(null);
    try {
      setNetworkRows(
        benchmarkNetwork(
          network,
          repetitions,
          undefined,
          undefined,
          startNodeId ?? undefined
        )
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
        setSizeRows(pivot(runBenchmark({ sizes: [...sizes].sort((a, b) => a - b), repetitions })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo ejecutar la comparación.");
      } finally {
        setRunning(false);
      }
    }, 30);
  };

  const cellClass = "px-2 py-1 text-right";

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Comparación Prim vs Kruskal</h2>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-slate-300" htmlFor="repetitions-select">
          Muestras por medición
        </label>
        <select
          id="repetitions-select"
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
      <button
        type="button"
        onClick={compareCurrent}
        disabled={network.devices.length === 0}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Comparar en la red actual
      </button>

      {networkRows && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left">Algoritmo</th>
                <th className={cellClass}>Costo total</th>
                <th className={cellClass}>Enlaces</th>
                <th className={cellClass}>Tiempo (ms)</th>
              </tr>
            </thead>
            <tbody>
              {networkRows.map((row) => (
                <tr key={row.algorithmId} className="border-t border-slate-700">
                  <td className="px-2 py-1 font-medium text-white">{row.algorithmName}</td>
                  <td className={cellClass}>{row.totalCost}</td>
                  <td className={cellClass}>{row.selectedLinks}</td>
                  <td className={cellClass}>{formatMs(row.averageMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isDisconnected && (
            <p className="mt-2 text-xs text-amber-300">
              La red está desconectada: Prim solo cubre el grupo de su switch inicial, por eso su
              costo puede ser menor que el de Kruskal.
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
            {size} switches
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={compareSizes}
        disabled={running}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
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
                  <th className={cellClass}>Switches</th>
                  <th className={cellClass}>Enlaces</th>
                  <th className={cellClass}>Prim (ms)</th>
                  <th className={cellClass}>Kruskal (ms)</th>
                  <th className={cellClass}>Costo Prim</th>
                  <th className={cellClass}>Costo Kruskal</th>
                  <th className={cellClass}>¿Coinciden?</th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map((row) => (
                  <tr key={row.switches} className="border-t border-slate-700">
                    <td className={cellClass}>{row.switches}</td>
                    <td className={cellClass}>{row.links}</td>
                    <td className={cellClass}>{formatMs(row.primMs)}</td>
                    <td className={cellClass}>{formatMs(row.kruskalMs)}</td>
                    <td className={cellClass}>{row.primCost}</td>
                    <td className={cellClass}>{row.kruskalCost}</td>
                    <td
                      className={`${cellClass} ${
                        row.primCost === row.kruskalCost ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {row.primCost === row.kruskalCost ? "Sí" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sizeRows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="switches"
                  stroke="#94a3b8"
                  label={{ value: "Switches", position: "insideBottom", offset: -4, fill: "#94a3b8" }}
                />
                <YAxis stroke="#94a3b8" unit=" ms" />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                  formatter={(value: unknown) => `${Number(value).toFixed(3)} ms`}
                />
                <Legend />
                <Line type="monotone" dataKey="primMs" name="Prim" stroke="#22d3ee" strokeWidth={2} />
                <Line type="monotone" dataKey="kruskalMs" name="Kruskal" stroke="#fbbf24" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
