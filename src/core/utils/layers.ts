import type { AnalysisMode } from "../model/algorithmResult";
import type { Network } from "../model/network";

export function networkForLayer(network: Network, mode: AnalysisMode): Network {
  if (mode === "layer2") return network;
  const routers = network.devices.filter((d) => d.kind === "router");
  const ids = new Set(routers.map((d) => d.id));
  return {
    ...network,
    devices: routers,
    links: network.links.filter((l) => ids.has(l.source) && ids.has(l.target)),
  };
}

export const MODE_LABELS: Record<AnalysisMode, string> = {
  layer2: "Capa 2 · Prevención de bucles",
  layer3: "Capa 3 · Enrutamiento",
};
