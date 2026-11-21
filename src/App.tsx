
import { useState } from "react";

import {
  createPrimSimulation,
  nextPrimStep,
  resetPrimSimulation,
} from "./core/simulation/primSimulation";

import type { PrimInput } from "./core/model/primModel";

// Grafo de ejemplo
const graph: PrimInput["graph"] = {
  nodes: [
    { id: "A", label: "A" },
    { id: "B", label: "B" },
    { id: "C", label: "C" },
    { id: "D", label: "D" },
    { id: "E", label: "E" },
  ],
  edges: [
    { source: "A", target: "B", weight: 4 },
    { source: "A", target: "C", weight: 2 },
    { source: "B", target: "C", weight: 1 },
    { source: "B", target: "D", weight: 5 },
    { source: "C", target: "D", weight: 8 },
    { source: "C", target: "E", weight: 10 },
    { source: "D", target: "E", weight: 2 },
  ],
};

function App() {
  const [startNode, setStartNode] = useState("A");

  const [simulation, setSimulation] = useState(() =>
    createPrimSimulation({
      graph,
      startNode: "A",
    })
  );

  const [started, setStarted] = useState(false);

  const currentStep = simulation.currentStep;
  const visitedNodes = currentStep?.visitedNodes ?? [];

  // Mostrar únicamente las aristas correspondientes a los pasos realizados
  const selectedEdges = simulation.result.mstEdges.slice(
    0,
    simulation.currentStepIndex + 1
  );

  const totalCost = currentStep?.totalCost ?? 0;

  // Iniciar simulación
  const handleStart = () => {
    setSimulation(
      createPrimSimulation({
        graph,
        startNode,
      })
    );

    setStarted(true);
  };

  // Avanzar un paso
  const handleNext = () => {
    if (!started || simulation.isFinished) return;

    setSimulation((previous) => nextPrimStep(previous));
  };

  // Reiniciar simulación
  const handleReset = () => {
    setSimulation(
      resetPrimSimulation(
        createPrimSimulation({
          graph,
          startNode,
        })
      )
    );

    setStarted(false);
  };

  // Cambiar nodo inicial
  const handleStartNodeChange = (node: string) => {
    setStartNode(node);

    setSimulation(
      createPrimSimulation({
        graph,
        startNode: node,
      })
    );

    setStarted(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Encabezado */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">
            Simulador de redes
          </h1>

          <p className="mt-2 text-slate-400">
            Algoritmos de optimización y análisis de grafos
          </p>
        </header>

        {/* Tarjetas de algoritmos */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-700 bg-slate-900 p-4">
            <h2 className="font-semibold text-emerald-400">Prim</h2>
            <p className="text-sm text-slate-400">
              Árbol de expansión mínima
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="font-semibold text-amber-400">Kruskal</h2>
            <p className="text-sm text-slate-400">
              Con Union-Find
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="font-semibold text-rose-400">Dijkstra</h2>
            <p className="text-sm text-slate-400">
              Rutas más cortas
            </p>
          </div>
        </div>

        {/* Simulación de Prim */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">

          <h2 className="mb-2 text-2xl font-bold text-emerald-400">
            Simulación de Prim
          </h2>

          <p className="mb-6 text-slate-400">
            Construye un árbol de expansión mínima paso a paso.
          </p>

          {/* Controles */}
          <div className="mb-6 flex flex-wrap items-end gap-4">

            <div>
              <label
                htmlFor="startNode"
                className="mb-2 block text-sm text-slate-400"
              >
                Nodo inicial
              </label>

              <select
                id="startNode"
                value={startNode}
                onChange={(e) => handleStartNodeChange(e.target.value)}
                disabled={started}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
              >
                {graph.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStart}
              disabled={started}
              className="rounded-lg bg-emerald-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Iniciar simulación
            </button>

            <button
              onClick={handleNext}
              disabled={!started || simulation.isFinished}
              className="rounded-lg bg-cyan-700 px-5 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente paso
            </button>

            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-600 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Reiniciar
            </button>
          </div>

          {/* Indicadores */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Nodo inicial</p>
              <p className="mt-2 text-2xl font-bold text-cyan-400">
                {startNode}
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Aristas seleccionadas
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {selectedEdges.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Costo total actual</p>
              <p className="mt-2 text-2xl font-bold text-amber-400">
                {totalCost}
              </p>
            </div>
          </div>

          {/* Nodos */}
          <div className="mb-8">
            <h3 className="mb-4 font-semibold text-slate-200">
              Nodos del grafo
            </h3>

            <div className="flex flex-wrap gap-3">
              {graph.nodes.map((node) => {
                const isVisited = visitedNodes.includes(node.id);
                const isInitial = node.id === startNode;

                return (
                  <div
                    key={node.id}
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold transition-all ${
                      isVisited
                        ? "border-emerald-400 bg-emerald-500 text-slate-950"
                        : isInitial && !started
                        ? "border-emerald-500 bg-slate-800 text-emerald-400"
                        : "border-slate-600 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {node.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paso actual */}
          <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/70 p-5">
            <h3 className="mb-3 font-semibold text-cyan-400">
              Paso actual
            </h3>

            {!started ? (
              <p className="text-slate-400">
                Inicia la simulación para visualizar el proceso de Prim.
              </p>
            ) : currentStep ? (
              <>
                <p className="mb-2 text-slate-200">
                  Paso {currentStep.stepNumber}
                </p>

                <p className="text-slate-400">
                  {currentStep.explanation}
                </p>

                {currentStep.selectedEdge && (
                  <div className="mt-4 rounded-lg bg-slate-900 p-4">
                    <p className="text-sm text-slate-400">
                      Arista seleccionada
                    </p>

                    <p className="mt-1 font-semibold text-emerald-400">
                      {currentStep.selectedEdge.source} —{" "}
                      {currentStep.selectedEdge.target}
                    </p>

                    <p className="text-amber-400">
                      Peso: {currentStep.selectedEdge.weight}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400">
                Simulación iniciada. Presiona Siguiente paso para continuar.
              </p>
            )}
          </div>

          {/* Aristas seleccionadas */}
          <div className="mb-8">
            <h3 className="mb-4 font-semibold text-slate-200">
              Aristas seleccionadas para el árbol
            </h3>

            <div className="rounded-xl bg-slate-800 p-4">
              {selectedEdges.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Todavía no se han seleccionado aristas.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedEdges.map((edge, index) => (
                    <div
                      key={`${edge.source}-${edge.target}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-emerald-800 bg-slate-900 p-3"
                    >
                      <span className="font-medium text-emerald-400">
                        {edge.source} — {edge.target}
                      </span>

                      <span className="rounded-md bg-slate-800 px-3 py-1 text-amber-400">
                        Peso: {edge.weight}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aristas candidatas */}
          <div className="mb-8">
            <h3 className="mb-4 font-semibold text-slate-200">
              Aristas candidatas
            </h3>

            <div className="rounded-xl bg-slate-800 p-4">
              {!started ? (
                <p className="text-sm text-slate-400">
                  Las aristas candidatas aparecerán al iniciar la simulación.
                </p>
              ) : currentStep?.candidateEdges.length ? (
                <div className="flex flex-wrap gap-3">
                  {currentStep.candidateEdges.map((edge, index) => (
                    <div
                      key={`${edge.source}-${edge.target}-${index}`}
                      className="rounded-lg border border-amber-700 bg-slate-900 px-4 py-2"
                    >
                      <span className="text-slate-200">
                        {edge.source} — {edge.target}
                      </span>

                      <span className="ml-2 font-bold text-amber-400">
                        ({edge.weight})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No hay aristas candidatas disponibles en este paso.
                </p>
              )}
            </div>
          </div>

          {/* Resultado final */}
          {started && simulation.isFinished && (
            <div className="rounded-xl border border-emerald-600 bg-emerald-950/30 p-5">
              <h3 className="mb-2 text-xl font-bold text-emerald-400">
                ¡Simulación finalizada!
              </h3>

              <p className="text-slate-300">
                Se construyó el árbol de expansión mínima.
              </p>

              <p className="mt-3 text-lg font-semibold text-amber-400">
                Costo total del árbol: {simulation.result.totalCost}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Aristas utilizadas: {simulation.result.mstEdges.length}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
