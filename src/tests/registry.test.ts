import { describe, it, expect } from "vitest";

import {
  ALGORITHM_LIST,
  ALGORITHMS,
  runAlgorithm,
} from "../core/algorithms/registry";
import type { Network } from "../core/model/network";
import { validateResult } from "../core/validation/validator";
import { EXAMPLE_NETWORKS } from "../data/examples";
import { ESPERADOS } from "./helpers/loadExample";

const byId = (id: string): Network => {
  const found = EXAMPLE_NETWORKS.find((e) => e.id === id);
  if (!found) throw new Error(`No existe el ejemplo ${id}`);
  return found.network;
};

const connected = EXAMPLE_NETWORKS.filter((e) => ESPERADOS[e.id].estaConectada);

describe("registro de algoritmos", () => {
  it("tiene Prim y Kruskal", () => {
    expect(ALGORITHM_LIST.map((a) => a.id)).toEqual(["prim", "kruskal"]);
    expect(ALGORITHMS.kruskal.name).toBe("Kruskal");
    expect(ALGORITHMS.prim.needsStartNode).toBe(true);
    expect(ALGORITHMS.kruskal.needsStartNode).toBe(false);
  });

  it("runAlgorithm llama al algoritmo pedido", () => {
    const net = byId("red-5-switches");
    expect(runAlgorithm("kruskal", net).algorithmId).toBe("kruskal");
    expect(runAlgorithm("prim", net).algorithmId).toBe("prim");
  });
});

describe("resultado unificado en las redes de ejemplo", () => {
  for (const example of EXAMPLE_NETWORKS) {
    for (const def of ALGORITHM_LIST) {
      describe(`${def.name} en ${example.id}`, () => {
        const result = def.run(example.network);
        const allIds = example.network.links.map((l) => l.id).sort();

        it("seleccionados y descartados reparten todos los enlaces sin repetir", () => {
          const union = [...result.selectedLinkIds, ...result.discardedLinkIds].sort();
          expect(union).toEqual(allIds);
        });

        it("indica bien si la red está conectada", () => {
          expect(result.isConnected).toBe(ESPERADOS[example.id].estaConectada);
          expect(result.componentCount).toBe(ESPERADOS[example.id].componentesConectados);
        });

        it("el costo total es la suma de los enlaces elegidos", () => {
          const cost = new Map(example.network.links.map((l) => [l.id, l.cost]));
          const sum = result.selectedLinkIds.reduce((acc, id) => acc + (cost.get(id) ?? 0), 0);
          expect(result.totalCost).toBe(sum);
        });
      });
    }
  }
});

describe("Kruskal vía registro", () => {
  for (const example of EXAMPLE_NETWORKS) {
    it(`da el costo esperado y un resultado válido en ${example.id}`, () => {
      const result = runAlgorithm("kruskal", example.network);
      expect(result.totalCost).toBe(ESPERADOS[example.id].costoTotal);
      expect(validateResult(example.network, result).ok).toBe(true);
    });
  }

  it("elige exactamente los ids esperados donde no hay empates", () => {
    for (const example of EXAMPLE_NETWORKS) {
      const esperado = ESPERADOS[example.id].idsEnlacesSeleccionados;
      if (!esperado) continue;
      const ids = [...runAlgorithm("kruskal", example.network).selectedLinkIds].sort(
        (a, b) => Number(a.slice(1)) - Number(b.slice(1))
      );
      expect(ids).toEqual(esperado);
    }
  });

  it("registra un paso por enlace y el último coincide con el resultado", () => {
    const net = byId("red-5-switches");
    const r = runAlgorithm("kruskal", net);
    expect(r.steps).toHaveLength(net.links.length);
    const last = r.steps[r.steps.length - 1];
    expect(last.totalCost).toBe(r.totalCost);
    expect([...last.acceptedLinkIds].sort()).toEqual([...r.selectedLinkIds].sort());
  });

  it("cada paso apunta a un enlace real de la red y su decisión coincide con el resultado", () => {
    for (const example of EXAMPLE_NETWORKS) {
      const r = runAlgorithm("kruskal", example.network);
      const allIds = example.network.links.map((l) => l.id).sort();
      expect(r.steps.map((s) => s.linkId).sort()).toEqual(allIds);
      const selected = new Set(r.selectedLinkIds);
      for (const s of r.steps) {
        expect(s.decision === "accepted").toBe(selected.has(s.linkId));
      }
    }
  });

  it("recordSteps en false no guarda pasos", () => {
    const r = runAlgorithm("kruskal", byId("red-12-switches"), { recordSteps: false });
    expect(r.steps).toHaveLength(0);
    expect(r.totalCost).toBe(ESPERADOS["red-12-switches"].costoTotal);
  });
});

