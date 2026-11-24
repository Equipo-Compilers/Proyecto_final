import { describe, it, expect } from "vitest";

import { createEmptyNetwork } from "../core/model/network";
import {
  addDevice,
  addLink,
  moveDevice,
  nextId,
  removeDevice,
  removeLink,
  renameDevice,
  updateLinkCost,
  validateCost,
} from "../core/model/networkOps";

function sample() {
  let n = createEmptyNetwork();
  for (let i = 0; i < 3; i++) n = addDevice(n).network;
  n = addLink(n, "S1", "S2", 4).network;
  n = addLink(n, "S2", "S3", 7).network;
  return n;
}

describe("nextId", () => {
  it("da el primer id libre", () => {
    expect(nextId("S", [])).toBe("S1");
    expect(nextId("S", ["S1", "S2"])).toBe("S3");
    expect(nextId("S", ["S1", "S3"])).toBe("S2");
  });
});

describe("validateCost", () => {
  it("acepta números positivos", () => {
    expect(validateCost(1)).toBeNull();
    expect(validateCost(0.5)).toBeNull();
  });
  it("rechaza 0, negativos, NaN e Infinity", () => {
    for (const bad of [0, -3, Number.NaN, Infinity]) {
      expect(validateCost(bad) === null).toBe(false);
    }
  });
});

describe("addDevice", () => {
  it("crea switches con ids consecutivos y nombre igual al id", () => {
    const a = addDevice(createEmptyNetwork());
    const b = addDevice(a.network);
    expect(a.createdId).toBe("S1");
    expect(b.createdId).toBe("S2");
    expect(b.network.devices[1].label).toBe("S2");
    expect(b.network.devices[1].status).toBe("up");
  });

  it("usa prefijo según el tipo de dispositivo", () => {
    const r = addDevice(createEmptyNetwork(), { kind: "router" });
    expect(r.createdId).toBe("R1");
  });

  it("respeta el nombre y la posición recibidos", () => {
    const r = addDevice(createEmptyNetwork(), {
      label: "  Núcleo ",
      position: { x: 5, y: 9 },
    });
    expect(r.network.devices[0].label).toBe("Núcleo");
    expect(r.network.devices[0].position).toEqual({ x: 5, y: 9 });
  });

  it("rechaza posiciones inválidas", () => {
    const r = addDevice(createEmptyNetwork(), { position: { x: Number.NaN, y: 0 } });
    expect(r.error === null).toBe(false);
    expect(r.network.devices).toHaveLength(0);
  });

  it("reutiliza un id libre después de borrar", () => {
    let n = sample();
    n = removeDevice(n, "S2").network;
    expect(addDevice(n).createdId).toBe("S2");
  });

  it("no modifica la red original", () => {
    const original = createEmptyNetwork();
    addDevice(original);
    expect(original.devices).toHaveLength(0);
  });
});

describe("removeDevice", () => {
  it("borra el dispositivo y todos sus enlaces", () => {
    const r = removeDevice(sample(), "S2");
    expect(r.error).toBeNull();
    expect(r.network.devices).toHaveLength(2);
    expect(r.network.links).toHaveLength(0);
  });

  it("avisa si no existe", () => {
    expect(removeDevice(sample(), "X").error === null).toBe(false);
  });
});

describe("moveDevice y renameDevice", () => {
  it("mueve un dispositivo", () => {
    const r = moveDevice(sample(), "S1", { x: 10, y: 20 });
    expect(r.network.devices[0].position).toEqual({ x: 10, y: 20 });
  });

  it("rechaza mover a una posición inválida o un id inexistente", () => {
    expect(moveDevice(sample(), "S1", { x: Infinity, y: 0 }).error === null).toBe(false);
    expect(moveDevice(sample(), "X", { x: 1, y: 1 }).error === null).toBe(false);
  });

  it("renombra y rechaza nombres vacíos", () => {
    expect(renameDevice(sample(), "S1", " Core ").network.devices[0].label).toBe("Core");
    expect(renameDevice(sample(), "S1", "   ").error === null).toBe(false);
  });
});

describe("addLink", () => {
  it("crea enlaces con ids e1, e2...", () => {
    const n = sample();
    expect(n.links.map((l) => l.id)).toEqual(["e1", "e2"]);
    expect(n.links[0]).toEqual({ id: "e1", source: "S1", target: "S2", cost: 4, status: "up" });
  });

  it("rechaza enlaces de un dispositivo consigo mismo", () => {
    expect(addLink(sample(), "S1", "S1", 3).error === null).toBe(false);
  });

  it("rechaza extremos que no existen", () => {
    expect(addLink(sample(), "S1", "Z", 3).error === null).toBe(false);
  });

  it("rechaza enlaces duplicados en cualquier dirección", () => {
    expect(addLink(sample(), "S1", "S2", 3).error === null).toBe(false);
    expect(addLink(sample(), "S2", "S1", 3).error === null).toBe(false);
  });

  it("rechaza costos inválidos", () => {
    for (const bad of [0, -1, Number.NaN]) {
      expect(addLink(sample(), "S1", "S3", bad).error === null).toBe(false);
    }
  });

  it("cuando falla devuelve la misma red", () => {
    const n = sample();
    expect(addLink(n, "S1", "S1", 3).network).toBe(n);
  });
});

describe("removeLink y updateLinkCost", () => {
  it("borra un enlace", () => {
    expect(removeLink(sample(), "e1").network.links.map((l) => l.id)).toEqual(["e2"]);
    expect(removeLink(sample(), "zzz").error === null).toBe(false);
  });

  it("cambia el costo y valida el nuevo valor", () => {
    expect(updateLinkCost(sample(), "e1", 9).network.links[0].cost).toBe(9);
    expect(updateLinkCost(sample(), "e1", 0).error === null).toBe(false);
    expect(updateLinkCost(sample(), "zzz", 5).error === null).toBe(false);
  });
});
