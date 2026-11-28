import { describe, it, expect } from "vitest";

import { executeDijkstra } from "../core/algorithms/dijkstra";
import type { DijkstraGraph } from "../core/model/dijkstraModel";
import { generateRandomNetwork } from "../core/generator/randomNetwork";
import { cargarRuta, ESPERADOS_RUTAS, aDijkstraInput } from "./helpers/loadRouting";

function floydWarshall(graph: DijkstraGraph): Record<string, Record<string, number>> {
  const ids = graph.nodes.map((n) => n.id);
  const d: Record<string, Record<string, number>> = {};
  for (const a of ids) {
    d[a] = {};
    for (const b of ids) d[a][b] = a === b ? 0 : Infinity;
  }
  for (const e of graph.edges) {
    d[e.source][e.target] = Math.min(d[e.source][e.target], e.weight);
    d[e.target][e.source] = Math.min(d[e.target][e.source], e.weight);
  }
  for (const k of ids) {
    for (const i of ids) {
      for (const j of ids) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      }
    }
  }
  return d;
}

const nodes = (...ids: string[]) => ids.map((id) => ({ id, label: id }));

describe("Dijkstra en las redes de ejemplo", () => {
  for (const nombre of Object.keys(ESPERADOS_RUTAS)) {
    const esperado = ESPERADOS_RUTAS[nombre];
    const input = aDijkstraInput(cargarRuta(nombre), esperado.origen);

    describe(nombre, () => {
      it("calcula las distancias esperadas", () => {
        expect(executeDijkstra(input).distances).toEqual(esperado.distancias);
      });

      it("calcula los predecesores esperados", () => {
        expect(executeDijkstra(input).predecessors).toEqual(esperado.predecesores);
      });

      it("el árbol de rutas tiene los costos esperados", () => {
        const r = executeDijkstra(input);
        expect(r.treeCost).toBe(esperado.costoDelArbol);
        expect(r.reachableCount).toBe(esperado.alcanzables);
        expect(r.shortestPathEdges).toHaveLength(esperado.alcanzables - 1);
      });

      it("no modifica la red recibida", () => {
        const antes = JSON.stringify(input);
        executeDijkstra(input);
        expect(JSON.stringify(input)).toBe(antes);
      });
    });
  }
});

describe("Dijkstra: red clásica resuelta a mano (desde R1)", () => {
  const r = executeDijkstra(aDijkstraInput(cargarRuta("ruta-6-routers"), "R1"));

  it("distancias: R2=7, R3=9, R6=11, R4=20, R5=20", () => {
    expect(r.distances).toEqual({ R1: 0, R2: 7, R3: 9, R4: 20, R5: 20, R6: 11 });
  });

  it("fija los routers en orden de distancia", () => {
    expect(r.steps.map((s) => s.currentNode)).toEqual(["R1", "R2", "R3", "R6", "R4", "R5"]);
    expect(r.steps.map((s) => s.currentDistance)).toEqual([0, 7, 9, 11, 20, 20]);
  });

  it("el primer paso es el origen y no tiene enlace del árbol", () => {
    expect(r.steps[0].treeEdge).toBeNull();
    expect(r.steps[1].treeEdge).not.toBeNull();
  });

  it("registra qué vecinos mejoran en cada paso", () => {
    expect(r.steps[0].relaxations).toHaveLength(3);
    expect(r.steps[0].relaxations.every((x) => x.improved)).toBe(true);
    const paso3 = r.steps[2];
    const haciaR6 = paso3.relaxations.find((x) => x.neighbor === "R6");
    expect(haciaR6?.newDistance).toBe(11);
    expect(haciaR6?.improved).toBe(true);
  });

  it("guarda la mejor distancia conocida después de cada paso", () => {
    expect(r.steps[0].distances).toEqual({ R1: 0, R2: 7, R3: 9, R4: null, R5: null, R6: 14 });
    expect(r.steps[2].distances["R6"]).toBe(11);
    expect(r.steps[5].distances).toEqual(r.distances);
  });

  it("las explicaciones están en español y nombran el router y la distancia", () => {
    expect(r.steps[0].explanation).toContain("como origen");
    expect(r.steps[3].explanation).toContain("Se fija R6 con distancia 11");
    expect(r.steps[3].explanation).toContain("llegando por R3–R6");
    expect(r.steps[2].explanation).toContain("mejora");
  });

  it("settledNodes crece de uno en uno", () => {
    r.steps.forEach((s, i) => expect(s.settledNodes).toHaveLength(i + 1));
  });
});

