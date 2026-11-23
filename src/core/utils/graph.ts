import type { Network } from "../model/network";
import { UnionFind } from "./unionFind";

export function countComponents(network: Network): number {
  const ids = new Set(network.devices.map((d) => d.id));
  const uf = new UnionFind([...ids]);
  let components = ids.size;
  for (const link of network.links) {
    if (!ids.has(link.source) || !ids.has(link.target)) continue;
    if (uf.union(link.source, link.target)) components--;
  }
  return components;
}
