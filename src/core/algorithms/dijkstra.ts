import type {
  DijkstraEdge,
  DijkstraInput,
  DijkstraModelResult,
  DijkstraOptions,
  DijkstraRelaxation,
  DijkstraStep,
} from "../model/dijkstraModel";
import { PriorityQueue } from "../utils/priorityQueue";

interface QueueItem {
  node: string;
  distance: number;
  order: number;
}


export function executeDijkstra(
  input: DijkstraInput,
  options: DijkstraOptions = {}
): DijkstraModelResult {
  const { recordSteps = true } = options;
  const { graph, sourceNode } = input;

  const labels = new Map<string, string>();
  for (const node of graph.nodes) labels.set(node.id, node.label);
  const nombre = (id: string) => labels.get(id) ?? id;

  if (!labels.has(sourceNode)) {
    throw new Error(`El nodo de origen «${sourceNode}» no existe`);
  }

  const adjacency = new Map<string, { edge: DijkstraEdge; neighbor: string }[]>();
  for (const id of labels.keys()) adjacency.set(id, []);
  for (const edge of graph.edges) {
    if (!labels.has(edge.source) || !labels.has(edge.target)) {
      throw new Error(`El enlace ${edge.source}-${edge.target} usa un nodo que no existe`);
    }
    if (!Number.isFinite(edge.weight) || edge.weight < 0) {
      throw new Error(
        `El enlace ${edge.source}-${edge.target} tiene un peso inválido (Dijkstra necesita pesos de 0 o más)`
      );
    }
    if (edge.source === edge.target) continue;
    adjacency.get(edge.source)?.push({ edge, neighbor: edge.target });
    adjacency.get(edge.target)?.push({ edge, neighbor: edge.source });
  }

  const distance = new Map<string, number>([[sourceNode, 0]]);
  const predecessor = new Map<string, string | null>([[sourceNode, null]]);
  const predecessorEdge = new Map<string, DijkstraEdge | null>([[sourceNode, null]]);
  const settled = new Set<string>();
  const settledOrder: string[] = [];
  const shortestPathEdges: DijkstraEdge[] = [];
  const steps: DijkstraStep[] = [];

  let order = 0;
  const queue = new PriorityQueue<QueueItem>(
    (a, b) => a.distance - b.distance || a.order - b.order
  );
  queue.enqueue({ node: sourceNode, distance: 0, order: order++ });

  const snapshot = (): Record<string, number | null> => {
    const copy: Record<string, number | null> = {};
    for (const id of labels.keys()) copy[id] = distance.get(id) ?? null;
    return copy;
  };

  while (!queue.isEmpty()) {
    const item = queue.dequeue();
    if (!item || settled.has(item.node)) continue;

    settled.add(item.node);
    settledOrder.push(item.node);
    const treeEdge = predecessorEdge.get(item.node) ?? null;
    if (treeEdge) shortestPathEdges.push(treeEdge);

    const relaxations: DijkstraRelaxation[] = [];
    for (const { edge, neighbor } of adjacency.get(item.node) ?? []) {
      if (settled.has(neighbor)) continue;
      const candidate = item.distance + edge.weight;
      const current = distance.get(neighbor);
      const improved = current === undefined || candidate < current;
      if (improved) {
        distance.set(neighbor, candidate);
        predecessor.set(neighbor, item.node);
        predecessorEdge.set(neighbor, edge);
        queue.enqueue({ node: neighbor, distance: candidate, order: order++ });
      }
      relaxations.push({ edge, neighbor, newDistance: candidate, improved });
    }

    if (recordSteps) {
      const arrival = treeEdge
        ? `llegando por ${nombre(predecessor.get(item.node) ?? "")}–${nombre(item.node)}`
        : "como origen";
      const neighbors =
        relaxations.length === 0
          ? "No quedan vecinos por revisar."
          : "Vecinos: " +
            relaxations
              .map(
                (r) =>
                  `${nombre(r.neighbor)} = ${item.distance}+${r.edge.weight} = ${r.newDistance} (${
                    r.improved ? "mejora" : "no mejora"
                  })`
              )
              .join("; ") +
            ".";
      steps.push({
        stepNumber: steps.length + 1,
        currentNode: item.node,
        currentDistance: item.distance,
        treeEdge,
        relaxations,
        settledNodes: [...settledOrder],
        distances: snapshot(),
        explanation: `Se fija ${nombre(item.node)} con distancia ${item.distance}, ${arrival}. ${neighbors}`,
      });
    }
  }

  const distances: Record<string, number | null> = {};
  const predecessors: Record<string, string | null> = {};
  for (const id of labels.keys()) {
    distances[id] = distance.get(id) ?? null;
    predecessors[id] = predecessor.get(id) ?? null;
  }

  return {
    sourceNode,
    steps,
    distances,
    predecessors,
    shortestPathEdges,
    treeCost: shortestPathEdges.reduce((sum, e) => sum + e.weight, 0),
    reachableCount: settledOrder.length,
  };
}