describe("Dijkstra: desempates", () => {
  const input = aDijkstraInput(cargarRuta("ruta-con-empates"), "R1");

  it("con dos caminos igual de cortos se queda con el que encontró primero", () => {
    const r = executeDijkstra(input);
    expect(r.distances["R4"]).toBe(2);
    expect(r.predecessors["R4"]).toBe("R2");
  });

  it("siempre da el mismo resultado", () => {
    const base = JSON.stringify(executeDijkstra(input));
    for (let i = 0; i < 20; i++) expect(JSON.stringify(executeDijkstra(input))).toBe(base);
  });

  it("el no mejorar queda registrado", () => {
    const r = executeDijkstra(input);
    const alFijarR3 = r.steps.find((s) => s.currentNode === "R3")!;
    const haciaR4 = alFijarR3.relaxations.find((x) => x.neighbor === "R4");
    expect(haciaR4?.newDistance).toBe(2);
    expect(haciaR4?.improved).toBe(false);
    expect(alFijarR3.explanation).toContain("no mejora");
  });
});

describe("Dijkstra: red desconectada", () => {
  const r = executeDijkstra(aDijkstraInput(cargarRuta("ruta-desconectada"), "R1"));

  it("los routers de la otra isla quedan inalcanzables (null)", () => {
    expect(r.distances["R4"]).toBeNull();
    expect(r.distances["R5"]).toBeNull();
    expect(r.predecessors["R4"]).toBeNull();
    expect(r.reachableCount).toBe(3);
  });

  it("desde la otra isla pasa lo contrario", () => {
    const otro = executeDijkstra(aDijkstraInput(cargarRuta("ruta-desconectada"), "R4"));
    expect(otro.distances).toEqual({ R1: null, R2: null, R3: null, R4: 0, R5: 3 });
  });
});

