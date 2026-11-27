import { describe, it, expect } from "vitest";

import { executeBellmanFord } from "../core/algorithms/bellmanFord";
import { executeDijkstra } from "../core/algorithms/dijkstra";
import type { BellmanFordGraph } from "../core/model/bellmanFordModel";
import { generateRandomNetwork } from "../core/generator/randomNetwork";
import { cargarRuta, ESPERADOS_RUTAS, aDijkstraInput } from "./helpers/loadRouting";

const nodes = (...ids: string[]) => ids.map((id) => ({ id, label: id }));

describe("Bellman-Ford en las redes de ejemplo", () => {
  for (const nombre of Object.keys(ESPERADOS_RUTAS)) {
    const esperado = ESPERADOS_RUTAS[nombre];
    const input = aDijkstraInput(cargarRuta(nombre), esperado.origen);

    describe(nombre, () => {
      it("calcula las distancias esperadas", () => {
        expect(executeBellmanFord(input).distances).toEqual(esperado.distancias);
      });
      it("calcula los predecesores esperados", () => {
        expect(executeBellmanFord(input).predecessors).toEqual(esperado.predecesores);
      });
      it("el árbol de rutas tiene los costos esperados", () => {
        const r = executeBellmanFord(input);
        expect(r.treeCost).toBe(esperado.costoDelArbol);
        expect(r.reachableCount).toBe(esperado.alcanzables);
        expect(r.shortestPathEdges).toHaveLength(esperado.alcanzables - 1);
      });
      it("no modifica la red recibida", () => {
        const antes = JSON.stringify(input);
        executeBellmanFord(input);
        expect(JSON.stringify(input)).toBe(antes);
      });
    });
  }
});

describe("Bellman-Ford: rondas (red clásica desde R1)", () => {
  const r = executeBellmanFord(aDijkstraInput(cargarRuta("ruta-6-routers"), "R1"));

  it("converge en 2 rondas: una con mejoras y otra sin cambios", () => {
    expect(r.rounds.map((x) => x.round)).toEqual([1, 2]);
    expect(r.roundsExecuted).toBe(2);
    expect(r.convergedEarly).toBe(true);
    expect(r.rounds[1].improvedCount).toBe(0);
  });

  it("la primera ronda mejora 8 veces, incluso reemplazando rutas peores", () => {
    expect(r.rounds[0].improvedCount).toBe(8);
    const haciaR4 = r.rounds[0].relaxations.filter((x) => x.improved && x.to === "R4");
    expect(haciaR4.map((x) => x.newDistance)).toEqual([22, 20]);
    expect(haciaR4[1].previousDistance).toBe(22);
    expect(haciaR4[0].previousDistance).toBeNull();
  });

  it("guarda las distancias al final de cada ronda", () => {
    expect(r.rounds[0].distances).toEqual(r.distances);
  });

  it("las explicaciones están en español", () => {
    expect(r.rounds[0].explanation).toContain("Ronda 1: 8 mejoras");
    expect(r.rounds[1].explanation).toContain("ninguna distancia mejoró");
    const primera = r.rounds[0].relaxations.find((x) => x.improved)!;
    expect(primera.explanation).toContain("se alcanza con");
    const segunda = r.rounds[0].relaxations.filter((x) => x.improved && x.to === "R4")[1];
    expect(segunda.explanation).toContain("mejora de 22 a 20");
  });
});

