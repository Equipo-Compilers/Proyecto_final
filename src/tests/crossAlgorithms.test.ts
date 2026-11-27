// F2-10: pruebas cruzadas. Dijkstra y Bellman-Ford deben dar las mismas
// distancias en cualquier red, desde cualquier origen, por cualquier camino
// de uso (algoritmo directo, registro, tablas, camino, benchmark).

import { describe, it, expect } from "vitest";

import { runAlgorithm } from "../core/algorithms/registry";
import { benchmarkNetwork } from "../core/benchmark/benchmark";
import { generateRandomNetwork } from "../core/generator/randomNetwork";
import type { AlgorithmResult } from "../core/model/algorithmResult";
import type { Network } from "../core/model/network";
import { getRoutePath } from "../core/utils/routing";
import { buildRoutingTables } from "../core/utils/routingTables";
import { validateResult, validateRouting } from "../core/validation/validator";
import { ROUTING_EXAMPLE_NETWORKS } from "../data/examples";
import { ESPERADOS_RUTAS } from "./helpers/loadRouting";

const both = (net: Network, source: string): [AlgorithmResult, AlgorithmResult] => [
  runAlgorithm("dijkstra", net, { startNodeId: source }),
  runAlgorithm("bellmanFord", net, { startNodeId: source }),
];

const sum = (r: AlgorithmResult) =>
  Object.values(r.routing!.distances).reduce<number>((s, d) => s + (d ?? 0), 0);

/** Redes de prueba: los ejemplos y algunas aleatorias (con y sin ciclos). */
function sampleNetworks(): { name: string; net: Network }[] {
  const list = ROUTING_EXAMPLE_NETWORKS.map((e) => ({ name: e.id, net: e.network }));
  for (let seed = 1; seed <= 12; seed++) {
    const n = [3, 6, 11, 17][seed % 4];
    list.push({
      name: `aleatoria-${seed}`,
      net: generateRandomNetwork({
        switches: n,
        kind: "router",
        extraLinks: seed % 3 === 0 ? 0 : n * 2,
        minCost: seed % 2 === 0 ? 1 : 3,
        maxCost: 9,
        seed,
      }),
    });
  }
  return list;
}

describe("Dijkstra y Bellman-Ford coinciden por el registro", () => {
  for (const { name, net } of sampleNetworks()) {
    it(`${name}: mismas distancias, mismos inalcanzables y mismo total, desde cada router`, () => {
      for (const origen of net.devices) {
        const [d, b] = both(net, origen.id);
        expect(b.routing!.distances).toEqual(d.routing!.distances);
        expect(b.selectedLinkIds).toHaveLength(d.selectedLinkIds.length);
        expect(sum(b)).toBe(sum(d));
        expect(b.isConnected).toBe(d.isConnected);
        expect(b.componentCount).toBe(d.componentCount);
      }
    });

    it(`${name}: los dos resultados pasan la validación y no tienen ciclos`, () => {
      for (const origen of net.devices) {
        for (const r of both(net, origen.id)) {
          expect(validateRouting(net, r)).toEqual([]);
          expect(validateResult(net, r).hasCycles).toBe(false);
        }
      }
    });
  }
});

describe("coinciden con los valores esperados de las redes de ejemplo", () => {
  for (const e of ROUTING_EXAMPLE_NETWORKS) {
    const esperado = ESPERADOS_RUTAS[e.id];
    it(e.id, () => {
      const [d, b] = both(e.network, esperado.origen);
      expect(d.routing!.distances).toEqual(esperado.distancias);
      expect(b.routing!.distances).toEqual(esperado.distancias);
      expect(d.routing!.predecessors).toEqual(esperado.predecesores);
      expect(b.routing!.predecessors).toEqual(esperado.predecesores);
      expect(d.totalCost).toBe(esperado.costoDelArbol);
      expect(b.totalCost).toBe(esperado.costoDelArbol);
    });
  }
});

describe("las demás piezas dan lo mismo con cualquiera de los dos", () => {
  for (const { name, net } of sampleNetworks()) {
    it(`${name}: tablas de enrutamiento`, () => {
      const d = buildRoutingTables(net, "dijkstra");
      const b = buildRoutingTables(net, "bellmanFord");
      for (const id of Object.keys(d)) {
        expect(b[id].map((e) => e.cost)).toEqual(d[id].map((e) => e.cost));
        expect(b[id].map((e) => e.nextHopId === null)).toEqual(d[id].map((e) => e.nextHopId === null));
      }
    });

    it(`${name}: el camino a cada destino cuesta lo mismo`, () => {
      const origen = net.devices[0].id;
      const [d, b] = both(net, origen);
      for (const destino of net.devices) {
        const pd = getRoutePath(net, d, destino.id);
        const pb = getRoutePath(net, b, destino.id);
        expect(pb === null).toBe(pd === null);
        if (pd && pb) {
          expect(pb.totalCost).toBe(pd.totalCost);
          // y el costo es de verdad la suma de los enlaces recorridos
          expect(pb.hops.reduce((s, h) => s + h.cost, 0)).toBe(pb.totalCost);
          expect(pd.hops.reduce((s, h) => s + h.cost, 0)).toBe(pd.totalCost);
        }
      }
    });

    it(`${name}: el benchmark reporta la misma suma de distancias`, () => {
      let t = 0;
      const rows = benchmarkNetwork(net, 2, ["dijkstra", "bellmanFord"], () => t++);
      expect(rows[0].distanceSum).toBe(rows[1].distanceSum);
    });
  }

  it("los pasos de Bellman-Ford terminan en el mismo árbol que dice su resultado", () => {
    for (const { net } of sampleNetworks()) {
      const b = runAlgorithm("bellmanFord", net);
      if (b.steps.length === 0) continue;
      const ultimo = b.steps[b.steps.length - 1];
      expect([...ultimo.acceptedLinkIds].sort()).toEqual([...b.selectedLinkIds].sort());
      expect(ultimo.totalCost).toBe(b.totalCost);
    }
  });
});

describe("la capa 3 ignora lo que no es un router", () => {
  it("agregar switches y PCs conectados no cambia las distancias entre routers", () => {
    const base = ROUTING_EXAMPLE_NETWORKS[0].network;
    const conExtras: Network = {
      ...base,
      devices: [
        ...base.devices,
        { id: "S1", kind: "switch", label: "SW1", position: { x: 0, y: 0 }, status: "up" },
        { id: "PC1", kind: "pc", label: "PC1", position: { x: 0, y: 0 }, status: "up" },
      ],
      links: [
        ...base.links,
        { id: "x1", source: "R1", target: "S1", cost: 1, status: "up" },
        { id: "x2", source: "S1", target: "PC1", cost: 1, status: "up" },
        { id: "x3", source: "S1", target: "R5", cost: 1, status: "up" }, // atajo que NO cuenta
      ],
    };
    for (const id of ["dijkstra", "bellmanFord"] as const) {
      const sin = runAlgorithm(id, base, { startNodeId: "R1" });
      const con = runAlgorithm(id, conExtras, { startNodeId: "R1" });
      expect(con.routing!.distances).toEqual(sin.routing!.distances);
      expect(con.selectedLinkIds).toEqual(sin.selectedLinkIds);
    }
  });
});
