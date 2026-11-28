import type {
  BellmanFordEdge,
  BellmanFordInput,
  BellmanFordModelResult,
  BellmanFordOptions,
  BellmanFordRelaxation,
  BellmanFordRound,
} from "../model/bellmanFordModel";

interface Arc {
  edge: BellmanFordEdge;
  from: string;
  to: string;
}

export function executeBellmanFord(
  input: BellmanFordInput,
  options: BellmanFordOptions = {}
): BellmanFordModelResult {
  const { recordSteps = true } = options;
  const { graph, sourceNode } = input;

  const labels = new Map<string, string>();
  for (const node of graph.nodes) labels.set(node.id, node.label);
  const nombre = (id: string) => labels.get(id) ?? id;

  if (!labels.has(sourceNode)) {
    throw new Error(`El nodo de origen «${sourceNode}» no existe`);
  }

  const arcs: Arc[] = [];
  for (const edge of graph.edges) {
    if (!labels.has(edge.source) || !labels.has(edge.target)) {
      throw new Error(`El enlace ${edge.source}-${edge.target} usa un nodo que no existe`);
    }
    if (!Number.isFinite(edge.weight) || edge.weight < 0) {
      throw new Error(
        `El enlace ${edge.source}-${edge.target} tiene un peso inválido (los enlaces son bidireccionales: se necesitan pesos de 0 o más)`
      );
    }
    if (edge.source === edge.target) continue;
    arcs.push({ edge, from: edge.source, to: edge.target });
    arcs.push({ edge, from: edge.target, to: edge.source });
  }

  const distance = new Map<string, number>([[sourceNode, 0]]);
  const predecessor = new Map<string, string | null>([[sourceNode, null]]);
  const predecessorEdge = new Map<string, BellmanFordEdge>();
  const rounds: BellmanFordRound[] = [];

  const snapshot = (): Record<string, number | null> => {
    const copy: Record<string, number | null> = {};
    for (const id of labels.keys()) copy[id] = distance.get(id) ?? null;
    return copy;
  };

  const maxRounds = Math.max(labels.size - 1, 0);
  let roundsExecuted = 0;
  let convergedEarly = false;

  for (let round = 1; round <= maxRounds; round++) {
    roundsExecuted++;
    const relaxations: BellmanFordRelaxation[] = [];
    let improvedCount = 0;

    for (const { edge, from, to } of arcs) {
      const base = distance.get(from);
      if (base === undefined) continue;
      const candidate = base + edge.weight;
      const previous = distance.get(to);
      const improved = previous === undefined || candidate < previous;
      if (improved) {
        improvedCount++;
        distance.set(to, candidate);
        predecessor.set(to, from);
        predecessorEdge.set(to, edge);
      }
      if (recordSteps) {
        relaxations.push({
          edge,
          from,
          to,
          previousDistance: previous ?? null,
          newDistance: candidate,
          improved,
          explanation: improved
            ? `Ronda ${round}: ${nombre(to)} ${
                previous === undefined ? "se alcanza" : `mejora de ${previous}`
              }${previous === undefined ? " con" : " a"} ${candidate}, pasando por ${nombre(from)} (${base} + ${edge.weight}) con el enlace ${nombre(edge.source)}–${nombre(edge.target)}.`
            : "",
        });
      }
    }

    if (recordSteps) {
      const lista = relaxations
        .filter((r) => r.improved)
        .map((r) => `${nombre(r.to)} = ${r.newDistance}`)
        .join(", ");
      rounds.push({
        round,
        relaxations,
        improvedCount,
        distances: snapshot(),
        explanation:
          improvedCount === 0
            ? `Ronda ${round}: ninguna distancia mejoró, el algoritmo termina.`
            : `Ronda ${round}: ${improvedCount} ${
                improvedCount === 1 ? "mejora" : "mejoras"
              } (${lista}).`,
      });
    }

    if (improvedCount === 0) {
      convergedEarly = true;
      break;
    }
  }

  const distances: Record<string, number | null> = {};
  const predecessors: Record<string, string | null> = {};
  const shortestPathEdges: BellmanFordEdge[] = [];
  let reachableCount = 0;
  for (const id of labels.keys()) {
    distances[id] = distance.get(id) ?? null;
    predecessors[id] = predecessor.get(id) ?? null;
    if (distances[id] !== null) reachableCount++;
    const edge = predecessorEdge.get(id);
    if (edge) shortestPathEdges.push(edge);
  }

  return {
    sourceNode,
    rounds,
    roundsExecuted,
    convergedEarly,
    distances,
    predecessors,
    shortestPathEdges,
    treeCost: shortestPathEdges.reduce((sum, e) => sum + e.weight, 0),
    reachableCount,
  };
}
