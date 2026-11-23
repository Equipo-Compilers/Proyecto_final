import { describe, it, expect } from "vitest";

import {
  STORAGE_KEY,
  clearSavedNetwork,
  loadNetwork,
  saveNetwork,
  type SimpleStorage,
} from "../core/io/storage";
import { EXAMPLE_NETWORKS } from "../data/examples";

function fakeStorage(): SimpleStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

const net = EXAMPLE_NETWORKS[0].network;

describe("almacenamiento local", () => {
  it("guarda y recupera la red", () => {
    const s = fakeStorage();
    expect(saveNetwork(net, s)).toBe(true);
    expect(loadNetwork(s)).toEqual(net);
  });

  it("devuelve null si no hay nada guardado", () => {
    expect(loadNetwork(fakeStorage())).toBeNull();
  });

  it("devuelve null si lo guardado está dañado", () => {
    const s = fakeStorage();
    s.setItem(STORAGE_KEY, "{{{ no es json");
    expect(loadNetwork(s)).toBeNull();
    s.setItem(STORAGE_KEY, JSON.stringify({ devices: 5 }));
    expect(loadNetwork(s)).toBeNull();
  });

  it("no revienta si el almacenamiento falla o no existe", () => {
    const roto: SimpleStorage = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("cuota llena");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(saveNetwork(net, roto)).toBe(false);
    expect(loadNetwork(roto)).toBeNull();
    clearSavedNetwork(roto);
    expect(saveNetwork(net, null)).toBe(false);
    expect(loadNetwork(null)).toBeNull();
  });

  it("borra la red guardada", () => {
    const s = fakeStorage();
    saveNetwork(net, s);
    clearSavedNetwork(s);
    expect(loadNetwork(s)).toBeNull();
  });
});
