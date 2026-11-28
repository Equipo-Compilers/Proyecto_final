import { describe, it, expect } from "vitest";

import type { Network } from "../core/model/network";
import { ROUTING_EXAMPLE_NETWORKS } from "../data/examples";
import { buildRoutingTable, buildRoutingTables, routingEngineFor } from "../core/utils/routingTables";
import { runAlgorithm } from "../core/algorithms/registry";
import { generateRandomNetwork } from "../core/generator/randomNetwork";

const clasica = ROUTING_EXAMPLE_NETWORKS[0].network;
const desconectada = ROUTING_EXAMPLE_NETWORKS[2].network;
const entry = (table: ReturnType<typeof buildRoutingTable>, id: string) =>
  table.find((e) => e.destinationId === id)!;

describe("tabla de enrutamiento de R1 en la red clásica", () => {
  const table = buildRoutingTable(clasica, "R1");

  it("tiene una fila por router, en el orden de la red", () => {
    expect(table.map((e) => e.destinationId)).toEqual(clasica.devices.map((d) => d.id));
  });

  it("siguiente salto y costo correctos", () => {
    expect(entry(table, "R2")).toMatchObject({ nextHopId: "R2", cost: 7 });
    expect(entry(table, "R3")).toMatchObject({ nextHopId: "R3", cost: 9 });
    expect(entry(table, "R6")).toMatchObject({ nextHopId: "R3", cost: 11 });
    expect(entry(table, "R4")).toMatchObject({ nextHopId: "R3", cost: 20 });
    expect(entry(table, "R5")).toMatchObject({ nextHopId: "R3", cost: 20 });
  });

  it("el destino propio es local: costo 0 y sin siguiente salto", () => {
    expect(entry(table, "R1")).toMatchObject({ nextHopId: null, viaLinkId: null, cost: 0, path: ["R1"] });
  });

  it("guarda el camino completo y el enlace de salida", () => {
    expect(entry(table, "R5").path).toEqual(["R1", "R3", "R6", "R5"]);
    const via = entry(table, "R5").viaLinkId!;
    const link = clasica.links.find((l) => l.id === via)!;
    expect([link.source, link.target].sort()).toEqual(["R1", "R3"]);
  });
});

describe("tablas completas", () => {
  it("el costo de A a B es el mismo que de B a A (enlaces bidireccionales)", () => {
    const tables = buildRoutingTables(clasica);
    for (const a of clasica.devices) {
      for (const b of clasica.devices) {
        expect(entry(tables[a.id], b.id).cost).toBe(entry(tables[b.id], a.id).cost);
      }
    }
  });

  it("seguir los siguientes saltos de verdad llega al destino con el costo indicado", () => {
    const tables = buildRoutingTables(clasica);
    const costOf = (a: string, b: string) =>
      Math.min(
        ...clasica.links
          .filter((l) => (l.source === a && l.target === b) || (l.source === b && l.target === a))
          .map((l) => l.cost)
      );
    for (const origen of clasica.devices) {
      for (const destino of clasica.devices) {
        let actual = origen.id;
        let total = 0;
        let guard = 20;
        while (actual !== destino.id && guard-- > 0) {
          const siguiente = entry(tables[actual], destino.id).nextHopId!;
          total += costOf(actual, siguiente);
          actual = siguiente;
        }
        expect(actual).toBe(destino.id);
        expect(total).toBe(entry(tables[origen.id], destino.id).cost);
      }
    }
  });

  it("Dijkstra y Bellman-Ford dan los mismos costos en todas las tablas", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const net = generateRandomNetwork({ switches: 10, kind: "router", extraLinks: 8, seed });
      const d = buildRoutingTables(net, "dijkstra");
      const b = buildRoutingTables(net, "bellmanFord");
      for (const id of Object.keys(d)) {
        expect(d[id].map((e) => e.cost)).toEqual(b[id].map((e) => e.cost));
      }
    }
  });

  it("coincide con lo que calcula el registro desde el mismo origen", () => {
    const r = runAlgorithm("dijkstra", clasica, { startNodeId: "R2" });
    const table = buildRoutingTable(clasica, "R2");
    for (const e of table) expect(e.cost).toBe(r.routing!.distances[e.destinationId]);
  });
});

describe("casos especiales", () => {
  it("routers inalcanzables: sin siguiente salto, costo null", () => {
    const table = buildRoutingTable(desconectada, "R1");
    expect(entry(table, "R4")).toEqual({
      destinationId: "R4",
      nextHopId: null,
      viaLinkId: null,
      cost: null,
      path: null,
    });
    expect(entry(table, "R3").cost).not.toBeNull();
  });

  it("un router que no existe da una tabla vacía", () => {
    expect(buildRoutingTable(clasica, "X9")).toEqual([]);
  });

  it("solo incluye routers, ignora switches y PCs", () => {
    const mixta: Network = {
      ...clasica,
      devices: [
        ...clasica.devices,
        { id: "PC1", kind: "pc", label: "PC1", position: { x: 0, y: 0 }, status: "up" },
      ],
      links: [...clasica.links, { id: "ex", source: "R1", target: "PC1", cost: 1, status: "up" }],
    };
    const table = buildRoutingTable(mixta, "R1");
    expect(table).toHaveLength(6);
    expect(table.some((e) => e.destinationId === "PC1")).toBe(false);
  });

  it("sin routers: no hay tablas", () => {
    expect(buildRoutingTables({ name: "x", devices: [], links: [] })).toEqual({});
  });

  it("elige el motor según el algoritmo", () => {
    expect(routingEngineFor("bellmanFord")).toBe("bellmanFord");
    expect(routingEngineFor("dijkstra")).toBe("dijkstra");
    expect(routingEngineFor("kruskal")).toBe("dijkstra");
  });
});
