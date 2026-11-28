import { describe, it, expect } from "vitest";

import type { Network } from "../core/model/network";
import { networkForLayer } from "../core/utils/layers";
import { pathTo } from "../core/utils/routing";

const dev = (id: string, kind: "router" | "switch" | "pc") => ({
  id,
  kind,
  label: id,
  position: { x: 0, y: 0 },
  status: "up" as const,
});
const link = (id: string, source: string, target: string) => ({ id, source, target, cost: 1, status: "up" as const });

/** R1-R2 (routers), SW1 (switch), PC1; enlaces R1-R2, R1-SW1, SW1-PC1. */
const mixed: Network = {
  name: "mixta",
  devices: [dev("R1", "router"), dev("R2", "router"), dev("SW1", "switch"), dev("PC1", "pc")],
  links: [link("e1", "R1", "R2"), link("e2", "R1", "SW1"), link("e3", "SW1", "PC1")],
};

describe("networkForLayer", () => {
  it("capa 2 devuelve la red completa", () => {
    expect(networkForLayer(mixed, "layer2")).toBe(mixed);
  });

  it("capa 3 deja solo routers y los enlaces entre routers", () => {
    const r = networkForLayer(mixed, "layer3");
    expect(r.devices.map((d) => d.id)).toEqual(["R1", "R2"]);
    expect(r.links.map((l) => l.id)).toEqual(["e1"]);
  });

  it("capa 3 sin routers queda vacía", () => {
    const sinRouters = { ...mixed, devices: mixed.devices.filter((d) => d.kind !== "router") };
    const r = networkForLayer(sinRouters, "layer3");
    expect(r.devices).toHaveLength(0);
    expect(r.links).toHaveLength(0);
  });

  it("no modifica la red original", () => {
    networkForLayer(mixed, "layer3");
    expect(mixed.devices).toHaveLength(4);
    expect(mixed.links).toHaveLength(3);
  });
});

describe("pathTo", () => {
  const routing = {
    sourceId: "A",
    distances: { A: 0, B: 2, C: 5, D: null } as Record<string, number | null>,
    predecessors: { A: null, B: "A", C: "B", D: null } as Record<string, string | null>,
  };

  it("reconstruye el camino del origen al destino", () => {
    expect(pathTo(routing, "C")).toEqual(["A", "B", "C"]);
    expect(pathTo(routing, "B")).toEqual(["A", "B"]);
  });

  it("el camino al origen es solo el origen", () => {
    expect(pathTo(routing, "A")).toEqual(["A"]);
  });

  it("devuelve null si no hay camino o el destino no existe", () => {
    expect(pathTo(routing, "D")).toBeNull();
    expect(pathTo(routing, "Z")).toBeNull();
  });

  it("no se queda en un bucle infinito con datos dañados", () => {
    const roto = {
      sourceId: "A",
      distances: { A: 0, B: 1, C: 2 } as Record<string, number | null>,
      predecessors: { A: null, B: "C", C: "B" } as Record<string, string | null>,
    };
    expect(pathTo(roto, "C")).toBeNull();
  });
});

import { getRoutePath } from "../core/utils/routing";
import { runAlgorithm } from "../core/algorithms/registry";
import { ROUTING_EXAMPLE_NETWORKS } from "../data/examples";

describe("getRoutePath", () => {
  const red = ROUTING_EXAMPLE_NETWORKS[0].network;

  for (const id of ["dijkstra", "bellmanFord"] as const) {
    describe(id, () => {
      const result = runAlgorithm(id, red, { startNodeId: "R1" });

      it("da dispositivos, enlaces y costo del camino a R5", () => {
        const p = getRoutePath(red, result, "R5")!;
        expect(p.deviceIds).toEqual(["R1", "R3", "R6", "R5"]);
        expect(p.linkIds).toHaveLength(3);
        expect(p.totalCost).toBe(20);
        expect(p.hops.reduce((s, h) => s + h.cost, 0)).toBe(20);
        for (const h of p.hops) {
          const link = red.links.find((l) => l.id === h.linkId)!;
          expect([link.source, link.target].sort()).toEqual([h.from, h.to].sort());
        }
      });

      it("los enlaces del camino pertenecen al árbol de rutas", () => {
        const p = getRoutePath(red, result, "R4")!;
        for (const l of p.linkIds) expect(result.selectedLinkIds.includes(l)).toBe(true);
      });

      it("el destino igual al origen da un camino sin saltos", () => {
        expect(getRoutePath(red, result, "R1")).toMatchObject({
          deviceIds: ["R1"],
          linkIds: [],
          totalCost: 0,
        });
      });
    });
  }

  it("devuelve null sin resultado, sin destino, sin enrutamiento o con destino inalcanzable", () => {
    const result = runAlgorithm("dijkstra", red, { startNodeId: "R1" });
    expect(getRoutePath(red, null, "R5")).toBeNull();
    expect(getRoutePath(red, result, null)).toBeNull();
    expect(getRoutePath(red, result, "X9")).toBeNull();
    expect(getRoutePath(red, runAlgorithm("kruskal", red), "R5")).toBeNull();
    const des = ROUTING_EXAMPLE_NETWORKS[2].network;
    expect(getRoutePath(des, runAlgorithm("dijkstra", des, { startNodeId: "R1" }), "R4")).toBeNull();
  });

  it("con enlaces paralelos usa el que eligió el algoritmo", () => {
    const net: Network = {
      name: "p",
      devices: [dev("R1", "router"), dev("R2", "router")],
      links: [{ ...link("caro", "R1", "R2"), cost: 5 }, { ...link("barato", "R1", "R2"), cost: 1 }],
    };
    for (const id of ["dijkstra", "bellmanFord"] as const) {
      const p = getRoutePath(net, runAlgorithm(id, net, { startNodeId: "R1" }), "R2")!;
      expect(p.linkIds).toEqual(["barato"]);
    }
  });
});
