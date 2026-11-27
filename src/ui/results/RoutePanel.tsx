import { useMemo, type ChangeEvent } from "react";

import { networkForLayer } from "../../core/utils/layers";
import { getRoutePath } from "../../core/utils/routing";
import { useNetworkStore } from "../../store/networkStore";

export function RoutePanel() {
  const network = useNetworkStore((s) => s.network);
  const result = useNetworkStore((s) => s.result);
  const startNodeId = useNetworkStore((s) => s.startNodeId);
  const destinationId = useNetworkStore((s) => s.destinationId);
  const setStartNode = useNetworkStore((s) => s.setStartNode);
  const setDestination = useNetworkStore((s) => s.setDestination);
  const run = useNetworkStore((s) => s.runSelectedAlgorithm);

  const routers = useMemo(() => networkForLayer(network, "layer3").devices, [network]);
  const labelOf = useMemo(() => new Map(routers.map((d) => [d.id, d.label])), [routers]);
  const route = useMemo(
    () => getRoutePath(network, result, destinationId),
    [network, result, destinationId]
  );

  const sourceId = result?.routing?.sourceId ?? startNodeId ?? routers[0]?.id ?? "";
  const name = (id: string) => labelOf.get(id) ?? id;
  const validDestination = destinationId !== null && labelOf.has(destinationId);

  const onSourceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setStartNode(e.target.value === "" ? null : e.target.value);
    run();
  };
  const onDestinationChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDestination(e.target.value === "" ? null : e.target.value);
  };

  const selectClass =
    "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none disabled:opacity-50";

  let body = null;
  if (routers.length === 0) {
    body = <p className="text-sm text-slate-400">Agrega routers para trazar un camino.</p>;
  } else if (!result?.routing) {
    body = (
      <p className="text-sm text-slate-400">
        Ejecuta el algoritmo para poder ver el camino hasta el destino.
      </p>
    );
  } else if (!validDestination) {
    body = <p className="text-sm text-slate-400">Elige un destino para ver el camino.</p>;
  } else if (route === null) {
    body = (
      <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-300">
        No hay camino de {name(sourceId)} a {name(destinationId)}: están en grupos de routers
        aislados.
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-emerald-400">
            {route.deviceIds.map(name).join(" → ")}
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Costo total <span className="font-semibold text-white">{route.totalCost}</span> ·{" "}
          {route.hops.length} {route.hops.length === 1 ? "salto" : "saltos"}
          {route.hops.length === 0 && " (el origen es el destino)"}
        </p>
        {route.hops.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {route.hops.map((hop) => (
              <li key={hop.linkId}>
                {name(hop.from)} → {name(hop.to)}{" "}
                <span className="text-slate-500">(costo {hop.cost})</span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Camino origen → destino</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300" htmlFor="route-source">
            Origen
          </label>
          <select
            id="route-source"
            value={startNodeId ?? ""}
            onChange={onSourceChange}
            disabled={routers.length === 0}
            className={selectClass}
          >
            <option value="">Automático ({routers[0]?.label ?? "—"})</option>
            {routers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300" htmlFor="route-destination">
            Destino
          </label>
          <select
            id="route-destination"
            value={validDestination ? destinationId : ""}
            onChange={onDestinationChange}
            disabled={routers.length === 0}
            className={selectClass}
          >
            <option value="">Elegir…</option>
            {routers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">{body}</div>
    </section>
  );
}
