import type { Network } from "../../core/model/network";
import { parseNetworkObject } from "../../core/io/networkJson";

import red5 from "./red-5-switches.json";
import red12 from "./red-12-switches.json";
import redEmpates from "./red-con-empates.json";
import redDesconectada from "./red-desconectada.json";

export interface ExampleNetwork {
  id: string;
  label: string;
  network: Network;
}

function load(id: string, label: string, raw: unknown): ExampleNetwork {
  const parsed = parseNetworkObject(raw);
  if (!parsed.ok) {
    throw new Error(`El ejemplo «${id}» no es válido: ${parsed.errors.join("; ")}`);
  }
  return { id, label, network: parsed.network };
}

export const EXAMPLE_NETWORKS: ExampleNetwork[] = [
  load("red-5-switches", "5 switches con ciclos (resuelta a mano)", red5),
  load("red-12-switches", "12 switches en anillo", red12),
  load("red-con-empates", "6 switches con costos repetidos", redEmpates),
  load("red-desconectada", "Red desconectada (dos islas)", redDesconectada),
];