describe("Prim vía registro", () => {
  for (const example of connected) {
    it(`mismo costo que Kruskal y resultado válido en ${example.id}`, () => {
      const prim = runAlgorithm("prim", example.network);
      const kruskal = runAlgorithm("kruskal", example.network);
      expect(prim.totalCost).toBe(kruskal.totalCost);
      expect(validateResult(example.network, prim).ok).toBe(true);
    });
  }

  it("cada paso apunta al enlace elegido, en el mismo orden", () => {
    const r = runAlgorithm("prim", byId("red-12-switches"));
    expect(r.steps.map((s) => s.linkId)).toEqual(r.selectedLinkIds);
  });

  it("todos sus pasos son aceptados y el árbol crece de uno en uno", () => {
    const r = runAlgorithm("prim", byId("red-12-switches"));
    expect(r.steps.length).toBe(r.selectedLinkIds.length);
    r.steps.forEach((s, i) => {
      expect(s.decision).toBe("accepted");
      expect(s.acceptedLinkIds).toHaveLength(i + 1);
    });
  });

  it("empezar desde otro switch da el mismo costo total", () => {
    const net = byId("red-12-switches");
    const base = runAlgorithm("prim", net).totalCost;
    for (const d of net.devices) {
      expect(runAlgorithm("prim", net, { startNodeId: d.id }).totalCost).toBe(base);
    }
  });

  it("guarda el switch inicial, y si no existe usa el primero", () => {
    const net = byId("red-5-switches");
    expect(runAlgorithm("prim", net, { startNodeId: "C" }).startNodeId).toBe("C");
    expect(runAlgorithm("prim", net, { startNodeId: "no-existe" }).startNodeId).toBe("A");
    expect(runAlgorithm("prim", net).startNodeId).toBe("A");
  });
});

describe("red desconectada", () => {
  const net = byId("red-desconectada");

  it("Kruskal cubre las dos islas", () => {
    const r = runAlgorithm("kruskal", net);
    expect(r.isConnected).toBe(false);
    expect(r.componentCount).toBe(2);
    expect(r.totalCost).toBe(9);
    expect(validateResult(net, r).ok).toBe(true);
  });

  it("Prim solo cubre la isla del switch inicial", () => {
    expect(runAlgorithm("prim", net, { startNodeId: "S1" }).totalCost).toBe(6);
    expect(runAlgorithm("prim", net, { startNodeId: "S4" }).totalCost).toBe(3);
  });

  it("el validador avisa que Prim no cubre toda la red", () => {
    const r = runAlgorithm("prim", net, { startNodeId: "S1" });
    const report = validateResult(net, r);
    expect(report.coversNetwork).toBe(false);
    expect(report.ok).toBe(false);
  });
});

describe("casos borde", () => {
  const empty: Network = { name: "vacía", devices: [], links: [] };
  const one: Network = {
    name: "uno",
    devices: [{ id: "A", kind: "switch", label: "A", position: { x: 0, y: 0 }, status: "up" }],
    links: [],
  };

  it("red vacía", () => {
    for (const def of ALGORITHM_LIST) {
      const r = def.run(empty);
      expect(r.totalCost).toBe(0);
      expect(r.selectedLinkIds).toHaveLength(0);
      expect(r.steps).toHaveLength(0);
    }
  });

  it("un solo switch", () => {
    for (const def of ALGORITHM_LIST) {
      const r = def.run(one);
      expect(r.isConnected).toBe(true);
      expect(r.componentCount).toBe(1);
      expect(r.totalCost).toBe(0);
    }
  });

  it("dos enlaces entre el mismo par con el mismo costo: distingue cuál se eligió", () => {
    const net: Network = {
      name: "paralelos",
      devices: [
        { id: "A", kind: "switch", label: "A", position: { x: 0, y: 0 }, status: "up" },
        { id: "B", kind: "switch", label: "B", position: { x: 1, y: 0 }, status: "up" },
      ],
      links: [
        { id: "e1", source: "A", target: "B", cost: 5, status: "up" },
        { id: "e2", source: "A", target: "B", cost: 5, status: "up" },
      ],
    };
    for (const def of ALGORITHM_LIST) {
      const r = def.run(net);
      expect(r.selectedLinkIds).toHaveLength(1);
      expect(r.discardedLinkIds).toHaveLength(1);
      expect(r.selectedLinkIds[0] === r.discardedLinkIds[0]).toBe(false);
    }
  });
});

describe("prepareBenchmark", () => {
  it("devuelve el mismo costo y cantidad de enlaces que run()", () => {
    for (const example of connected) {
      for (const def of ALGORITHM_LIST) {
        const out = def.prepareBenchmark(example.network)();
        const full = def.run(example.network);
        expect(out.totalCost).toBe(full.totalCost);
        expect(out.selectedLinks).toBe(full.selectedLinkIds.length);
      }
    }
  });
});
