import { useMemo, type ChangeEvent } from "react";

import { ALGORITHMS } from "../../core/algorithms/registry";
import { networkForLayer } from "../../core/utils/layers";
import { buildRoutingTable, routingEngineFor } from "../../core/utils/routingTables";
import { useNetworkStore } from "../../store/networkStore";

export function RoutingTablePanel() {
  const network = useNetworkStore((s) => s.network);
  const algorithmId = useNetworkStore((s) => s.selectedAlgorithmId);
  const selectedRouterId = useNetworkStore((s) => s.selectedRouterId);
  const destinationId = useNetworkStore((s) => s.destinationId);
  const selectRouter = useNetworkStore((s) => s.selectRouter);

  const routers = useMemo(() => networkForLayer(network, "layer3").devices, [network]);
  const labelOf = useMemo(() => new Map(routers.map((d) => [d.id, d.label])), [routers]);
  const linkById = useMemo(() => new Map(network.links.map((l) => [l.id, l])), [network.links]);

  const routerId =
    selectedRouterId !== null && labelOf.has(selectedRouterId)
      ? selectedRouterId
      : routers[0]?.id ?? null;
  const engine = routingEngineFor(algorithmId);

  const computed = useMemo(() => {
    if (routerId === null) return { table: [], error: null as string | null };
    try {
      return { table: buildRoutingTable(network, routerId, engine), error: null as string | null };
    } catch (error) {
      return {
        table: [],
        error: error instanceof Error ? error.message : "No se pudo calcular la tabla",
      };
    }
  }, [network, routerId, engine]);

  const name = (id: string) => labelOf.get(id) ?? id;
  const onChange = (e: ChangeEvent<HTMLSelectElement>) => selectRouter(e.target.value);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-1 text-lg font-semibold text-cyan-400">Tabla de enrutamiento</h2>
      <p className="mb-3 text-xs text-slate-500">
        Calculada con {ALGORITHMS[engine].name}. Haz clic en un router del lienzo o elígelo aquí.
      </p>

      {routers.length === 0 ? (
        <p className="text-sm text-slate-400">Agrega routers para ver sus tablas.</p>
      ) : (
        <>
          <label className="mb-1 block text-sm text-slate-300" htmlFor="table-router">
            Router
          </label>
          <select
            id="table-router"
            value={routerId ?? ""}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
          >
            {routers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          {computed.error ? (
            <p role="alert" className="mt-3 rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-300">
              {computed.error}
            </p>
          ) : (
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="w-full text-sm text-slate-300">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-1 text-left">Destino</th>
                    <th className="px-2 py-1 text-left">Siguiente salto</th>
                    <th className="px-2 py-1 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.table.map((entry) => {
                    const link = entry.viaLinkId ? linkById.get(entry.viaLinkId) : undefined;
                    const highlighted = entry.destinationId === destinationId;
                    return (
                      <tr
                        key={entry.destinationId}
                        className={`border-t border-slate-700 ${highlighted ? "bg-slate-900" : ""}`}
                      >
                        <td className="px-2 py-1 font-medium text-white">
                          {name(entry.destinationId)}
                        </td>
                        <td className="px-2 py-1">
                          {entry.cost === null ? (
                            <span className="text-rose-400">Inalcanzable</span>
                          ) : entry.nextHopId === null ? (
                            <span className="text-slate-500">local</span>
                          ) : (
                            <>
                              {name(entry.nextHopId)}
                              {link && <span className="text-slate-500"> (enlace {link.id})</span>}
                            </>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {entry.cost === null ? "∞" : entry.cost}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