describe("Bellman-Ford: casos borde", () => {
  it("un solo nodo: sin rondas", () => {
    const r = executeBellmanFord({ graph: { nodes: nodes("A"), edges: [] }, sourceNode: "A" });
    expect(r.distances).toEqual({ A: 0 });
    expect(r.rounds).toHaveLength(0);
    expect(r.roundsExecuted).toBe(0);
  });

  it("nodos inalcanzables quedan en null", () => {
    const r = executeBellmanFord({ graph: { nodes: nodes("A", "B"), edges: [] }, sourceNode: "A" });
    expect(r.distances).toEqual({ A: 0, B: null });
    expect(r.predecessors).toEqual({ A: null, B: null });
  });

  it("enlaces paralelos: usa el más barato", () => {
    const r = executeBellmanFord({
      graph: {
        nodes: nodes("A", "B"),
        edges: [
          { source: "A", target: "B", weight: 9 },
          { source: "A", target: "B", weight: 2 },
        ],
      },
      sourceNode: "A",
    });
    expect(r.distances["B"]).toBe(2);
    expect(r.treeCost).toBe(2);
  });

  it("ignora enlaces de un nodo consigo mismo y acepta pesos 0", () => {
    const r = executeBellmanFord({
      graph: {
        nodes: nodes("A", "B", "C"),
        edges: [
          { source: "A", target: "A", weight: 1 },
          { source: "A", target: "B", weight: 0 },
          { source: "C", target: "B", weight: 3 },
        ],
      },
      sourceNode: "A",
    });
    expect(r.distances).toEqual({ A: 0, B: 0, C: 3 });
  });

  it("los enlaces son bidireccionales", () => {
    const r = executeBellmanFord({
      graph: { nodes: nodes("A", "B"), edges: [{ source: "B", target: "A", weight: 5 }] },
      sourceNode: "A",
    });
    expect(r.distances["B"]).toBe(5);
  });

  it("una cadena larga en orden inverso necesita varias rondas", () => {
    const r = executeBellmanFord({
      graph: {
        nodes: nodes("A", "B", "C", "D", "E"),
        edges: [
          { source: "D", target: "E", weight: 1 },
          { source: "C", target: "D", weight: 1 },
          { source: "B", target: "C", weight: 1 },
          { source: "A", target: "B", weight: 1 },
        ],
      },
      sourceNode: "A",
    });
    expect(r.distances["E"]).toBe(4);
    expect(r.roundsExecuted).toBe(4);
    expect(r.rounds.map((x) => x.improvedCount)).toEqual([1, 1, 1, 1]);
  });

  it("lanza error con origen inexistente, pesos inválidos o nodos desconocidos", () => {
    expect(() => executeBellmanFord({ graph: { nodes: nodes("A"), edges: [] }, sourceNode: "Z" })).toThrow();
    for (const weight of [-1, Number.NaN, Infinity]) {
      expect(() =>
        executeBellmanFord({
          graph: { nodes: nodes("A", "B"), edges: [{ source: "A", target: "B", weight }] },
          sourceNode: "A",
        })
      ).toThrow();
    }
    expect(() =>
      executeBellmanFord({
        graph: { nodes: nodes("A"), edges: [{ source: "A", target: "Z", weight: 1 }] },
        sourceNode: "A",
      })
    ).toThrow();
  });

  it("recordSteps en false no guarda rondas pero da el mismo resultado", () => {
    const input = aDijkstraInput(cargarRuta("ruta-6-routers"), "R1");
    const con = executeBellmanFord(input);
    const sin = executeBellmanFord(input, { recordSteps: false });
    expect(sin.rounds).toHaveLength(0);
    expect(sin.roundsExecuted).toBe(con.roundsExecuted);
    expect(sin.distances).toEqual(con.distances);
    expect(sin.predecessors).toEqual(con.predecessors);
  });

  it("siempre da el mismo resultado", () => {
    const input = aDijkstraInput(cargarRuta("ruta-con-empates"), "R1");
    const base = JSON.stringify(executeBellmanFord(input));
    for (let i = 0; i < 10; i++) expect(JSON.stringify(executeBellmanFord(input))).toBe(base);
  });
});

describe("Bellman-Ford contra Dijkstra (F2-10 adelantado)", () => {
  it("da las mismas distancias en 150 redes aleatorias, desde cualquier origen", () => {
    let comparaciones = 0;
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [4, 9, 16]) {
        const net = generateRandomNetwork({
          switches: n,
          kind: "router",
          extraLinks: seed % 4 === 0 ? 0 : n,
          minCost: 1,
          maxCost: 12,
          seed,
        });
        const graph: BellmanFordGraph = {
          nodes: net.devices.map((d) => ({ id: d.id, label: d.label })),
          edges: net.links.map((l) => ({ source: l.source, target: l.target, weight: l.cost })),
        };
        const source = net.devices[seed % n].id;
        const bf = executeBellmanFord({ graph, sourceNode: source });
        const dj = executeDijkstra({ graph, sourceNode: source });
        expect(bf.distances).toEqual(dj.distances);
        expect(bf.treeCost === dj.treeCost || bf.shortestPathEdges.length === dj.shortestPathEdges.length).toBe(true);
        comparaciones += Object.keys(bf.distances).length;
      }
    }
    expect(comparaciones > 1000).toBe(true);
  });

  it("con costos de cero, enlaces paralelos y redes desconectadas también coincide", () => {
    for (let seed = 1; seed <= 40; seed++) {
      let x = seed * 7919;
      const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
      const ids = ["A", "B", "C", "D", "E", "F", "G"];
      const edges = [];
      for (let i = 0; i < 8; i++) {
        edges.push({
          source: ids[Math.floor(rnd() * 7)],
          target: ids[Math.floor(rnd() * 7)],
          weight: Math.floor(rnd() * 5),
        });
      }
      const graph: BellmanFordGraph = { nodes: nodes(...ids), edges };
      expect(executeBellmanFord({ graph, sourceNode: "A" }).distances).toEqual(
        executeDijkstra({ graph, sourceNode: "A" }).distances
      );
    }
  });
});
