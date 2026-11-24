import type { Network } from "../model/network";
import type {
  AlgorithmId,
  AlgorithmResult,
  AlgorithmStep,
} from "../model/algorithmResult";
import type { KruskalEdge, KruskalGraph } from "../model/kruskalModel";
import { countComponents } from "../utils/graph";
import { executeKruskal } from "./kruskal";
import { executePrim } from "./prim";

export interface RunOptions {
  recordSteps?: boolean;
  startNodeId?: string;
}

export interface BenchmarkRunOutput {
  totalCost: number;
  selectedLinks: number;
}

export interface AlgorithmDefinition {
  id: AlgorithmId;
  name: string;
  description: string;
  complexity: string;
  needsStartNode: boolean;
  run: (network: Network, options?: RunOptions) => AlgorithmResult;
  prepareBenchmark: (
    network: Network,
    options?: RunOptions
  ) => () => BenchmarkRunOutput;
}

function buildGraph(network: Network) {
  const linkByEdge = new Map<KruskalEdge, string>();
  const edges: KruskalEdge[] = network.links.map((link) => {
    const edge: KruskalEdge = {
      source: link.source,
      target: link.target,
      weight: link.cost,
    };
    linkByEdge.set(edge, link.id);
    return edge;
  });
  const graph: KruskalGraph = {
    nodes: network.devices.map((d) => ({ id: d.id, label: d.label })),
    edges,
  };
  return { graph, linkByEdge };
}

function resolveStartNode(network: Network, wanted?: string): string | undefined {
  if (wanted && network.devices.some((d) => d.id === wanted)) return wanted;
  return network.devices[0]?.id;
}

function finish(
  algorithmId: AlgorithmId,
  network: Network,
  selectedLinkIds: string[],
  totalCost: number,
  steps: AlgorithmStep[],
  startNodeId?: string
): AlgorithmResult {
  const selected = new Set(selectedLinkIds);
  const componentCount = countComponents(network);
  const result: AlgorithmResult = {
    algorithmId,
    selectedLinkIds,
    discardedLinkIds: network.links
      .filter((l) => !selected.has(l.id))
      .map((l) => l.id),
    totalCost,
    isConnected: componentCount <= 1,
    componentCount,
    steps,
  };
  if (startNodeId !== undefined) result.startNodeId = startNodeId;
  return result;
}

function runKruskal(network: Network, options: RunOptions = {}): AlgorithmResult {
  const { graph, linkByEdge } = buildGraph(network);
  const raw = executeKruskal(
    { graph },
    { recordSteps: options.recordSteps ?? true }
  );
  const idOf = (edge: KruskalEdge) => linkByEdge.get(edge) as string;

  const steps: AlgorithmStep[] = raw.steps.map((s) => ({
    stepNumber: s.stepNumber,
    linkId: idOf(s.evaluatedEdge),
    decision: s.decision,
    acceptedLinkIds: s.acceptedEdges.map(idOf),
    totalCost: s.totalCost,
    explanation: s.explanation,
  }));

  return finish("kruskal", network, raw.mstEdges.map(idOf), raw.totalCost, steps);
}

function runPrim(network: Network, options: RunOptions = {}): AlgorithmResult {
  const startNode = resolveStartNode(network, options.startNodeId);
  if (startNode === undefined) return finish("prim", network, [], 0, []);

  const { graph, linkByEdge } = buildGraph(network);
  const raw = executePrim({ graph, startNode });
  const idOf = (edge: KruskalEdge) => linkByEdge.get(edge) as string;

  const steps: AlgorithmStep[] = [];
  raw.steps.forEach((s, index) => {
    if (s.selectedEdge === null) return;
    steps.push({
      stepNumber: s.stepNumber,
      linkId: idOf(s.selectedEdge),
      decision: "accepted",
      acceptedLinkIds: raw.mstEdges.slice(0, index + 1).map(idOf),
      totalCost: s.totalCost,
      explanation: s.explanation,
    });
  });

  return finish(
    "prim",
    network,
    raw.mstEdges.map(idOf),
    raw.totalCost,
    options.recordSteps === false ? [] : steps,
    startNode
  );
}

export const ALGORITHMS: Record<AlgorithmId, AlgorithmDefinition> = {
  prim: {
    id: "prim",
    name: "Prim",
    description:
      "Crece el árbol desde un switch inicial, eligiendo siempre el enlace más barato que sale del árbol.",
    complexity: "O(E log V)",
    needsStartNode: true,
    run: runPrim,
    prepareBenchmark: (network, options = {}) => {
      const startNode = resolveStartNode(network, options.startNodeId);
      const { graph } = buildGraph(network);
      return () => {
        if (startNode === undefined) return { totalCost: 0, selectedLinks: 0 };
        const r = executePrim({ graph, startNode });
        return { totalCost: r.totalCost, selectedLinks: r.mstEdges.length };
      };
    },
  },
  kruskal: {
    id: "kruskal",
    name: "Kruskal",
    description:
      "Ordena los enlaces por costo y acepta solo los que no forman ciclos.",
    complexity: "O(E log E)",
    needsStartNode: false,
    run: runKruskal,
    prepareBenchmark: (network) => {
      const { graph } = buildGraph(network);
      return () => {
        const r = executeKruskal({ graph }, { recordSteps: false });
        return { totalCost: r.totalCost, selectedLinks: r.mstEdges.length };
      };
    },
  },
};

export const ALGORITHM_LIST: AlgorithmDefinition[] = [
  ALGORITHMS.prim,
  ALGORITHMS.kruskal,
];

export function runAlgorithm(
  id: AlgorithmId,
  network: Network,
  options?: RunOptions
): AlgorithmResult {
  return ALGORITHMS[id].run(network, options);
}
