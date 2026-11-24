import { useMemo } from "react";

import { ALGORITHMS } from "../../core/algorithms/registry";
import type { Link } from "../../core/model/network";
import { validateResult } from "../../core/validation/validator";
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

export function ResultsPanel() {
  const network = useNetworkStore((s) => s.network);
  const result = useNetworkStore((s) => s.result);
  const stepIndex = useNetworkStore((s) => s.stepIndex);

  const labelOf = useMemo(
    () => new Map(network.devices.map((d) => [d.id, d.label])),
    [network.devices]
  );
  const linkById = useMemo(
    () => new Map(network.links.map((l) => [l.id, l])),
    [network.links]
  );
  const report = useMemo(
    () => (result ? validateResult(network, result) : null),
    [network, result]
  );

  const describe = (linkId: string): string => {
    const link: Link | undefined = linkById.get(linkId);
    if (!link) return linkId;
    const a = labelOf.get(link.source) ?? link.source;
    const b = labelOf.get(link.target) ?? link.target;
    return `${a} – ${b}  (costo ${link.cost})`;
  };

  let content;

  if (network.devices.length === 0) {
    content = (
      <p className="text-sm text-slate-400">
        Todavía no hay una red. Crea switches y enlaces, o carga un ejemplo.
      </p>
    );
  } else if (!result || !report) {
    content = (
      <p className="text-sm text-slate-400">
        Ejecuta un algoritmo para ver aquí los resultados.
      </p>
    );
  } else {
    const algorithmName = ALGORITHMS[result.algorithmId].name;
    const currentStep =
      stepIndex !== null && stepIndex >= 0 ? result.steps[stepIndex] : undefined;

    content = (
      <>
        <p className="mb-3 text-sm text-slate-400">
          Resultado de <span className="font-semibold text-cyan-300">{algorithmName}</span>
        </p>

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

        {currentStep && (
          <div className="mt-4 rounded-lg border border-cyan-500/40 bg-slate-900 p-3 text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">
              Paso {stepIndex === null ? 0 : stepIndex + 1} de {result.steps.length}:
            </span>{" "}
            {currentStep.explanation}
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-emerald-400">
              Seleccionados ({result.selectedLinkIds.length})
            </h3>
            <ul className="max-h-48 space-y-1 overflow-auto text-sm text-slate-300">
              {result.selectedLinkIds.map((id) => (
                <li key={id}>{describe(id)}</li>
              ))}
              {result.selectedLinkIds.length === 0 && (
                <li className="text-slate-500">Ninguno</li>
              )}
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
              {result.discardedLinkIds.length === 0 && (
                <li className="text-slate-500">Ninguno</li>
              )}
            </ul>
          </div>
        </div>
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
