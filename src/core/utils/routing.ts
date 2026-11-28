import type { AlgorithmResult, RoutingData } from "../model/algorithmResult";
import type { Network } from "../model/network";

export function pathTo(routing: RoutingData, destinationId: string): string[] | null {
  if (routing.distances[destinationId] === undefined) return null;
  if (routing.distances[destinationId] === null) return null;

  const path: string[] = [];
  let current: string | null = destinationId;
  let guard = Object.keys(routing.distances).length + 1;
  while (current !== null && guard-- > 0) {
    path.push(current);
    if (current === routing.sourceId) return path.reverse();
    current = routing.predecessors[current] ?? null;
  }
  return null;
}

export interface RouteHop {
  from: string;
  to: string;
  linkId: string;
  cost: number;
}

export interface RoutePath {
  deviceIds: string[];
  linkIds: string[];
  hops: RouteHop[];
  totalCost: number;
}

export function getRoutePath(
  network: Network,
  result: AlgorithmResult | null,
  destinationId: string | null
): RoutePath | null {
  if (!result || !result.routing || destinationId === null) return null;
  const deviceIds = pathTo(result.routing, destinationId);
  if (!deviceIds) return null;

  const linkById = new Map(network.links.map((l) => [l.id, l]));
  const treeLinks = result.selectedLinkIds
    .map((id) => linkById.get(id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined);

  const hops: RouteHop[] = [];
  for (let i = 0; i + 1 < deviceIds.length; i++) {
    const from = deviceIds[i];
    const to = deviceIds[i + 1];
    const link = treeLinks.find(
      (l) => (l.source === from && l.target === to) || (l.source === to && l.target === from)
    );
    if (!link) return null;
    hops.push({ from, to, linkId: link.id, cost: link.cost });
  }

  return {
    deviceIds,
    linkIds: hops.map((h) => h.linkId),
    hops,
    totalCost: result.routing.distances[destinationId] ?? 0,
  };
}
