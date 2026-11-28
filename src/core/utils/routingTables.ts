import { executeBellmanFord } from "../algorithms/bellmanFord";
import { executeDijkstra } from "../algorithms/dijkstra";
import type { AlgorithmId } from "../model/algorithmResult";
import type { Network } from "../model/network";
import { networkForLayer } from "./layers";

export type RoutingEngine = "dijkstra" | "bellmanFord";

export interface RoutingTableEntry {
  destinationId: string;
  nextHopId: string | null;
  viaLinkId: string | null;
  cost: number | null;
  path: string[] | null;
}

export type RoutingTable = RoutingTableEntry[];
export type RoutingTables = Record<string, RoutingTable>;

export function routingEngineFor(id: AlgorithmId): RoutingEngine {
  return id === "bellmanFord" ? "bellmanFord" : "dijkstra";
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

function prepare(network: Network) {
  const routers = networkForLayer(network, "layer3");
  const linkByEdge = new Map<Edge, string>();
  const edges: Edge[] = routers.links.map((l) => {
    const edge = { source: l.source, target: l.target, weight: l.cost };
    linkByEdge.set(edge, l.id);
    return edge;
  });
  const graph = {
    nodes: routers.devices.map((d) => ({ id: d.id, label: d.label })),
    edges,
  };
  return { routers, graph, linkByEdge };
}

function computeTable(
  prepared: ReturnType<typeof prepare>,
  routerId: string,
  engine: RoutingEngine
): RoutingTable {
  const { routers, graph, linkByEdge } = prepared;
  const input = { graph, sourceNode: routerId };
  const raw =
    engine === "bellmanFord"
      ? executeBellmanFord(input, { recordSteps: false })
      : executeDijkstra(input, { recordSteps: false });

  const linkTo = new Map<string, string>();
  for (const edge of raw.shortestPathEdges) {
    const child = raw.predecessors[edge.target] === edge.source ? edge.target : edge.source;
    linkTo.set(child, linkByEdge.get(edge) as string);
  }

  return routers.devices.map((device): RoutingTableEntry => {
    const destinationId = device.id;
    const cost = raw.distances[destinationId] ?? null;
    if (cost === null) {
      return { destinationId, nextHopId: null, viaLinkId: null, cost: null, path: null };
    }
    const path: string[] = [];
    let current: string | null = destinationId;
    let guard = routers.devices.length + 1;
    while (current !== null && guard-- > 0) {
      path.push(current);
      if (current === routerId) break;
      current = raw.predecessors[current] ?? null;
    }
    path.reverse();
    const nextHopId = path.length > 1 ? path[1] : null;
    return {
      destinationId,
      nextHopId,
      viaLinkId: nextHopId === null ? null : linkTo.get(nextHopId) ?? null,
      cost,
      path,
    };
  });
}

export function buildRoutingTable(
  network: Network,
  routerId: string,
  engine: RoutingEngine = "dijkstra"
): RoutingTable {
  const prepared = prepare(network);
  if (!prepared.routers.devices.some((d) => d.id === routerId)) return [];
  return computeTable(prepared, routerId, engine);
}

export function buildRoutingTables(
  network: Network,
  engine: RoutingEngine = "dijkstra"
): RoutingTables {
  const prepared = prepare(network);
  const tables: RoutingTables = {};
  for (const device of prepared.routers.devices) {
    tables[device.id] = computeTable(prepared, device.id, engine);
  }
  return tables;
}
