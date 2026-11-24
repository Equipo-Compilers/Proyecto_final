import type { AlgorithmResult } from "../model/algorithmResult";
import type { Network } from "../model/network";
import { validateCost } from "../model/networkOps";
import { countComponents } from "../utils/graph";
import { UnionFind } from "../utils/unionFind";

export function validateNetwork(network: Network): string[] {
  const problems: string[] = [];

  const deviceIds = new Set<string>();
  for (const d of network.devices) {
    if (deviceIds.has(d.id)) problems.push(`El dispositivo «${d.id}» está repetido`);
    deviceIds.add(d.id);
  }

  const linkIds = new Set<string>();
  const pairs = new Set<string>();
  for (const l of network.links) {
    if (linkIds.has(l.id)) problems.push(`El enlace «${l.id}» está repetido`);
    linkIds.add(l.id);

    if (!deviceIds.has(l.source) || !deviceIds.has(l.target)) {
      problems.push(`El enlace «${l.id}» usa un dispositivo que no existe`);
    }
    if (l.source === l.target) {
      problems.push(`El enlace «${l.id}» conecta un dispositivo consigo mismo`);
    }
    if (validateCost(l.cost) !== null) {
      problems.push(`El enlace «${l.id}» tiene un costo inválido (${l.cost})`);
    }
    const key = [l.source, l.target].sort().join("|");
    if (pairs.has(key)) {
      problems.push(`Hay más de un enlace entre ${l.source} y ${l.target}`);
    }
    pairs.add(key);
  }

  return problems;
}

export interface ValidationReport {
  ok: boolean;
  hasCycles: boolean;
  expectedEdges: number;
  actualEdges: number;
  edgeCountOk: boolean;
  networkComponents: number;
  selectedComponents: number;
  coversNetwork: boolean;
  problems: string[];
}

export function validateResult(
  network: Network,
  result: AlgorithmResult
): ValidationReport {
  const problems: string[] = [];
  const deviceIds = network.devices.map((d) => d.id);
  const uf = new UnionFind(deviceIds);
  const linkById = new Map(network.links.map((l) => [l.id, l]));

  let hasCycles = false;
  let selectedComponents = deviceIds.length;
  let unknownLinks = 0;

  for (const id of result.selectedLinkIds) {
    const link = linkById.get(id);
    if (!link) {
      unknownLinks++;
      continue;
    }
    if (uf.union(link.source, link.target)) selectedComponents--;
    else hasCycles = true;
  }

  const networkComponents = countComponents(network);
  const expectedEdges = deviceIds.length - networkComponents;
  const actualEdges = result.selectedLinkIds.length;
  const edgeCountOk = actualEdges === expectedEdges;
  const coversNetwork = selectedComponents === networkComponents;

  if (unknownLinks > 0) {
    problems.push(`El resultado menciona ${unknownLinks} enlace(s) que no existen en la red`);
  }
  if (hasCycles) problems.push("Los enlaces elegidos forman al menos un ciclo");
  if (!edgeCountOk) {
    problems.push(`Se esperaban ${expectedEdges} enlaces y hay ${actualEdges}`);
  }
  if (!coversNetwork) {
    problems.push("Los enlaces elegidos no conectan todos los dispositivos que se pueden conectar");
  }

  return {
    ok: problems.length === 0,
    hasCycles,
    expectedEdges,
    actualEdges,
    edgeCountOk,
    networkComponents,
    selectedComponents,
    coversNetwork,
    problems,
  };
}
