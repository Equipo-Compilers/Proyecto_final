import { useMemo, type ReactNode } from "react";

import { ALGORITHMS } from "../../core/algorithms/registry";
import type { AlgorithmResult } from "../../core/model/algorithmResult";
import type { Link, Network } from "../../core/model/network";
import { networkForLayer } from "../../core/utils/layers";
import { pathTo } from "../../core/utils/routing";
import { validateResult, validateRouting } from "../../core/validation/validator";
import { useNetworkStore } from "../../store/networkStore";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-900 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={ok ? "text-emerald-400" : "text-rose-400"}>
      {ok ? "✓" : "✗"} {text}
    </li>
  );
}

interface BodyProps {
  network: Network;
  result: AlgorithmResult;
  stepIndex: number | null;
  labelOf: Map<string, string>;
  linkById: Map<string, Link>;
}

function StepNote({ result, stepIndex }: { result: AlgorithmResult; stepIndex: number | null }) {
  const step = stepIndex !== null && stepIndex >= 0 ? result.steps[stepIndex] : undefined;
  if (!step) return null;
  return (
    <div className="mt-4 rounded-lg border border-cyan-500/40 bg-slate-900 p-3 text-sm text-slate-200">
      <span className="font-semibold text-cyan-300">
        Paso {stepIndex === null ? 0 : stepIndex + 1} de {result.steps.length}:
      </span>{" "}
      {step.explanation}
    </div>
  );
}

