import { describe, it, expect } from "vitest";

import type { AlgorithmResult } from "../core/model/algorithmResult";
import type { Network } from "../core/model/network";
import { runAlgorithm } from "../core/algorithms/registry";
import { validateNetwork, validateResult, validateRouting } from "../core/validation/validator";
import { EXAMPLE_NETWORKS, ROUTING_EXAMPLE_NETWORKS } from "../data/examples";

function dev(id: string) {
  return { id, kind: "switch" as const, label: id, position: { x: 0, y: 0 }, status: "up" as const };
}
function link(id: string, source: string, target: string, cost = 1) {
  return { id, source, target, cost, status: "up" as const };
}

const triangle: Network = {
  name: "triángulo",
  devices: [dev("A"), dev("B"), dev("C"), dev("D")],
  links: [link("e1", "A", "B"), link("e2", "B", "C"), link("e3", "A", "C"), link("e4", "C", "D")],
};

function fake(selected: string[]): AlgorithmResult {
  return {
    algorithmId: "kruskal",
    selectedLinkIds: selected,
    discardedLinkIds: [],
    totalCost: 0,
    isConnected: true,
    componentCount: 1,
    steps: [],
  };
}

describe("validateNetwork", () => {
  it("las redes de ejemplo son válidas", () => {
    for (const e of EXAMPLE_NETWORKS) expect(validateNetwork(e.network)).toEqual([]);
  });

  it("acepta la red vacía", () => {
    expect(validateNetwork({ name: "x", devices: [], links: [] })).toEqual([]);
  });

  it("detecta dispositivos repetidos", () => {
    const n = { ...triangle, devices: [...triangle.devices, dev("A")] };
    expect(validateNetwork(n).length > 0).toBe(true);
  });

  it("detecta enlaces repetidos, a dispositivos inexistentes y a sí mismos", () => {
    expect(validateNetwork({ ...triangle, links: [...triangle.links, link("e1", "A", "D")] }).length > 0).toBe(true);
    expect(validateNetwork({ ...triangle, links: [link("e9", "A", "Z")] }).length > 0).toBe(true);
    expect(validateNetwork({ ...triangle, links: [link("e9", "A", "A")] }).length > 0).toBe(true);
  });

  it("detecta costos inválidos", () => {
    for (const cost of [0, -2, Number.NaN]) {
      expect(validateNetwork({ ...triangle, links: [link("e9", "A", "B", cost)] }).length > 0).toBe(true);
    }
  });

  it("detecta dos enlaces entre el mismo par (en cualquier dirección)", () => {
    const n = { ...triangle, links: [link("e1", "A", "B"), link("e2", "B", "A")] };
    expect(validateNetwork(n).length > 0).toBe(true);
  });
});

describe("validateResult", () => {
  it("acepta un árbol correcto", () => {
    const report = validateResult(triangle, fake(["e1", "e2", "e4"]));
    expect(report.ok).toBe(true);
    expect(report.hasCycles).toBe(false);
    expect(report.expectedEdges).toBe(3);
    expect(report.actualEdges).toBe(3);
  });

  it("detecta un ciclo", () => {
    const report = validateResult(triangle, fake(["e1", "e2", "e3"]));
    expect(report.hasCycles).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("detecta que faltan enlaces", () => {
    const report = validateResult(triangle, fake(["e1", "e2"]));
    expect(report.edgeCountOk).toBe(false);
    expect(report.coversNetwork).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("detecta enlaces que no existen en la red", () => {
    const report = validateResult(triangle, fake(["e1", "e2", "e4", "fantasma"]));
    expect(report.ok).toBe(false);
    expect(report.problems.length > 0).toBe(true);
  });

  it("detecta el número correcto de enlaces pero sin conectar todo", () => {
    const report = validateResult(triangle, fake(["e1", "e2", "e3"]));
    expect(report.edgeCountOk).toBe(true);
    expect(report.coversNetwork).toBe(false);
  });

  it("valida el resultado de los algoritmos en todas las redes de ejemplo", () => {
    for (const e of EXAMPLE_NETWORKS) {
      expect(validateResult(e.network, runAlgorithm("kruskal", e.network)).ok).toBe(true);
    }
  });

  it("la red vacía es válida", () => {
    const empty: Network = { name: "x", devices: [], links: [] };
    expect(validateResult(empty, fake([])).ok).toBe(true);
  });
});

describe("validateRouting", () => {
  const routers = ROUTING_EXAMPLE_NETWORKS[0].network;
  const good = () => runAlgorithm("dijkstra", routers);

  it("acepta las distancias que calcula Dijkstra", () => {
    for (const e of ROUTING_EXAMPLE_NETWORKS) {
      expect(validateRouting(e.network, runAlgorithm("dijkstra", e.network))).toEqual([]);
    }
  });

  it("un resultado sin datos de enrutamiento no tiene nada que validar", () => {
    expect(validateRouting(triangle, fake(["e1"]))).toEqual([]);
  });

  it("detecta una distancia demasiado larga (hay una ruta mejor)", () => {
    const r = good();
    r.routing!.distances["R4"] = 25;
    expect(validateRouting(routers, r).length > 0).toBe(true);
  });

  it("detecta una distancia demasiado corta (no cuadra con su predecesor)", () => {
    const r = good();
    r.routing!.distances["R4"] = 15;
    expect(validateRouting(routers, r).length > 0).toBe(true);
  });

  it("detecta que el origen no tiene distancia 0", () => {
    const r = good();
    r.routing!.distances["R1"] = 3;
    expect(validateRouting(routers, r).length > 0).toBe(true);
  });

  it("detecta un dispositivo alcanzable marcado como inalcanzable", () => {
    const r = good();
    r.routing!.distances["R5"] = null;
    expect(validateRouting(routers, r).length > 0).toBe(true);
  });

  it("detecta un predecesor que falta o que no es válido", () => {
    const sinPred = good();
    sinPred.routing!.predecessors["R5"] = null;
    expect(validateRouting(routers, sinPred).length > 0).toBe(true);

    const malPred = good();
    malPred.routing!.predecessors["R5"] = "R2";
    expect(validateRouting(routers, malPred).length > 0).toBe(true);
  });

  it("detecta un origen que no está en la red", () => {
    const r = good();
    r.routing!.sourceId = "X9";
    expect(validateRouting(routers, r).length > 0).toBe(true);
  });
});
