import { describe, it, expect } from "vitest";

import { executeKruskal } from "../core/algorithms/kruskal";
import { executePrim } from "../core/algorithms/prim";
import { UnionFind } from "../core/utils/unionFind";
import {
  createKruskalSimulation,
  nextKruskalStep,
  previousKruskalStep,
  resetKruskalSimulation,
} from "../core/simulation/kruskalSimulation";
import type { KruskalInput } from "../core/model/kruskalModel";
import {
  EJEMPLOS,
  ESPERADOS,
  aKruskalInput,
  aPrimInput,
} from "./helpers/loadExample";

const REDES = Object.keys(EJEMPLOS);
const REDES_CONECTADAS = REDES.filter((n) => ESPERADOS[n].estaConectada);

function red(
  nodos: string[],
  enlaces: [string, string, number][]
): KruskalInput {
  return {
    graph: {
      nodes: nodos.map((id) => ({ id, label: id })),
      edges: enlaces.map(([source, target, weight]) => ({
        source,
        target,
        weight,
      })),
    },
  };
}

describe("Kruskal en las redes de ejemplo", () => {
  for (const nombre of REDES) {
    const ejemplo = EJEMPLOS[nombre];
    const esperado = ESPERADOS[nombre];
    const input = aKruskalInput(ejemplo);

    describe(nombre, () => {
      it("calcula el costo total esperado", () => {
        expect(executeKruskal(input).totalCost).toBe(esperado.costoTotal);
      });

      it("elige la cantidad esperada de enlaces", () => {
        expect(executeKruskal(input).mstEdges).toHaveLength(
          esperado.enlacesEnArbol
        );
      });

      it("indica correctamente si la red está conectada", () => {
        const r = executeKruskal(input);
        expect(r.isConnected).toBe(esperado.estaConectada);
        expect(r.componentCount).toBe(esperado.componentesConectados);
      });

      it("aceptados + descartados = todos los enlaces", () => {
        const r = executeKruskal(input);
        expect(r.mstEdges.length + r.discardedEdges.length).toBe(
          ejemplo.links.length
        );
      });

      it("registra un paso por enlace y el último trae el costo total", () => {
        const r = executeKruskal(input);
        expect(r.steps).toHaveLength(ejemplo.links.length);
        expect(r.steps[r.steps.length - 1].totalCost).toBe(r.totalCost);
      });

      it("el resultado no tiene ciclos", () => {
        const r = executeKruskal(input);
        const uf = new UnionFind(ejemplo.devices.map((d) => d.id));
        for (const e of r.mstEdges) {
          expect(uf.union(e.source, e.target)).toBe(true);
        }
      });

      it("conecta todos los nodos que se pueden conectar", () => {
        const r = executeKruskal(input);
        const uf = new UnionFind(ejemplo.devices.map((d) => d.id));
        r.mstEdges.forEach((e) => uf.union(e.source, e.target));
        const grupos = new Set(ejemplo.devices.map((d) => uf.find(d.id)));
        expect(grupos.size).toBe(esperado.componentesConectados);
      });

      it("no modifica la red recibida", () => {
        const antes = JSON.stringify(input);
        executeKruskal(input);
        expect(JSON.stringify(input)).toBe(antes);
      });

      if (esperado.idsEnlacesSeleccionados) {
        it("elige exactamente los enlaces esperados", () => {
          const idPorPar = new Map(
            ejemplo.links.map((l) => [`${l.source}|${l.target}`, l.id])
          );
          const ids = executeKruskal(input)
            .mstEdges.map((e) => idPorPar.get(`${e.source}|${e.target}`)!)
            .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
          expect(ids).toEqual(esperado.idsEnlacesSeleccionados);
        });
      }
    });
  }
});

describe("Kruskal coincide con Prim", () => {
  for (const nombre of REDES_CONECTADAS) {
    it(`mismo costo total y mismo número de enlaces en ${nombre}`, () => {
      const ejemplo = EJEMPLOS[nombre];
      const k = executeKruskal(aKruskalInput(ejemplo));
      const p = executePrim(aPrimInput(ejemplo));
      expect(k.totalCost).toBe(p.totalCost);
      expect(k.mstEdges).toHaveLength(p.mstEdges.length);
    });
  }

  it("en una red desconectada Prim solo cubre la isla del nodo inicial", () => {
    const ejemplo = EJEMPLOS["red-desconectada"];
    const k = executeKruskal(aKruskalInput(ejemplo));
    const p = executePrim(aPrimInput(ejemplo));
    expect(k.totalCost).toBe(9);
    expect(p.totalCost).toBe(6);
  });
});

describe("Kruskal: ejemplo resuelto a mano (5 switches)", () => {
  const r = executeKruskal(aKruskalInput(EJEMPLOS["red-5-switches"]));

  it("costo total 13", () => {
    expect(r.totalCost).toBe(13);
  });

  it("decide en el orden esperado", () => {
    const decisiones = r.steps.map(
      (s) =>
        `${s.evaluatedEdge.source}-${s.evaluatedEdge.target}:${s.decision}`
    );
    expect(decisiones).toEqual([
      "A-B:accepted",
      "B-C:accepted",
      "A-C:discarded",
      "C-D:accepted",
      "B-D:discarded",
      "D-E:accepted",
      "C-E:discarded",
    ]);
  });

  it("el costo acumulado crece solo cuando se acepta un enlace", () => {
    expect(r.steps.map((s) => s.totalCost)).toEqual([1, 3, 3, 7, 7, 13, 13]);
  });

  it("explica el motivo de cada descarte", () => {
    expect(r.steps[2].explanation).toContain("ciclo");
    expect(r.steps[6].explanation).toContain("completo");
  });
});