function SpanningBody({ network, result, stepIndex, labelOf, linkById }: BodyProps) {
  const report = useMemo(() => validateResult(network, result), [network, result]);

  const describe = (linkId: string): string => {
    const link = linkById.get(linkId);
    if (!link) return linkId;
    const a = labelOf.get(link.source) ?? link.source;
    const b = labelOf.get(link.target) ?? link.target;
    return `${a} – ${b}  (costo ${link.cost})`;
  };

  return (
    <>
      {!result.isConnected && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-500/50 bg-amber-950 p-3 text-sm text-amber-200"
        >
          <strong>La red no está conectada:</strong> hay {result.componentCount} grupos de
          switches aislados entre sí.{" "}
          {result.algorithmId === "kruskal"
            ? "Kruskal devuelve un bosque de expansión (un árbol por cada grupo), no un único árbol."
            : `Prim solo recorre el grupo del switch inicial (${
                labelOf.get(result.startNodeId ?? "") ?? "el primero"
              }); los demás switches quedan sin cubrir.`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Costo total" value={String(result.totalCost)} />
        <Stat
          label="Enlaces elegidos"
          value={`${result.selectedLinkIds.length} de ${network.links.length}`}
        />
        <Stat label="Descartados" value={String(result.discardedLinkIds.length)} />
        <Stat label="Grupos de la red" value={String(result.componentCount)} />
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        <Check ok={!report.hasCycles} text="Sin ciclos" />
        <Check
          ok={report.edgeCountOk}
          text={`Cantidad de enlaces correcta (${report.actualEdges} de ${report.expectedEdges} esperados)`}
        />
        <Check
          ok={report.coversNetwork}
          text={
            result.isConnected
              ? "Todos los switches quedan conectados"
              : "Cubre todos los grupos de la red"
          }
        />
      </ul>

      <StepNote result={result} stepIndex={stepIndex} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-emerald-400">
            Seleccionados ({result.selectedLinkIds.length})
          </h3>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm text-slate-300">
            {result.selectedLinkIds.map((id) => (
              <li key={id}>{describe(id)}</li>
            ))}
            {result.selectedLinkIds.length === 0 && <li className="text-slate-500">Ninguno</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-rose-400">
            Descartados ({result.discardedLinkIds.length})
          </h3>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm text-slate-300">
            {result.discardedLinkIds.map((id) => (
              <li key={id}>{describe(id)}</li>
            ))}
            {result.discardedLinkIds.length === 0 && <li className="text-slate-500">Ninguno</li>}
          </ul>
        </div>
      </div>
    </>
  );
}

function RoutingBody({ network, result, stepIndex, labelOf }: BodyProps) {
  const routing = result.routing;
  const problems = useMemo(() => validateRouting(network, result), [network, result]);
  const report = useMemo(() => validateResult(network, result), [network, result]);

  if (!routing) return null;

  const rows = network.devices.map((device) => {
    const distance = routing.distances[device.id] ?? null;
    const path = pathTo(routing, device.id);
    return { device, distance, path };
  });
  const reachable = rows.filter((r) => r.distance !== null);
  const farthest = reachable.reduce((max, r) => Math.max(max, r.distance ?? 0), 0);
  const unreachable = rows.filter((r) => r.distance === null);
  const sourceLabel = labelOf.get(routing.sourceId) ?? routing.sourceId;

  return (
    <>
      {!result.isConnected && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-500/50 bg-amber-950 p-3 text-sm text-amber-200"
        >
          <strong>La red no está conectada:</strong> hay {result.componentCount} grupos de
          routers aislados entre sí. Desde {sourceLabel} no se puede llegar a:{" "}
          {unreachable.map((r) => r.device.label).join(", ")}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Router de origen" value={sourceLabel} />
        <Stat label="Alcanzables" value={`${reachable.length} de ${rows.length}`} />
        <Stat label="Distancia máxima" value={String(farthest)} />
        <Stat label="Enlaces del árbol" value={String(result.selectedLinkIds.length)} />
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        <Check ok={problems.length === 0} text="Distancias óptimas (ninguna ruta las mejora)" />
        <Check ok={!report.hasCycles} text="El árbol de rutas no tiene ciclos" />
      </ul>
      {problems.length > 0 && (
        <p className="mt-2 text-xs text-rose-300">{problems[0]}</p>
      )}

      <StepNote result={result} stepIndex={stepIndex} />

      <h3 className="mb-1 mt-4 text-sm font-semibold text-slate-200">
        Rutas más cortas desde {sourceLabel}
      </h3>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1 text-left">Destino</th>
              <th className="px-2 py-1 text-right">Distancia</th>
              <th className="px-2 py-1 text-left">Camino</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ device, distance, path }) => (
              <tr key={device.id} className="border-t border-slate-700">
                <td className="px-2 py-1 font-medium text-white">{device.label}</td>
                <td className="px-2 py-1 text-right">{distance === null ? "∞" : distance}</td>
                <td className="px-2 py-1">
                  {path
                    ? path.map((id) => labelOf.get(id) ?? id).join(" → ")
                    : <span className="text-rose-400">Inalcanzable</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ResultsPanel() {
  const network = useNetworkStore((s) => s.network);
  const result = useNetworkStore((s) => s.result);
  const stepIndex = useNetworkStore((s) => s.stepIndex);
  const mode = useNetworkStore((s) => s.analysisMode);

  const labelOf = useMemo(
    () => new Map(network.devices.map((d) => [d.id, d.label])),
    [network.devices]
  );
  const linkById = useMemo(
    () => new Map(network.links.map((l) => [l.id, l])),
    [network.links]
  );

  let content: ReactNode;

  if (network.devices.length === 0) {
    content = (
      <p className="text-sm text-slate-400">
        Todavía no hay una red. Crea dispositivos y enlaces, o carga un ejemplo.
      </p>
    );
  } else if (!result) {
    content = (
      <p className="text-sm text-slate-400">
        {mode === "layer3"
          ? "Ejecuta el algoritmo para ver aquí las distancias y los caminos más cortos."
          : "Ejecuta un algoritmo para ver aquí los resultados."}
      </p>
    );
  } else {
    const definition = ALGORITHMS[result.algorithmId];
    const analyzed = networkForLayer(network, definition.layer);
    const body: BodyProps = { network: analyzed, result, stepIndex, labelOf, linkById };

    content = (
      <>
        <p className="mb-3 text-sm text-slate-400">
          Resultado de <span className="font-semibold text-cyan-300">{definition.name}</span>
        </p>
        {result.routing ? <RoutingBody {...body} /> : <SpanningBody {...body} />}
      </>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Resultados</h2>
      {content}
    </section>
  );
}
