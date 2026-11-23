import red5 from "../../data/examples/red-5-switches.json";
import red12 from "../../data/examples/red-12-switches.json";
import redEmpates from "../../data/examples/red-con-empates.json";
import redDesconectada from "../../data/examples/red-desconectada.json";
import esperadosJson from "../../data/examples/expected.json";

import type { KruskalInput } from "../../core/model/kruskalModel";
import type { PrimInput } from "../../core/model/primModel";

export interface RedEjemplo {
  name: string;
  devices: { id: string; label: string }[];
  links: { id: string; source: string; target: string; cost: number }[];
}

export interface ResultadoEsperado {
  descripcion: string;
  totalSwitches: number;
  totalEnlaces: number;
  componentesConectados: number;
  estaConectada: boolean;
  enlacesEnArbol: number;
  costoTotal: number;
  idsEnlacesSeleccionados: string[] | null;
}

export const EJEMPLOS: Record<string, RedEjemplo> = {
  "red-5-switches": red5,
  "red-12-switches": red12,
  "red-con-empates": redEmpates,
  "red-desconectada": redDesconectada,
};

export const ESPERADOS = esperadosJson as unknown as Record<
  string,
  ResultadoEsperado
>;

export function aKruskalInput(red: RedEjemplo): KruskalInput {
  return {
    graph: {
      nodes: red.devices.map((d) => ({ id: d.id, label: d.label })),
      edges: red.links.map((l) => ({
        source: l.source,
        target: l.target,
        weight: l.cost,
      })),
    },
  };
}

export function aPrimInput(red: RedEjemplo): PrimInput {
  return { graph: aKruskalInput(red).graph, startNode: red.devices[0].id };
}