describe("Kruskal: casos borde", () => {
  it("red vacía", () => {
    const r = executeKruskal(red([], []));
    expect(r.totalCost).toBe(0);
    expect(r.steps).toHaveLength(0);
    expect(r.mstEdges).toHaveLength(0);
  });

  it("un solo switch sin enlaces", () => {
    const r = executeKruskal(red(["A"], []));
    expect(r.isConnected).toBe(true);
    expect(r.componentCount).toBe(1);
    expect(r.totalCost).toBe(0);
  });

  it("varios switches sin ningún enlace: cada uno es una isla", () => {
    const r = executeKruskal(red(["A", "B", "C"], []));
    expect(r.isConnected).toBe(false);
    expect(r.componentCount).toBe(3);
  });

  it("enlaces paralelos: se queda con el más barato", () => {
    const r = executeKruskal(red(["A", "B"], [["A", "B", 9], ["A", "B", 2]]));
    expect(r.totalCost).toBe(2);
    expect(r.discardedEdges).toHaveLength(1);
    expect(r.discardedEdges[0].weight).toBe(9);
  });

  it("un enlace de un switch consigo mismo se descarta", () => {
    const r = executeKruskal(red(["A"], [["A", "A", 1]]));
    expect(r.discardedEdges).toHaveLength(1);
    expect(r.steps[0].explanation).toContain("consigo mismo");
  });

  it("costos iguales: el resultado es siempre el mismo", () => {
    const input = aKruskalInput(EJEMPLOS["red-con-empates"]);
    const primera = JSON.stringify(executeKruskal(input).mstEdges);
    for (let i = 0; i < 20; i++) {
      expect(JSON.stringify(executeKruskal(input).mstEdges)).toBe(primera);
    }
  });

  it("acepta pesos de cero", () => {
    const r = executeKruskal(red(["A", "B"], [["A", "B", 0]]));
    expect(r.mstEdges).toHaveLength(1);
    expect(r.totalCost).toBe(0);
  });

  it("lanza error si un enlace usa un nodo que no existe", () => {
    expect(() => executeKruskal(red(["A"], [["A", "Z", 1]]))).toThrow();
  });

  it("lanza error si un peso no es un número válido", () => {
    expect(() =>
      executeKruskal(red(["A", "B"], [["A", "B", Number.NaN]]))
    ).toThrow();
  });

  it("recordSteps en false no guarda pasos pero da el mismo resultado", () => {
    const input = aKruskalInput(EJEMPLOS["red-12-switches"]);
    const con = executeKruskal(input);
    const sin = executeKruskal(input, { recordSteps: false });
    expect(sin.steps).toHaveLength(0);
    expect(sin.totalCost).toBe(con.totalCost);
    expect(sin.mstEdges).toEqual(con.mstEdges);
    expect(sin.discardedEdges).toEqual(con.discardedEdges);
  });
});

describe("Simulación paso a paso de Kruskal", () => {
  const input = aKruskalInput(EJEMPLOS["red-5-switches"]);

  it("empieza antes del primer paso", () => {
    const s = createKruskalSimulation(input);
    expect(s.currentStepIndex).toBe(-1);
    expect(s.currentStep).toBeNull();
    expect(s.isFinished).toBe(false);
  });

  it("avanza un paso a la vez", () => {
    const s = nextKruskalStep(createKruskalSimulation(input));
    expect(s.currentStepIndex).toBe(0);
    expect(s.currentStep?.stepNumber).toBe(1);
  });

  it("termina en el último paso y no se pasa", () => {
    let s = createKruskalSimulation(input);
    const total = s.result.steps.length;
    for (let i = 0; i < total; i++) s = nextKruskalStep(s);
    expect(s.isFinished).toBe(true);
    expect(s.currentStepIndex).toBe(total - 1);
    s = nextKruskalStep(s); // un clic de más
    expect(s.currentStepIndex).toBe(total - 1);
    expect(s.isFinished).toBe(true);
  });

  it("retrocede un paso y vuelve a no estar terminada", () => {
    let s = createKruskalSimulation(input);
    s = nextKruskalStep(nextKruskalStep(nextKruskalStep(s)));
    s = previousKruskalStep(s);
    expect(s.currentStepIndex).toBe(1);
    expect(s.isFinished).toBe(false);
  });

  it("retroceder desde el primer paso regresa al inicio", () => {
    let s = nextKruskalStep(createKruskalSimulation(input));
    s = previousKruskalStep(s);
    expect(s.currentStepIndex).toBe(-1);
    expect(s.currentStep).toBeNull();
  });

  it("reiniciar regresa al inicio", () => {
    let s = createKruskalSimulation(input);
    s = nextKruskalStep(nextKruskalStep(s));
    s = resetKruskalSimulation(s);
    expect(s.currentStepIndex).toBe(-1);
    expect(s.isFinished).toBe(false);
  });

  it("una red sin enlaces ya nace terminada", () => {
    const s = createKruskalSimulation(red(["A", "B"], []));
    expect(s.isFinished).toBe(true);
  });
});