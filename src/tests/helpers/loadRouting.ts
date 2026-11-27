import ruta6 from "../../data/examples/ruta-6-routers.json";
import rutaEmpates from "../../data/examples/ruta-con-empates.json";
import rutaDesconectada from "../../data/examples/ruta-desconectada.json";
import esperadosJson from "../../data/examples/expected-routing.json";

import type { DijkstraInput } from "../../core/model/dijkstraModel";
import type { RedEjemplo } from "./loadExample";

export interface RutaEsperada {
  descripcion: string;
  origen: string;
  distancias: Record<string, number | null>;
  predecesores: Record<string, string | null>;
  idsEnlacesDelArbol: string[];
  costoDelArbol: number;
  alcanzables: number;
  totalRouters: number;
}

const REDES: Record<string, RedEjemplo> = {
  "ruta-6-routers": ruta6,
  "ruta-con-empates": rutaEmpates,
  "ruta-desconectada": rutaDesconectada,
};

export const ESPERADOS_RUTAS = esperadosJson as unknown as Record<string, RutaEsperada>;

export function cargarRuta(nombre: string): RedEjemplo {
  const red = REDES[nombre];
  if (!red) throw new Error(`No existe la red de rutas ${nombre}`);
  return red;
}

export function aDijkstraInput(red: RedEjemplo, origen: string): DijkstraInput {
  return {
    graph: {
      nodes: red.devices.map((d) => ({ id: d.id, label: d.label })),
      edges: red.links.map((l) => ({ source: l.source, target: l.target, weight: l.cost })),
    },
    sourceNode: origen,
  };
}
