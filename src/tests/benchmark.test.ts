import { describe, it, expect } from "vitest";

import { benchmarkNetwork, runBenchmark } from "../core/benchmark/benchmark";
import { generateRandomNetwork } from "../core/generator/randomNetwork";
import { EXAMPLE_NETWORKS } from "../data/examples";

function fakeClock() {
  let t = 0;
  return () => t++;
}

describe("benchmarkNetwork", () => {
  const net = EXAMPLE_NETWORKS[1].network;

  it("devuelve una fila por algoritmo con sus datos", () => {
    const rows = benchmarkNetwork(net, 3, undefined, fakeClock());
    expect(rows.map((r) => r.algorithmId)).toEqual(["prim", "kruskal"]);
    for (const r of rows) {
      expect(r.switches).toBe(12);
      expect(r.links).toBe(net.links.length);
      expect(r.samples).toBe(3);
      expect(Number.isFinite(r.averageMs) && r.averageMs >= 0).toBe(true);
      expect(r.minMs <= r.averageMs).toBe(true);
    }
  });

  it("Prim y Kruskal obtienen el mismo costo y número de enlaces", () => {
    const [prim, kruskal] = benchmarkNetwork(net, 2, undefined, fakeClock());
    expect(prim.totalCost).toBe(kruskal.totalCost);
    expect(prim.selectedLinks).toBe(kruskal.selectedLinks);
    expect(kruskal.totalCost).toBe(124);
  });

  it("puede medir solo un algoritmo", () => {
    const rows = benchmarkNetwork(net, 2, ["kruskal"], fakeClock());
    expect(rows).toHaveLength(1);
    expect(rows[0].algorithmId).toBe("kruskal");
  });

  it("con el reloj real también da tiempos válidos", () => {
    const rows = benchmarkNetwork(net, 3);
    for (const r of rows) expect(Number.isFinite(r.averageMs) && r.averageMs >= 0).toBe(true);
  });

  it("al menos una muestra aunque pidan 0", () => {
    expect(benchmarkNetwork(net, 0, undefined, fakeClock())[0].samples).toBe(1);
  });

  it("acepta un switch inicial para Prim", () => {
    const rows = benchmarkNetwork(net, 2, undefined, fakeClock(), "S5");
    expect(rows[0].totalCost).toBe(124);
  });
});

describe("runBenchmark", () => {
  it("hace una fila por algoritmo y tamaño, ordenadas por tamaño", () => {
    const rows = runBenchmark({ sizes: [10, 20], repetitions: 2 }, undefined, fakeClock());
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.switches)).toEqual([10, 10, 20, 20]);
  });

  it("usa redes con la cantidad de enlaces esperada", () => {
    const rows = runBenchmark({ sizes: [10], repetitions: 1 }, undefined, fakeClock());
    const expected = generateRandomNetwork({ switches: 10, extraLinks: 30, seed: 2036 });
    expect(rows[0].links).toBe(expected.links.length);
  });

  it("el costo es el mismo en cada ejecución (es determinista)", () => {
    const a = runBenchmark({ sizes: [25], repetitions: 1 }, undefined, fakeClock());
    const b = runBenchmark({ sizes: [25], repetitions: 1 }, undefined, fakeClock());
    expect(a.map((r) => r.totalCost)).toEqual(b.map((r) => r.totalCost));
  });

  it("Prim y Kruskal coinciden en costo en todos los tamaños", () => {
    const rows = runBenchmark({ sizes: [10, 30, 60], repetitions: 1 }, undefined, fakeClock());
    for (let i = 0; i < rows.length; i += 2) {
      expect(rows[i].totalCost).toBe(rows[i + 1].totalCost);
    }
  });

  it("avisa el progreso", () => {
    const calls: [number, number][] = [];
    runBenchmark({ sizes: [5, 6, 7], repetitions: 1 }, (d, t) => calls.push([d, t]), fakeClock());
    expect(calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});