describe("Dijkstra: casos borde", () => {
  it("un solo nodo: distancia 0 y sin enlaces en el árbol", () => {
    const r = executeDijkstra({ graph: { nodes: nodes("A"), edges: [] }, sourceNode: "A" });
    expect(r.distances).toEqual({ A: 0 });
    expect(r.shortestPathEdges).toHaveLength(0);
    expect(r.steps).toHaveLength(1);
  });

  it("origen sin enlaces: el resto es inalcanzable", () => {
    const r = executeDijkstra({ graph: { nodes: nodes("A", "B"), edges: [] }, sourceNode: "A" });
    expect(r.distances).toEqual({ A: 0, B: null });
  });

  it("enlaces paralelos: usa el más barato", () => {
    const r = executeDijkstra({
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

  it("un enlace de un nodo consigo mismo se ignora", () => {
    const r = executeDijkstra({
      graph: { nodes: nodes("A", "B"), edges: [{ source: "A", target: "A", weight: 1 }, { source: "A", target: "B", weight: 4 }] },
      sourceNode: "A",
    });
    expect(r.distances["B"]).toBe(4);
  });

  it("acepta pesos de cero", () => {
    const r = executeDijkstra({
      graph: { nodes: nodes("A", "B", "C"), edges: [{ source: "A", target: "B", weight: 0 }, { source: "B", target: "C", weight: 3 }] },
      sourceNode: "A",
    });
    expect(r.distances).toEqual({ A: 0, B: 0, C: 3 });
  });

  it("los enlaces son bidireccionales", () => {
    const r = executeDijkstra({
      graph: { nodes: nodes("A", "B"), edges: [{ source: "B", target: "A", weight: 5 }] },
      sourceNode: "A",
    });
    expect(r.distances["B"]).toBe(5);
  });

  it("lanza error si el origen no existe", () => {
    expect(() => executeDijkstra({ graph: { nodes: nodes("A"), edges: [] }, sourceNode: "Z" })).toThrow();
  });

  it("lanza error con pesos negativos, NaN o infinitos", () => {
    for (const weight of [-1, Number.NaN, Infinity]) {
      expect(() =>
        executeDijkstra({
          graph: { nodes: nodes("A", "B"), edges: [{ source: "A", target: "B", weight }] },
          sourceNode: "A",
        })
      ).toThrow();
    }
  });

  it("lanza error si un enlace usa un nodo que no existe", () => {
    expect(() =>
      executeDijkstra({
        graph: { nodes: nodes("A"), edges: [{ source: "A", target: "Z", weight: 1 }] },
        sourceNode: "A",
      })
    ).toThrow();
  });

  it("recordSteps en false no guarda pasos pero da el mismo resultado", () => {
    const input = aDijkstraInput(cargarRuta("ruta-6-routers"), "R1");
    const con = executeDijkstra(input);
    const sin = executeDijkstra(input, { recordSteps: false });
    expect(sin.steps).toHaveLength(0);
    expect(sin.distances).toEqual(con.distances);
    expect(sin.predecessors).toEqual(con.predecessors);
    expect(sin.shortestPathEdges).toEqual(con.shortestPathEdges);
  });
});

describe("Dijkstra contra una referencia independiente (Floyd–Warshall)", () => {
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
        const graph: DijkstraGraph = {
          nodes: net.devices.map((d) => ({ id: d.id, label: d.label })),
          edges: net.links.map((l) => ({ source: l.source, target: l.target, weight: l.cost })),
        };
        const reference = floydWarshall(graph);
        const source = net.devices[seed % n].id;
        const r = executeDijkstra({ graph, sourceNode: source });
        for (const id of Object.keys(r.distances)) {
          expect(r.distances[id]).toBe(reference[source][id]);
          comparaciones++;
        }
      }
    }
    expect(comparaciones > 1000).toBe(true);
  });

  it("con costos de cero y con enlaces paralelos también coincide", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const edges = [];
      let x = seed * 7919;
      const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
      const ids = ["A", "B", "C", "D", "E", "F"];
      for (let i = 0; i < 12; i++) {
        const a = ids[Math.floor(rnd() * 6)];
        const b = ids[Math.floor(rnd() * 6)];
        edges.push({ source: a, target: b, weight: Math.floor(rnd() * 5) }); // incluye 0
      }
      const graph: DijkstraGraph = { nodes: nodes(...ids), edges };
      const reference = floydWarshall(graph);
      const r = executeDijkstra({ graph, sourceNode: "A" });
      for (const id of ids) {
        expect(r.distances[id]).toBe(reference["A"][id] === Infinity ? null : reference["A"][id]);
      }
    }
  });
});

describe("Dijkstra: rendimiento razonable", () => {
  it("resuelve una red de 2000 routers y 8000 enlaces en menos de 2 segundos", () => {
    const net = generateRandomNetwork({ switches: 2000, kind: "router", extraLinks: 6000, seed: 1 });
    const graph: DijkstraGraph = {
      nodes: net.devices.map((d) => ({ id: d.id, label: d.label })),
      edges: net.links.map((l) => ({ source: l.source, target: l.target, weight: l.cost })),
    };
    const inicio = Date.now();
    const r = executeDijkstra({ graph, sourceNode: "R1" }, { recordSteps: false });
    expect(Date.now() - inicio < 2000).toBe(true);
    expect(r.reachableCount).toBe(2000);
  });
});
